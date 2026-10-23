const {
  scoreMaintenance,
  scoreAlerts,
  scoreVoyageStatus,
  scoreOperationalState,
  scoreFuelEfficiency,
  HEALTH_WEIGHTS,
} = require('../services/fleetHealthService');

// These test the deterministic scoring functions directly against plain
// fixtures — no database needed, and the same inputs must always produce
// the same output (that's the whole point of a rules-based, non-ML score).

describe('HEALTH_WEIGHTS', () => {
  it('sums to 1.0 so the overall score stays on a 0-100 scale', () => {
    const total = Object.values(HEALTH_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });
});

describe('scoreMaintenance', () => {
  const vesselId = 'v1';

  it('returns a neutral default when there is no maintenance history', () => {
    expect(scoreMaintenance(vesselId, [])).toBe(85);
  });

  it('penalizes overdue tasks more than merely high-priority pending ones', () => {
    const overdue = [{ vessel: vesselId, status: 'Overdue', priority: 'Medium' }];
    const pending = [{ vessel: vesselId, status: 'Scheduled', priority: 'High' }];
    expect(scoreMaintenance(vesselId, overdue)).toBeLessThan(scoreMaintenance(vesselId, pending));
  });

  it('never goes below 0 even with many overdue tasks', () => {
    const many = Array.from({ length: 10 }, () => ({ vessel: vesselId, status: 'Overdue', priority: 'Critical' }));
    expect(scoreMaintenance(vesselId, many)).toBe(0);
  });

  it('ignores tasks belonging to other vessels', () => {
    const otherVesselOverdue = [{ vessel: 'v2', status: 'Overdue', priority: 'Critical' }];
    expect(scoreMaintenance(vesselId, otherVesselOverdue)).toBe(85);
  });
});

describe('scoreAlerts', () => {
  const vesselId = 'v1';

  it('returns 100 with no active alerts', () => {
    expect(scoreAlerts(vesselId, [])).toBe(100);
  });

  it('penalizes critical alerts more than warnings', () => {
    const critical = [{ vessel: vesselId, severity: 'Critical', status: 'Unread' }];
    const warning = [{ vessel: vesselId, severity: 'Warning', status: 'Unread' }];
    expect(scoreAlerts(vesselId, critical)).toBeLessThan(scoreAlerts(vesselId, warning));
  });

  it('ignores resolved alerts', () => {
    const resolved = [{ vessel: vesselId, severity: 'Critical', status: 'Resolved' }];
    expect(scoreAlerts(vesselId, resolved)).toBe(100);
  });
});

describe('scoreVoyageStatus', () => {
  const vesselId = 'v1';

  it('is neutral-good when the vessel has no active voyage', () => {
    expect(scoreVoyageStatus(vesselId, [])).toBe(90);
  });

  it('scores lower when the vessel has a delayed voyage', () => {
    const delayed = [{ vessel: vesselId, status: 'Delayed' }];
    expect(scoreVoyageStatus(vesselId, delayed)).toBeLessThan(90);
  });

  it('does not penalize completed voyages', () => {
    const completed = [{ vessel: vesselId, status: 'Completed' }];
    expect(scoreVoyageStatus(vesselId, completed)).toBe(90);
  });
});

describe('scoreOperationalState', () => {
  it('ranks Active > Idle > Maintenance > Offline', () => {
    const active = scoreOperationalState({ status: 'Active' });
    const idle = scoreOperationalState({ status: 'Idle' });
    const maintenance = scoreOperationalState({ status: 'Maintenance' });
    const offline = scoreOperationalState({ status: 'Offline' });
    expect(active).toBeGreaterThan(idle);
    expect(idle).toBeGreaterThan(maintenance);
    expect(maintenance).toBeGreaterThan(offline);
  });
});

describe('scoreFuelEfficiency', () => {
  it('returns a neutral default when there is no fuel data', () => {
    expect(scoreFuelEfficiency('v1', {}, 10)).toBe(75);
  });

  it('scores above the neutral baseline when above the fleet average', () => {
    const fuelByVessel = { v1: { totalConsumed: 100, totalDistance: 1300 } }; // efficiency 13
    const score = scoreFuelEfficiency('v1', fuelByVessel, 10); // fleet avg 10
    expect(score).toBeGreaterThan(80);
  });

  it('scores below the neutral baseline when below the fleet average', () => {
    const fuelByVessel = { v1: { totalConsumed: 100, totalDistance: 700 } }; // efficiency 7
    const score = scoreFuelEfficiency('v1', fuelByVessel, 10); // fleet avg 10
    expect(score).toBeLessThan(80);
  });

  it('is deterministic — same inputs always produce the same output', () => {
    const fuelByVessel = { v1: { totalConsumed: 50, totalDistance: 600 } };
    const a = scoreFuelEfficiency('v1', fuelByVessel, 11);
    const b = scoreFuelEfficiency('v1', fuelByVessel, 11);
    expect(a).toBe(b);
  });
});
