const Vessel = require('../models/Vessel');
const Voyage = require('../models/Voyage');
const Alert = require('../models/Alert');
const FuelRecord = require('../models/FuelRecord');
const asyncHandler = require('../utils/asyncHandler');
const { computeFleetHealth } = require('../services/fleetHealthService');
const { computeRiskIntelligence } = require('../services/riskScoringService');
const { computeFleetMaintenanceRisk, computeSingleVesselMaintenanceRisk } = require('../services/predictiveMaintenanceService');
const { computeFuelIntelligence } = require('../services/fuelIntelligenceService');
const { computeVoyageIntelligence } = require('../services/voyageIntelligenceService');
const { computeFleetProfitability, computeVoyageProfitability } = require('../services/profitabilityService');

// GET /api/intelligence/fleet-health
const getFleetHealth = asyncHandler(async (req, res) => {
  const vessels = await Vessel.find();
  const health = await computeFleetHealth(vessels);
  res.json({ success: true, data: health });
});

// GET /api/intelligence/risks
const getRisks = asyncHandler(async (req, res) => {
  const vessels = await Vessel.find();
  const risks = await computeRiskIntelligence(vessels);
  res.json({ success: true, data: risks });
});

// GET /api/intelligence/command-center
// Single combined payload for the Command Center KPI strip + panels, so the
// page doesn't have to fire 6+ separate requests on load. Composes the
// fleet-health and risk engines with existing analytics-style aggregation
// rather than duplicating calculation logic.
const getCommandCenterSummary = asyncHandler(async (req, res) => {
  const vessels = await Vessel.find();
  const vesselIds = vessels.map((v) => v._id);

  const [health, risks, activeVoyages, completedVoyages, totalVoyages, criticalAlerts, fuelAgg] = await Promise.all([
    computeFleetHealth(vessels),
    computeRiskIntelligence(vessels),
    Voyage.countDocuments({ status: { $in: ['Departed', 'In Transit', 'Loading'] } }),
    Voyage.countDocuments({ status: 'Completed' }),
    Voyage.countDocuments(),
    Alert.countDocuments({ severity: 'Critical', status: { $ne: 'Resolved' } }),
    FuelRecord.aggregate([
      { $match: { vessel: { $in: vesselIds } } },
      { $group: { _id: null, totalConsumed: { $sum: '$fuelConsumed' }, totalDistance: { $sum: '$distanceTravelled' } } },
    ]),
  ]);

  // On-time performance: of voyages that have actually arrived, what
  // fraction arrived at/before their expected arrival date.
  const arrivedVoyages = await Voyage.find({ actualArrival: { $ne: null } }).select('actualArrival expectedArrival');
  const onTimeCount = arrivedVoyages.filter((v) => new Date(v.actualArrival) <= new Date(v.expectedArrival)).length;
  const onTimePerformance = arrivedVoyages.length > 0 ? Math.round((onTimeCount / arrivedVoyages.length) * 100) : null;

  const activeVesselCount = vessels.filter((v) => v.status === 'Active').length;
  const fleetUtilization = vessels.length > 0 ? Math.round((activeVesselCount / vessels.length) * 100) : 0;

  const totalConsumed = fuelAgg[0]?.totalConsumed || 0;
  const totalDistance = fuelAgg[0]?.totalDistance || 0;
  // "t/100 NM" — tons of fuel per 100 nautical miles, a common fleet-level fuel intensity metric.
  const fuelEfficiency = totalDistance > 0 ? +((totalConsumed / totalDistance) * 100).toFixed(2) : null;

  const atRiskVesselCount = health.distribution.atRisk + health.distribution.critical;

  let fleetStatus = 'Operational';
  if (health.fleetAverage < 60 || criticalAlerts >= 3) fleetStatus = 'Critical';
  else if (health.fleetAverage < 80 || criticalAlerts > 0 || atRiskVesselCount > 0) fleetStatus = 'Attention Required';

  res.json({
    success: true,
    data: {
      kpis: {
        totalVessels: vessels.length,
        activeVoyages,
        fleetUtilization,
        fleetHealth: health.fleetAverage,
        atRiskVessels: atRiskVesselCount,
        criticalAlerts,
        fuelEfficiency,
        onTimePerformance,
      },
      fleetStatus,
      health,
      topRisks: risks.slice(0, 10),
      voyageSummary: { active: activeVoyages, completed: completedVoyages, total: totalVoyages },
    },
  });
});

