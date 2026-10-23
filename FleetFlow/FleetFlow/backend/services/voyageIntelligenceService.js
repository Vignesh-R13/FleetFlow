const Voyage = require('../models/Voyage');
const Alert = require('../models/Alert');
const Cargo = require('../models/Cargo');

// Delay risk is an "operational estimate" from concrete rules — NOT a
// scientifically validated prediction. Score is 0-100 (higher = more likely
// to be/become delayed).
function computeDelayRisk(voyage, { vesselHealthScore, openAlertCount }) {
  let score = 0;
  const reasons = [];

  if (voyage.status === 'Delayed') {
    score += 55;
    reasons.push('Voyage is already marked delayed');
  }

  const now = new Date();
  if (voyage.expectedArrival && new Date(voyage.expectedArrival) < now && !['Arrived', 'Completed', 'Cancelled'].includes(voyage.status)) {
    const daysOverdue = Math.ceil((now - new Date(voyage.expectedArrival)) / (1000 * 60 * 60 * 24));
    score += Math.min(30, daysOverdue * 6);
    reasons.push(`${daysOverdue} day${daysOverdue > 1 ? 's' : ''} past expected arrival`);
  }

  if (voyage.distance > 0 && !['Arrived', 'Completed', 'Cancelled', 'Scheduled'].includes(voyage.status)) {
    const totalMs = new Date(voyage.expectedArrival) - new Date(voyage.departureDate);
    const elapsedMs = now - new Date(voyage.departureDate);
    if (totalMs > 0 && elapsedMs > 0) {
      const timeProgress = Math.min(1, elapsedMs / totalMs);
      const distanceProgress = Math.min(1, voyage.distanceTravelled / voyage.distance);
      if (timeProgress > 0.5 && distanceProgress < timeProgress - 0.15) {
        score += 15;
        reasons.push('Distance covered is lagging behind the planned schedule');
      }
    }
  }

  if (typeof vesselHealthScore === 'number' && vesselHealthScore < 60) {
    score += 12;
    reasons.push('Vessel health score is below 60');
  }

  if (openAlertCount > 0) {
    score += Math.min(15, openAlertCount * 5);
    reasons.push(`${openAlertCount} open alert${openAlertCount > 1 ? 's' : ''} on this vessel`);
  }

  score = Math.max(0, Math.min(100, score));
  const risk = score >= 75 ? 'CRITICAL' : score >= 55 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW';

  return { probability: score, risk, reasons: reasons.length > 0 ? reasons : ['No significant delay signals detected'] };
}

// Fleet-wide voyage performance + per-voyage delay risk, in one pass.
// `vesselHealthByVessel` (optional) lets the caller pass in already-computed
// health scores from fleetHealthService instead of recomputing them here.
async function computeVoyageIntelligence(vesselHealthByVessel = {}) {
  const [voyages, alerts, cargoCounts] = await Promise.all([
    Voyage.find().populate('vessel', 'name status'),
    Alert.find({ status: { $ne: 'Resolved' } }),
    Cargo.aggregate([{ $group: { _id: '$voyage', count: { $sum: 1 } } }]),
  ]);

  const alertCountByVessel = {};
  for (const a of alerts) {
    if (!a.vessel) continue;
    const key = String(a.vessel);
    alertCountByVessel[key] = (alertCountByVessel[key] || 0) + 1;
  }
  const cargoCountByVoyage = Object.fromEntries(cargoCounts.map((c) => [String(c._id), c.count]));

  const statusCounts = {};
  let onTime = 0;
  let delayed = 0;
  let arrivedCount = 0;
  let totalDelayDays = 0;

  const voyageDetails = voyages.map((v) => {
    statusCounts[v.status] = (statusCounts[v.status] || 0) + 1;

    if (v.actualArrival) {
      arrivedCount++;
      const delayMs = new Date(v.actualArrival) - new Date(v.expectedArrival);
      const delayDays = delayMs / (1000 * 60 * 60 * 24);
      if (delayDays <= 0) onTime++;
      else {
        delayed++;
        totalDelayDays += delayDays;
      }
    }

    const vesselId = v.vessel?._id ? String(v.vessel._id) : null;
    const delayRisk = computeDelayRisk(v, {
      vesselHealthScore: vesselId ? vesselHealthByVessel[vesselId] : undefined,
      openAlertCount: vesselId ? alertCountByVessel[vesselId] || 0 : 0,
    });

    return {
      voyageId: v._id,
      vessel: v.vessel?.name || 'Unknown',
      vesselId,
      origin: v.origin,
      destination: v.destination,
      status: v.status,
      expectedArrival: v.expectedArrival,
      distance: v.distance,
      distanceTravelled: v.distanceTravelled,
      cargoCount: cargoCountByVoyage[String(v._id)] || 0,
      delayRisk,
    };
  });

  return {
    summary: {
      total: voyages.length,
      onTimePct: arrivedCount > 0 ? Math.round((onTime / arrivedCount) * 100) : null,
      delayedPct: arrivedCount > 0 ? Math.round((delayed / arrivedCount) * 100) : null,
      averageDelayDays: delayed > 0 ? +(totalDelayDays / delayed).toFixed(1) : 0,
      active: (statusCounts['In Transit'] || 0) + (statusCounts['Departed'] || 0) + (statusCounts['Loading'] || 0),
      completed: statusCounts['Completed'] || 0,
      statusCounts,
    },
    voyages: voyageDetails.sort((a, b) => b.delayRisk.probability - a.delayRisk.probability),
  };
}

module.exports = { computeDelayRisk, computeVoyageIntelligence };
