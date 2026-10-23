const Voyage = require('../models/Voyage');
const FuelRecord = require('../models/FuelRecord');

// None of these numbers exist in the data model (no revenue, crew cost, or
// port charge fields anywhere) — every one is a configurable assumption.
// Centralized here, never hidden, and structured so Phase 4's What-If
// Simulator can override any of them per-request without touching this file.
const DEFAULT_ASSUMPTIONS = {
  revenuePerNauticalMile: 42, // USD — estimated freight revenue per NM
  fuelPricePerTon: 620, // USD
  crewCostPerDay: 3200, // USD — whole-crew daily cost
  portChargePerCall: 18000, // USD — flat per port call (origin + destination = 2 calls)
  maintenanceAllocationRate: 0.05, // fraction of revenue allocated to maintenance amortization
  otherCostRate: 0.04, // fraction of revenue for insurance/admin/misc
};

function voyageDurationDays(voyage) {
  const end = voyage.actualArrival || voyage.expectedArrival;
  const ms = new Date(end) - new Date(voyage.departureDate);
  return Math.max(1, ms / (1000 * 60 * 60 * 24));
}

// Computes one voyage's profitability breakdown. `actualFuelConsumed` is
// optional — pass it when known (from FuelRecord history) for a more
// accurate fuel cost than the voyage's planned fuelBudget. `overrides` lets
// the What-If Simulator adjust voyage-level inputs (distance, an operating
// cost multiplier applied to crew/port/maintenance/other) without touching
// the underlying voyage record.
function computeVoyageProfitability(voyage, actualFuelConsumed, assumptions = DEFAULT_ASSUMPTIONS, overrides = {}) {
  const a = { ...DEFAULT_ASSUMPTIONS, ...assumptions };
  const distance = overrides.distance != null ? overrides.distance : voyage.distance;
  const operatingCostMultiplier = overrides.operatingCostMultiplier != null ? overrides.operatingCostMultiplier : 1;

  const revenue = distance * a.revenuePerNauticalMile;
  const fuelTons = actualFuelConsumed != null && actualFuelConsumed > 0 ? actualFuelConsumed : voyage.fuelBudget || 0;
  const fuelCost = fuelTons * a.fuelPricePerTon;
  const crewCost = voyageDurationDays(voyage) * a.crewCostPerDay * operatingCostMultiplier;
  const portCharges = a.portChargePerCall * 2 * operatingCostMultiplier; // origin + destination
  const maintenanceAllocation = revenue * a.maintenanceAllocationRate * operatingCostMultiplier;
  const otherCosts = revenue * a.otherCostRate * operatingCostMultiplier;

  const totalCost = fuelCost + crewCost + portCharges + maintenanceAllocation + otherCosts;
  const profit = revenue - totalCost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    revenue: round(revenue),
    fuelCost: round(fuelCost),
    crewCost: round(crewCost),
    portCharges: round(portCharges),
    maintenanceAllocation: round(maintenanceAllocation),
    otherCosts: round(otherCosts),
    totalCost: round(totalCost),
    profit: round(profit),
    margin: round(margin, 1),
    assumptions: a,
    inputs: { distance, fuelTons: round(fuelTons, 1), operatingCostMultiplier },
  };
}

function round(n, decimals = 0) {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

// Fleet-wide profitability: computes every voyage and totals them, using
// real actual-fuel data where FuelRecord history exists for that voyage.
async function computeFleetProfitability(assumptions = DEFAULT_ASSUMPTIONS) {
  const voyages = await Voyage.find({ status: { $ne: 'Cancelled' } }).populate('vessel', 'name');
  const fuelByVoyage = await FuelRecord.aggregate([
    { $match: { voyage: { $ne: null } } },
    { $group: { _id: '$voyage', totalConsumed: { $sum: '$fuelConsumed' } } },
  ]);
  const fuelMap = Object.fromEntries(fuelByVoyage.map((f) => [String(f._id), f.totalConsumed]));

  const results = voyages.map((v) => {
    const breakdown = computeVoyageProfitability(v, fuelMap[String(v._id)], assumptions);
    return {
      voyageId: v._id,
      vessel: v.vessel?.name || 'Unknown',
      route: `${v.origin} → ${v.destination}`,
      status: v.status,
      ...breakdown,
    };
  });

  const totals = results.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      totalCost: acc.totalCost + r.totalCost,
      profit: acc.profit + r.profit,
      fuelCost: acc.fuelCost + r.fuelCost,
      crewCost: acc.crewCost + r.crewCost,
      portCharges: acc.portCharges + r.portCharges,
      maintenanceAllocation: acc.maintenanceAllocation + r.maintenanceAllocation,
      otherCosts: acc.otherCosts + r.otherCosts,
    }),
    { revenue: 0, totalCost: 0, profit: 0, fuelCost: 0, crewCost: 0, portCharges: 0, maintenanceAllocation: 0, otherCosts: 0 }
  );

  // Monthly trend, bucketed by departure month — powers the revenue/cost/
  // profit trend charts. Built from the same per-voyage results, not a
  // separate calculation, so the chart and the totals can never disagree.
  const trendMap = {};
  voyages.forEach((v, i) => {
    const monthKey = new Date(v.departureDate).toISOString().slice(0, 7); // YYYY-MM
    if (!trendMap[monthKey]) {
      trendMap[monthKey] = { month: monthKey, revenue: 0, cost: 0, profit: 0, fuelCost: 0, maintenanceCost: 0 };
    }
    const r = results[i];
    trendMap[monthKey].revenue += r.revenue;
    trendMap[monthKey].cost += r.totalCost;
    trendMap[monthKey].profit += r.profit;
    trendMap[monthKey].fuelCost += r.fuelCost;
    trendMap[monthKey].maintenanceCost += r.maintenanceAllocation;
  });
  const trend = Object.values(trendMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((t) => ({
      month: t.month,
      revenue: round(t.revenue),
      cost: round(t.cost),
      profit: round(t.profit),
      fuelCost: round(t.fuelCost),
      maintenanceCost: round(t.maintenanceCost),
    }));

  const distinctVessels = new Set(voyages.map((v) => String(v.vessel?._id || v.vessel))).size;

  return {
    voyages: results.sort((a, b) => b.profit - a.profit),
    totals: {
      revenue: round(totals.revenue),
      totalCost: round(totals.totalCost),
      profit: round(totals.profit),
      margin: totals.revenue > 0 ? round((totals.profit / totals.revenue) * 100, 1) : 0,
      costPerVoyage: results.length > 0 ? round(totals.totalCost / results.length) : 0,
      costPerVessel: distinctVessels > 0 ? round(totals.totalCost / distinctVessels) : 0,
      costBreakdown: {
        fuel: round(totals.fuelCost),
        crew: round(totals.crewCost),
        port: round(totals.portCharges),
        maintenance: round(totals.maintenanceAllocation),
        other: round(totals.otherCosts),
      },
    },
    trend,
    assumptions: { ...DEFAULT_ASSUMPTIONS, ...assumptions },
  };
}

module.exports = { computeVoyageProfitability, computeFleetProfitability, DEFAULT_ASSUMPTIONS };