// GET /api/intelligence/maintenance — fleet-wide predictive maintenance risk, ranked
const getMaintenanceRisk = asyncHandler(async (req, res) => {
  const vessels = await Vessel.find();
  const risk = await computeFleetMaintenanceRisk(vessels);
  res.json({ success: true, data: risk });
});

// GET /api/intelligence/maintenance/:vesselId — single-vessel detail with contributing factors
const getVesselMaintenanceRisk = asyncHandler(async (req, res) => {
  const vessel = await Vessel.findById(req.params.vesselId);
  if (!vessel) return res.status(404).json({ success: false, message: 'Vessel not found' });
  const risk = await computeSingleVesselMaintenanceRisk(vessel);
  res.json({ success: true, data: risk });
});

// GET /api/intelligence/fuel?fuelPricePerTon= — fleet fuel intelligence
const getFuelIntelligence = asyncHandler(async (req, res) => {
  const vessels = await Vessel.find();
  const priceOverride = req.query.fuelPricePerTon ? Number(req.query.fuelPricePerTon) : undefined;
  const intelligence = await computeFuelIntelligence(vessels, priceOverride);
  res.json({ success: true, data: intelligence });
});

// GET /api/intelligence/voyages — voyage performance + per-voyage delay risk
const getVoyageIntelligence = asyncHandler(async (req, res) => {
  const vessels = await Vessel.find();
  const health = await computeFleetHealth(vessels);
  const healthByVessel = Object.fromEntries(health.vessels.map((v) => [String(v.vesselId), v.overall]));
  const intelligence = await computeVoyageIntelligence(healthByVessel);
  res.json({ success: true, data: intelligence });
});

// GET /api/intelligence/profitability — fleet-wide profitability, ranked by profit.
// Accepts assumption overrides as query params (used by the Phase 4 What-If Simulator).
const getProfitability = asyncHandler(async (req, res) => {
  const assumptions = parseAssumptionOverrides(req.query);
  const profitability = await computeFleetProfitability(assumptions);
  res.json({ success: true, data: profitability });
});

// GET /api/intelligence/profitability/:voyageId — single voyage breakdown.
// Also the endpoint the What-If Simulator calls with override query params
// (distance, fuelConsumed, operatingCostMultiplier, plus any assumption) to
// compute a "simulated" scenario using the exact same engine as the real one.
const getVoyageProfitability = asyncHandler(async (req, res) => {
  const voyage = await Voyage.findById(req.params.voyageId).populate('vessel', 'name');
  if (!voyage) return res.status(404).json({ success: false, message: 'Voyage not found' });

  let actualFuelConsumed = req.query.fuelConsumed !== undefined ? Number(req.query.fuelConsumed) : undefined;
  if (actualFuelConsumed === undefined) {
    const fuelRecord = await FuelRecord.aggregate([
      { $match: { voyage: voyage._id } },
      { $group: { _id: null, totalConsumed: { $sum: '$fuelConsumed' } } },
    ]);
    actualFuelConsumed = fuelRecord[0]?.totalConsumed;
  }

  const assumptions = parseAssumptionOverrides(req.query);
  const overrides = {};
  if (req.query.distance !== undefined) overrides.distance = Number(req.query.distance);
  if (req.query.operatingCostMultiplier !== undefined) overrides.operatingCostMultiplier = Number(req.query.operatingCostMultiplier);

  const breakdown = computeVoyageProfitability(voyage, actualFuelConsumed, assumptions, overrides);

  res.json({
    success: true,
    data: { voyageId: voyage._id, vessel: voyage.vessel?.name, route: `${voyage.origin} → ${voyage.destination}`, ...breakdown },
  });
});

function parseAssumptionOverrides(query) {
  const keys = ['revenuePerNauticalMile', 'fuelPricePerTon', 'crewCostPerDay', 'portChargePerCall', 'maintenanceAllocationRate', 'otherCostRate'];
  const overrides = {};
  for (const key of keys) {
    if (query[key] !== undefined) overrides[key] = Number(query[key]);
  }
  return overrides;
}

module.exports = {
  getFleetHealth,
  getRisks,
  getCommandCenterSummary,
  getMaintenanceRisk,
  getVesselMaintenanceRisk,
  getFuelIntelligence,
  getVoyageIntelligence,
  getProfitability,
  getVoyageProfitability,
};
