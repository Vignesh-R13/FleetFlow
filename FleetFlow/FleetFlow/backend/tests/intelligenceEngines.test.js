const { computeVesselMaintenanceRisk } = require('../services/predictiveMaintenanceService');
const { computeDelayRisk } = require('../services/voyageIntelligenceService');
const { computeVoyageProfitability, DEFAULT_ASSUMPTIONS } = require('../services/profitabilityService');

const vessel = { _id: 'v1', name: 'Test Vessel' };

describe('computeVesselMaintenanceRisk', () => {
  it('returns a low score with no contributing factors when everything is clean', () => {
    const result = computeVesselMaintenanceRisk(vessel, {
      maintenanceTasks: [{ vessel: 'v1', status: 'Completed', priority: 'Low', completionDate: new Date() }],
      alerts: [],
      fuelRecords: [],
      voyages: [],
    });
    expect(result.level).toBe('LOW');
    expect(result.factors).toEqual(['No significant risk factors detected']);
  });

  it('raises the score and lists a factor for overdue maintenance', () => {
    const result = computeVesselMaintenanceRisk(vessel, {
      maintenanceTasks: [{ vessel: 'v1', status: 'Overdue', priority: 'High' }],
      alerts: [],
      fuelRecords: [],
      voyages: [],
    });
    expect(result.score).toBeGreaterThan(0);
    expect(result.factors.some((f) => f.includes('overdue'))).toBe(true);
  });

  it('reaches CRITICAL when multiple risk factors compound', () => {
    const result = computeVesselMaintenanceRisk(vessel, {
      maintenanceTasks: [
        { vessel: 'v1', status: 'Overdue', priority: 'Critical' },
        { vessel: 'v1', status: 'Scheduled', priority: 'Critical' },
      ],
      alerts: [
        { vessel: 'v1', status: 'Unread' },
        { vessel: 'v1', status: 'Unread' },
        { vessel: 'v1', status: 'Unread' },
      ],
      fuelRecords: [],
      voyages: [{ vessel: 'v1', status: 'In Transit' }, { vessel: 'v1', status: 'Completed' }, { vessel: 'v1', status: 'Completed' }, { vessel: 'v1', status: 'Completed' }],
    });
    expect(result.level).toBe('CRITICAL');
    expect(result.recommendedAction).toMatch(/immediately/i);
  });

  it('only counts factors belonging to the given vessel', () => {
    const result = computeVesselMaintenanceRisk(vessel, {
      maintenanceTasks: [{ vessel: 'other-vessel', status: 'Overdue', priority: 'Critical' }],
      alerts: [],
      fuelRecords: [],
      voyages: [],
    });
    expect(result.factors.some((f) => f.includes('overdue'))).toBe(false);
  });
});

describe('computeDelayRisk', () => {
  const baseVoyage = {
    status: 'In Transit',
    departureDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    expectedArrival: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    distance: 1000,
    distanceTravelled: 500,
  };

  it('is LOW risk for an on-schedule voyage with no other signals', () => {
    const result = computeDelayRisk(baseVoyage, { vesselHealthScore: 95, openAlertCount: 0 });
    expect(result.risk).toBe('LOW');
  });

  it('scores a delayed voyage as high risk', () => {
    const result = computeDelayRisk({ ...baseVoyage, status: 'Delayed' }, { vesselHealthScore: 95, openAlertCount: 0 });
    expect(result.probability).toBeGreaterThanOrEqual(55);
    expect(result.reasons.some((r) => r.includes('already marked delayed'))).toBe(true);
  });

  it('adds risk for a vessel with poor health and open alerts', () => {
    const healthy = computeDelayRisk(baseVoyage, { vesselHealthScore: 95, openAlertCount: 0 });
    const unhealthy = computeDelayRisk(baseVoyage, { vesselHealthScore: 40, openAlertCount: 3 });
    expect(unhealthy.probability).toBeGreaterThan(healthy.probability);
  });

  it('never exceeds 100', () => {
    const worst = computeDelayRisk(
      { ...baseVoyage, status: 'Delayed', expectedArrival: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
      { vesselHealthScore: 10, openAlertCount: 10 }
    );
    expect(worst.probability).toBeLessThanOrEqual(100);
  });
});

describe('computeVoyageProfitability', () => {
  const voyage = {
    distance: 1000,
    fuelBudget: 50,
    departureDate: new Date('2026-01-01'),
    expectedArrival: new Date('2026-01-05'),
  };

  it('computes profit as revenue minus all cost components', () => {
    const result = computeVoyageProfitability(voyage, null, DEFAULT_ASSUMPTIONS);
    const expectedTotalCost = result.fuelCost + result.crewCost + result.portCharges + result.maintenanceAllocation + result.otherCosts;
    expect(result.totalCost).toBeCloseTo(expectedTotalCost, 0);
    expect(result.profit).toBeCloseTo(result.revenue - expectedTotalCost, 0);
  });

  it('prefers actual fuel consumption over the planned budget when provided', () => {
    const withBudget = computeVoyageProfitability(voyage, null, DEFAULT_ASSUMPTIONS);
    const withActual = computeVoyageProfitability(voyage, 80, DEFAULT_ASSUMPTIONS);
    expect(withActual.fuelCost).toBeGreaterThan(withBudget.fuelCost);
  });

  it('never hides which assumptions were used', () => {
    const result = computeVoyageProfitability(voyage, null, DEFAULT_ASSUMPTIONS);
    expect(result.assumptions).toBeDefined();
    expect(result.assumptions.fuelPricePerTon).toBe(DEFAULT_ASSUMPTIONS.fuelPricePerTon);
  });

  it('respects overridden assumptions (for the What-If simulator)', () => {
    const base = computeVoyageProfitability(voyage, null, DEFAULT_ASSUMPTIONS);
    const higherPrice = computeVoyageProfitability(voyage, null, { ...DEFAULT_ASSUMPTIONS, fuelPricePerTon: DEFAULT_ASSUMPTIONS.fuelPricePerTon * 2 });
    expect(higherPrice.fuelCost).toBeGreaterThan(base.fuelCost);
    expect(higherPrice.profit).toBeLessThan(base.profit);
  });

  it('respects a distance override without mutating the original voyage', () => {
    const base = computeVoyageProfitability(voyage, null, DEFAULT_ASSUMPTIONS);
    const longer = computeVoyageProfitability(voyage, null, DEFAULT_ASSUMPTIONS, { distance: voyage.distance * 2 });
    expect(longer.revenue).toBeCloseTo(base.revenue * 2, 0);
    expect(voyage.distance).toBe(1000); // original untouched
  });

  it('scales operating costs (not fuel) via operatingCostMultiplier', () => {
    const base = computeVoyageProfitability(voyage, null, DEFAULT_ASSUMPTIONS);
    const doubled = computeVoyageProfitability(voyage, null, DEFAULT_ASSUMPTIONS, { operatingCostMultiplier: 2 });
    expect(doubled.crewCost).toBeCloseTo(base.crewCost * 2, 0);
    expect(doubled.fuelCost).toBeCloseTo(base.fuelCost, 0); // fuel is unaffected by the operating cost multiplier
  });

  it('is deterministic', () => {
    const a = computeVoyageProfitability(voyage, 50, DEFAULT_ASSUMPTIONS);
    const b = computeVoyageProfitability(voyage, 50, DEFAULT_ASSUMPTIONS);
    expect(a).toEqual(b);
  });
});
