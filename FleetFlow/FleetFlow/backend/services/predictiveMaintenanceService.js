const Maintenance = require('../models/Maintenance');
const Alert = require('../models/Alert');
const FuelRecord = require('../models/FuelRecord');
const Voyage = require('../models/Voyage');

// Explicitly a deterministic, rules-based "Predictive / Estimated" risk score —
// NOT a trained ML model. Every factor below is a concrete, explainable rule
// against real data, and the output always includes WHY the score landed
// where it did (Section 14: "Show contributing factors").

const RISK_LEVELS = [
  { min: 80, label: 'CRITICAL' },
  { min: 60, label: 'HIGH' },
  { min: 35, label: 'MEDIUM' },
  { min: 0, label: 'LOW' },
];

function levelFor(score) {
  return (RISK_LEVELS.find((l) => score >= l.min) || RISK_LEVELS[RISK_LEVELS.length - 1]).label;
}

// Computes maintenance risk for a single vessel given its supporting records
// (already fetched by the caller — see computeFleetMaintenanceRisk for the
// batched version used by lists, which avoids N+1 queries).
function computeVesselMaintenanceRisk(vessel, { maintenanceTasks, alerts, fuelRecords, voyages }) {
  const factors = [];
  let score = 0;

  const tasks = maintenanceTasks.filter((t) => String(t.vessel) === String(vessel._id));
  const overdueTasks = tasks.filter((t) => t.status === 'Overdue');
  const criticalPending = tasks.filter((t) => t.priority === 'Critical' && t.status !== 'Completed');

  if (overdueTasks.length > 0) {
    score += 35;
    factors.push(`${overdueTasks.length} overdue maintenance task${overdueTasks.length > 1 ? 's' : ''}`);
  }
  if (criticalPending.length > 0) {
    score += 20;
    factors.push(`${criticalPending.length} critical-priority task${criticalPending.length > 1 ? 's' : ''} pending`);
  }

  // Days since last completed maintenance — a long gap is itself a risk signal.
  const completed = tasks.filter((t) => t.status === 'Completed' && t.completionDate).sort((a, b) => new Date(b.completionDate) - new Date(a.completionDate));
  if (completed.length > 0) {
    const daysSince = Math.floor((Date.now() - new Date(completed[0].completionDate)) / (1000 * 60 * 60 * 24));
    if (daysSince > 180) {
      score += 20;
      factors.push(`${daysSince} days since last completed maintenance`);
    } else if (daysSince > 90) {
      score += 10;
      factors.push(`${daysSince} days since last completed maintenance`);
    }
  } else if (tasks.length === 0) {
    score += 10;
    factors.push('No maintenance history on record for this vessel');
  }

  const vesselAlerts = alerts.filter((a) => String(a.vessel) === String(vessel._id) && a.status !== 'Resolved');
  if (vesselAlerts.length >= 3) {
    score += 20;
    factors.push(`${vesselAlerts.length} recent operational alerts`);
  } else if (vesselAlerts.length > 0) {
    score += 10;
    factors.push(`${vesselAlerts.length} recent operational alert${vesselAlerts.length > 1 ? 's' : ''}`);
  }

  // Fuel efficiency deterioration — engine strain often shows up here first.
  const vesselFuel = fuelRecords
    .filter((r) => String(r.vessel) === String(vessel._id))
    .sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));
  if (vesselFuel.length >= 4) {
    const mid = Math.floor(vesselFuel.length / 2);
    const eff = (set) => {
      const consumed = set.reduce((s, r) => s + r.fuelConsumed, 0);
      const distance = set.reduce((s, r) => s + r.distanceTravelled, 0);
      return consumed > 0 ? distance / consumed : null;
    };
    const earlierEff = eff(vesselFuel.slice(0, mid));
    const laterEff = eff(vesselFuel.slice(mid));
    if (earlierEff && laterEff && laterEff < earlierEff * 0.92) {
      const pctDrop = Math.round((1 - laterEff / earlierEff) * 100);
      score += 15;
      factors.push(`Fuel efficiency decreased ${pctDrop}%`);
    }
  }

  // High voyage utilization — a vessel that's rarely idle gets less maintenance window.
  const vesselVoyages = voyages.filter((v) => String(v.vessel) === String(vessel._id));
  const activeOrRecent = vesselVoyages.filter((v) => !['Cancelled'].includes(v.status));
  if (activeOrRecent.length >= 4) {
    score += 10;
    factors.push('High voyage utilization — limited maintenance windows');
  }

  score = Math.max(0, Math.min(100, score));
  const level = levelFor(score);

  let recommendedAction;
  if (level === 'CRITICAL') recommendedAction = 'Schedule inspection immediately.';
  else if (level === 'HIGH') recommendedAction = 'Schedule inspection within 7 days.';
  else if (level === 'MEDIUM') recommendedAction = 'Schedule inspection within the next maintenance window.';
  else recommendedAction = 'No immediate action needed — continue routine monitoring.';

  return {
    vesselId: vessel._id,
    vesselName: vessel.name,
    score,
    level,
    factors: factors.length > 0 ? factors : ['No significant risk factors detected'],
    recommendedAction,
  };
}

// Batched version for the fleet-wide list — fetches each supporting
// collection once instead of once per vessel.
async function computeFleetMaintenanceRisk(vessels) {
  const vesselIds = vessels.map((v) => v._id);
  const [maintenanceTasks, alerts, fuelRecords, voyages] = await Promise.all([
    Maintenance.find({ vessel: { $in: vesselIds } }),
    Alert.find({ vessel: { $in: vesselIds } }),
    FuelRecord.find({ vessel: { $in: vesselIds } }),
    Voyage.find({ vessel: { $in: vesselIds } }),
  ]);

  return vessels
    .map((vessel) => computeVesselMaintenanceRisk(vessel, { maintenanceTasks, alerts, fuelRecords, voyages }))
    .sort((a, b) => b.score - a.score);
}

// Single-vessel lookup — fetches just that vessel's supporting records.
async function computeSingleVesselMaintenanceRisk(vessel) {
  const [maintenanceTasks, alerts, fuelRecords, voyages] = await Promise.all([
    Maintenance.find({ vessel: vessel._id }),
    Alert.find({ vessel: vessel._id }),
    FuelRecord.find({ vessel: vessel._id }),
    Voyage.find({ vessel: vessel._id }),
  ]);
  return computeVesselMaintenanceRisk(vessel, { maintenanceTasks, alerts, fuelRecords, voyages });
}

module.exports = {
  computeVesselMaintenanceRisk,
  computeFleetMaintenanceRisk,
  computeSingleVesselMaintenanceRisk,
};
