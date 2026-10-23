const Maintenance = require('../models/Maintenance');
const Alert = require('../models/Alert');
const Voyage = require('../models/Voyage');
const FuelRecord = require('../models/FuelRecord');

// Deterministic operational risk estimate — NOT a trained ML prediction.
// Every risk item below is derived from a concrete rule against real data,
// with a recommended action attached. Scores are 0-100 (higher = riskier).

async function computeRiskIntelligence(vessels) {
  const vesselIds = vessels.map((v) => v._id);
  const vesselById = Object.fromEntries(vessels.map((v) => [String(v._id), v]));

  const [maintenanceTasks, alerts, voyages, recentFuel] = await Promise.all([
    Maintenance.find({ vessel: { $in: vesselIds }, status: { $ne: 'Cancelled' } }),
    Alert.find({ vessel: { $in: vesselIds }, status: { $ne: 'Resolved' } }),
    Voyage.find({ vessel: { $in: vesselIds } }).populate('vessel', 'name'),
    FuelRecord.find({ vessel: { $in: vesselIds } }).sort('-recordedAt').limit(500),
  ]);

  const risks = [];

  // ---- Rule 1: Overdue / critical-priority maintenance ----
  for (const task of maintenanceTasks) {
    const vessel = vesselById[String(task.vessel)];
    if (!vessel) continue;

    if (task.status === 'Overdue') {
      risks.push({
        vesselId: vessel._id,
        vesselName: vessel.name,
        type: 'Maintenance',
        title: `Overdue maintenance: ${task.title}`,
        score: task.priority === 'Critical' ? 95 : task.priority === 'High' ? 85 : 70,
        recommendedAction: 'Schedule inspection immediately.',
      });
    } else if (task.priority === 'Critical' && task.status !== 'Completed') {
      risks.push({
        vesselId: vessel._id,
        vesselName: vessel.name,
        type: 'Maintenance',
        title: `Critical-priority task pending: ${task.title}`,
        score: 80,
        recommendedAction: 'Prioritize this task in the current maintenance window.',
      });
    }
  }

  // ---- Rule 2: Fuel efficiency decline vs. the vessel's own recent baseline ----
  const byVessel = {};
  for (const r of recentFuel) {
    const key = String(r.vessel);
    if (!byVessel[key]) byVessel[key] = [];
    byVessel[key].push(r);
  }
  for (const [vesselId, records] of Object.entries(byVessel)) {
    const vessel = vesselById[vesselId];
    if (!vessel || records.length < 4) continue;

    const sorted = records.slice().sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));
    const midpoint = Math.floor(sorted.length / 2);
    const earlier = sorted.slice(0, midpoint);
    const later = sorted.slice(midpoint);

    const eff = (set) => {
      const consumed = set.reduce((s, r) => s + r.fuelConsumed, 0);
      const distance = set.reduce((s, r) => s + r.distanceTravelled, 0);
      return consumed > 0 ? distance / consumed : null;
    };

    const earlierEff = eff(earlier);
    const laterEff = eff(later);
    if (earlierEff && laterEff && laterEff < earlierEff * 0.92) {
      const pctDrop = Math.round((1 - laterEff / earlierEff) * 100);
      risks.push({
        vesselId: vessel._id,
        vesselName: vessel.name,
        type: 'Fuel',
        title: `Fuel efficiency declining (${pctDrop}% drop vs. recent baseline)`,
        score: Math.min(90, 50 + pctDrop * 2),
        recommendedAction: 'Investigate engine performance and route/speed patterns.',
      });
    }
  }

  // ---- Rule 3: Voyage delay probability ----
  for (const voyage of voyages) {
    if (!voyage.vessel || ['Completed', 'Cancelled', 'Arrived'].includes(voyage.status)) continue;

    if (voyage.status === 'Delayed') {
      risks.push({
        vesselId: voyage.vessel._id,
        vesselName: voyage.vessel.name,
        type: 'Voyage',
        title: `Voyage delayed: ${voyage.origin} → ${voyage.destination}`,
        score: 78,
        recommendedAction: 'Notify stakeholders and reassess ETA.',
        voyageId: voyage._id,
      });
    } else if (voyage.expectedArrival && new Date(voyage.expectedArrival) < new Date() && voyage.status !== 'Arrived') {
      risks.push({
        vesselId: voyage.vessel._id,
        vesselName: voyage.vessel.name,
        type: 'Voyage',
        title: `Voyage past expected arrival: ${voyage.origin} → ${voyage.destination}`,
        score: 63,
        recommendedAction: 'Confirm current position and update ETA.',
        voyageId: voyage._id,
      });
    }
  }

  // ---- Rule 4: Vessel offline ----
  for (const vessel of vessels) {
    if (vessel.status === 'Offline') {
      risks.push({
        vesselId: vessel._id,
        vesselName: vessel.name,
        type: 'Communication',
        title: 'Vessel offline — no recent position updates',
        score: 88,
        recommendedAction: 'Attempt to re-establish contact; verify last known position.',
      });
    }
  }

  // ---- Rule 5: Multiple unresolved alerts compounding on one vessel ----
  const alertsByVessel = {};
  for (const a of alerts) {
    const key = String(a.vessel);
    alertsByVessel[key] = (alertsByVessel[key] || 0) + 1;
  }
  for (const [vesselId, count] of Object.entries(alertsByVessel)) {
    const vessel = vesselById[vesselId];
    if (!vessel || count < 2) continue;
    risks.push({
      vesselId: vessel._id,
      vesselName: vessel.name,
      type: 'Compounding Alerts',
      title: `${count} unresolved alerts on this vessel`,
      score: Math.min(85, 45 + count * 10),
      recommendedAction: 'Review all open alerts for this vessel together — may indicate a systemic issue.',
    });
  }

  risks.sort((a, b) => b.score - a.score);

  return risks.slice(0, 30).map((r) => ({
    ...r,
    severity: r.score >= 75 ? 'Critical' : r.score >= 55 ? 'High' : r.score >= 35 ? 'Medium' : 'Low',
  }));
}

module.exports = { computeRiskIntelligence };
