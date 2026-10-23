const Maintenance = require('../models/Maintenance');
const FuelRecord = require('../models/FuelRecord');
const Alert = require('../models/Alert');
const Voyage = require('../models/Voyage');

// Configurable weights — the ONLY place these live, so nobody has to hunt
// through components to find a magic number. Sums to 1.0.
const HEALTH_WEIGHTS = {
  maintenance: 0.25,
  fuelEfficiency: 0.2,
  alerts: 0.25,
  voyageStatus: 0.15,
  operationalState: 0.15,
};

// This is a deterministic, rules-based scoring system — explicitly NOT a
// trained machine-learning model. Every sub-score below is a plain function
// of real FleetFlow data (maintenance records, fuel records, alerts, voyage
// status), so the same inputs always produce the same score.

// ---- Sub-score: Maintenance condition (0-100, higher = better) ----
function scoreMaintenance(vesselId, maintenanceTasks) {
  const tasks = maintenanceTasks.filter((t) => String(t.vessel) === String(vesselId));
  if (tasks.length === 0) return 85; // no history recorded yet — neutral-good default, not a guess at "perfect"

  const overdue = tasks.filter((t) => t.status === 'Overdue').length;
  const critical = tasks.filter((t) => t.priority === 'Critical' && t.status !== 'Completed').length;
  const high = tasks.filter((t) => t.priority === 'High' && t.status !== 'Completed').length;

  let score = 100;
  score -= overdue * 25;
  score -= critical * 20;
  score -= high * 10;
  return Math.max(0, Math.min(100, score));
}

// ---- Sub-score: Fuel efficiency relative to the fleet (0-100) ----
// Efficiency here = nautical miles travelled per ton of fuel consumed, from
// the vessel's recent fuel records, expressed relative to the fleet average
// so one vessel's absolute efficiency doesn't get unfairly punished by
// vessel-type differences (a bulk carrier and a container ship burn very
// differently).
function scoreFuelEfficiency(vesselId, fuelByVessel, fleetAvgEfficiency) {
  const record = fuelByVessel[String(vesselId)];
  if (!record || record.totalConsumed <= 0 || fleetAvgEfficiency <= 0) return 75; // insufficient data — neutral default

  const efficiency = record.totalDistance / record.totalConsumed;
  const ratio = efficiency / fleetAvgEfficiency;
  // 1.0 ratio (at fleet average) = 80. Above average scores higher, below scores lower.
  const score = 80 + (ratio - 1) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ---- Sub-score: Active alerts (0-100, more/worse alerts = lower) ----
function scoreAlerts(vesselId, alerts) {
  const vesselAlerts = alerts.filter((a) => String(a.vessel) === String(vesselId) && a.status !== 'Resolved');
  let score = 100;
  for (const a of vesselAlerts) {
    if (a.severity === 'Critical') score -= 25;
    else if (a.severity === 'Warning') score -= 12;
    else score -= 4;
  }
  return Math.max(0, Math.min(100, score));
}

// ---- Sub-score: Voyage condition (0-100) ----
function scoreVoyageStatus(vesselId, voyages) {
  const activeVoyages = voyages.filter(
    (v) => String(v.vessel) === String(vesselId) && !['Completed', 'Cancelled'].includes(v.status)
  );
  if (activeVoyages.length === 0) return 90; // not on a voyage right now — not a risk factor

  const delayed = activeVoyages.filter((v) => v.status === 'Delayed').length;
  if (delayed > 0) return 45;
  return 90;
}

// ---- Sub-score: Operational state (0-100) ----
function scoreOperationalState(vessel) {
  switch (vessel.status) {
    case 'Active':
      return 95;
    case 'Idle':
      return 80;
    case 'Maintenance':
      return 55;
    case 'Offline':
      return 20;
    default:
      return 70;
  }
}

// Computes health scores for every vessel in one pass — batches the
// supporting queries instead of running N+1 queries per vessel.
async function computeFleetHealth(vessels) {
  const vesselIds = vessels.map((v) => v._id);

  const [maintenanceTasks, alerts, voyages, fuelAgg] = await Promise.all([
    Maintenance.find({ vessel: { $in: vesselIds } }),
    Alert.find({ vessel: { $in: vesselIds }, status: { $ne: 'Resolved' } }),
    Voyage.find({ vessel: { $in: vesselIds } }),
    FuelRecord.aggregate([
      { $match: { vessel: { $in: vesselIds } } },
      { $group: { _id: '$vessel', totalConsumed: { $sum: '$fuelConsumed' }, totalDistance: { $sum: '$distanceTravelled' } } },
    ]),
  ]);

  const fuelByVessel = Object.fromEntries(fuelAgg.map((f) => [String(f._id), f]));
  const efficiencies = Object.values(fuelByVessel)
    .filter((f) => f.totalConsumed > 0)
    .map((f) => f.totalDistance / f.totalConsumed);
  const fleetAvgEfficiency = efficiencies.length > 0 ? efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length : 0;

  const results = vessels.map((vessel) => {
    const maintenanceScore = scoreMaintenance(vessel._id, maintenanceTasks);
    const fuelScore = scoreFuelEfficiency(vessel._id, fuelByVessel, fleetAvgEfficiency);
    const alertsScore = scoreAlerts(vessel._id, alerts);
    const voyageScore = scoreVoyageStatus(vessel._id, voyages);
    const operationalScore = scoreOperationalState(vessel);

    const overall = Math.round(
      maintenanceScore * HEALTH_WEIGHTS.maintenance +
        fuelScore * HEALTH_WEIGHTS.fuelEfficiency +
        alertsScore * HEALTH_WEIGHTS.alerts +
        voyageScore * HEALTH_WEIGHTS.voyageStatus +
        operationalScore * HEALTH_WEIGHTS.operationalState
    );

    return {
      vesselId: vessel._id,
      name: vessel.name,
      status: vessel.status,
      overall,
      breakdown: {
        maintenance: maintenanceScore,
        fuelEfficiency: fuelScore,
        alerts: alertsScore,
        voyageStatus: voyageScore,
        operationalState: operationalScore,
      },
      activeAlertCount: alerts.filter((a) => String(a.vessel) === String(vessel._id)).length,
    };
  });

  const fleetAverage = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.overall, 0) / results.length) : 0;

  const distribution = { healthy: 0, good: 0, attention: 0, atRisk: 0, critical: 0 };
  for (const r of results) {
    if (r.overall >= 90) distribution.healthy++;
    else if (r.overall >= 75) distribution.good++;
    else if (r.overall >= 60) distribution.attention++;
    else if (r.overall >= 40) distribution.atRisk++;
    else distribution.critical++;
  }

  return { fleetAverage, distribution, vessels: results, weights: HEALTH_WEIGHTS };
}

module.exports = {
  computeFleetHealth,
  HEALTH_WEIGHTS,
  // Exported for unit testing — each is a pure function over plain data,
  // no database access, so they can be tested without a live MongoDB.
  scoreMaintenance,
  scoreFuelEfficiency,
  scoreAlerts,
  scoreVoyageStatus,
  scoreOperationalState,
};
