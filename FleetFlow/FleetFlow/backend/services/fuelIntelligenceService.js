const FuelRecord = require('../models/FuelRecord');

// Fuel price is not a field anywhere in the data model, so any cost figure
// here is necessarily an assumption. It's centralized here (not scattered),
// clearly labeled in every response that uses it, and overridable via query
// param so the Phase 4 What-If Simulator can reuse this same engine.
const DEFAULT_FUEL_PRICE_PER_TON = 620; // USD — a configurable assumption, not live market data

// ---- Fleet-wide fuel intelligence: totals, comparison, trend, warnings ----
async function computeFuelIntelligence(vessels, fuelPricePerTon = DEFAULT_FUEL_PRICE_PER_TON) {
  const vesselIds = vessels.map((v) => v._id);
  const records = await FuelRecord.find({ vessel: { $in: vesselIds } }).sort('recordedAt');

  const byVessel = {};
  for (const r of records) {
    const key = String(r.vessel);
    if (!byVessel[key]) byVessel[key] = [];
    byVessel[key].push(r);
  }

  const totalConsumed = records.reduce((s, r) => s + r.fuelConsumed, 0);
  const totalDistance = records.reduce((s, r) => s + r.distanceTravelled, 0);
  const fleetAvgEfficiency = totalConsumed > 0 ? +(totalDistance / totalConsumed).toFixed(2) : 0;

  const vesselComparison = vessels
    .map((vessel) => {
      const vesselRecords = byVessel[String(vessel._id)] || [];
      const consumed = vesselRecords.reduce((s, r) => s + r.fuelConsumed, 0);
      const distance = vesselRecords.reduce((s, r) => s + r.distanceTravelled, 0);
      const efficiency = consumed > 0 ? distance / consumed : null;

      // Trend: compare the earlier half of this vessel's records to the later half.
      let trend = 'stable';
      let trendPct = 0;
      if (vesselRecords.length >= 4) {
        const sorted = vesselRecords.slice().sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));
        const mid = Math.floor(sorted.length / 2);
        const eff = (set) => {
          const c = set.reduce((s, r) => s + r.fuelConsumed, 0);
          const d = set.reduce((s, r) => s + r.distanceTravelled, 0);
          return c > 0 ? d / c : null;
        };
        const earlier = eff(sorted.slice(0, mid));
        const later = eff(sorted.slice(mid));
        if (earlier && later) {
          trendPct = Math.round(((later - earlier) / earlier) * 100);
          if (trendPct <= -8) trend = 'declining';
          else if (trendPct >= 8) trend = 'improving';
        }
      }

      // Efficiency relative to the fleet average, as a percentage score for display (e.g. "94%").
      const relativeScore = fleetAvgEfficiency > 0 && efficiency != null
        ? Math.round(Math.min(140, (efficiency / fleetAvgEfficiency) * 100))
        : null;

      return {
        vesselId: vessel._id,
        vesselName: vessel.name,
        totalConsumed: +consumed.toFixed(1),
        totalDistance: +distance.toFixed(0),
        efficiency: efficiency != null ? +efficiency.toFixed(2) : null,
        relativeScore,
        trend,
        trendPct,
        estimatedCost: +(consumed * fuelPricePerTon).toFixed(0),
      };
    })
    .filter((v) => v.totalConsumed > 0)
    .sort((a, b) => (b.efficiency || 0) - (a.efficiency || 0));

  const warnings = vesselComparison
    .filter((v) => v.trend === 'declining')
    .map((v) => ({
      vesselId: v.vesselId,
      vesselName: v.vesselName,
      message: `${v.vesselName} fuel efficiency has declined ${Math.abs(v.trendPct)}% recently.`,
    }));

  return {
    totalConsumption: +totalConsumed.toFixed(1),
    averageEfficiency: fleetAvgEfficiency,
    highestConsumptionVessel: vesselComparison.length > 0
      ? vesselComparison.slice().sort((a, b) => b.totalConsumed - a.totalConsumed)[0]
      : null,
    mostEfficientVessel: vesselComparison[0] || null,
    vesselComparison,
    warnings,
    estimatedTotalCost: +(totalConsumed * fuelPricePerTon).toFixed(0),
    assumptions: { fuelPricePerTon, currency: 'USD', note: 'Fuel price is a configurable assumption, not live market data.' },
  };
}

module.exports = { computeFuelIntelligence, DEFAULT_FUEL_PRICE_PER_TON };
