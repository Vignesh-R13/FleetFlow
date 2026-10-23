const Vessel = require('../models/Vessel');
const Voyage = require('../models/Voyage');
const Maintenance = require('../models/Maintenance');
const FuelRecord = require('../models/FuelRecord');
const Cargo = require('../models/Cargo');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/analytics/dashboard — top-line KPIs for the main dashboard
const getDashboardAnalytics = asyncHandler(async (req, res) => {
  const [
    totalVessels,
    vesselsByStatus,
    activeVoyages,
    delayedVoyages,
    completedVoyages,
    upcomingVoyages,
    maintenanceCounts,
    cargoTotal,
  ] = await Promise.all([
    Vessel.countDocuments(),
    Vessel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Voyage.countDocuments({ status: { $in: ['Departed', 'In Transit', 'Loading'] } }),
    Voyage.countDocuments({ status: 'Delayed' }),
    Voyage.countDocuments({ status: 'Completed' }),
    Voyage.countDocuments({ status: 'Scheduled' }),
    Maintenance.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Cargo.aggregate([{ $group: { _id: null, totalWeight: { $sum: '$weight' }, totalContainers: { $sum: '$containerCount' } } }]),
  ]);

  const statusMap = Object.fromEntries(vesselsByStatus.map((s) => [s._id, s.count]));
  const maintMap = Object.fromEntries(maintenanceCounts.map((s) => [s._id, s.count]));

  const fleetUtilization = totalVessels > 0 ? +(((statusMap.Active || 0) / totalVessels) * 100).toFixed(1) : 0;

  res.json({
    success: true,
    data: {
      totalVessels,
      fleetByStatus: {
        active: statusMap.Active || 0,
        idle: statusMap.Idle || 0,
        maintenance: statusMap.Maintenance || 0,
        offline: statusMap.Offline || 0,
      },
      activeVoyages,
      delayedVoyages,
      completedVoyages,
      upcomingVoyages,
      underMaintenance: (maintMap['In Progress'] || 0) + (maintMap.Assigned || 0),
      overdueMaintenance: maintMap.Overdue || 0,
      fleetUtilization,
      totalCargoWeight: cargoTotal[0]?.totalWeight || 0,
      totalContainers: cargoTotal[0]?.totalContainers || 0,
    },
  });
});

// GET /api/analytics/fuel — consumption over time, per-vessel efficiency
const getFuelAnalytics = asyncHandler(async (req, res) => {
  const { vessel } = req.query;
  const match = vessel ? { vessel: new (require('mongoose').Types.ObjectId)(vessel) } : {};

  const records = await FuelRecord.find(match).sort('recordedAt').limit(500);

  const byVessel = await FuelRecord.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$vessel',
        totalConsumed: { $sum: '$fuelConsumed' },
        totalDistance: { $sum: '$distanceTravelled' },
      },
    },
    {
      $lookup: { from: 'vessels', localField: '_id', foreignField: '_id', as: 'vessel' },
    },
    { $unwind: '$vessel' },
    {
      $project: {
        vesselName: '$vessel.name',
        totalConsumed: 1,
        totalDistance: 1,
        efficiency: {
          $cond: [{ $gt: ['$totalConsumed', 0] }, { $divide: ['$totalDistance', '$totalConsumed'] }, null],
        },
      },
    },
  ]);

  res.json({ success: true, data: { history: records, byVessel } });
});

// GET /api/analytics/voyages — delays, completion rate
const getVoyageAnalytics = asyncHandler(async (req, res) => {
  const statusCounts = await Voyage.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  const total = statusCounts.reduce((sum, s) => sum + s.count, 0);
  const completed = statusCounts.find((s) => s._id === 'Completed')?.count || 0;
  const completionRate = total > 0 ? +((completed / total) * 100).toFixed(1) : 0;

  res.json({ success: true, data: { statusCounts, total, completionRate } });
});

// GET /api/analytics/maintenance — costs, by category
const getMaintenanceAnalytics = asyncHandler(async (req, res) => {
  const [byCategory, byStatus, costTotals] = await Promise.all([
    Maintenance.aggregate([{ $group: { _id: '$category', count: { $sum: 1 }, cost: { $sum: '$cost' } } }]),
    Maintenance.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Maintenance.aggregate([{ $group: { _id: null, totalCost: { $sum: '$cost' } } }]),
  ]);

  res.json({
    success: true,
    data: { byCategory, byStatus, totalCost: costTotals[0]?.totalCost || 0 },
  });
});

// GET /api/analytics/performance — voyage performance score breakdown
// Score composition (0-100): fuel efficiency, schedule adherence, route efficiency, cargo delivery.
const getPerformanceAnalytics = asyncHandler(async (req, res) => {
  const { voyageId } = req.query;
  if (!voyageId) {
    return res.status(400).json({ success: false, message: 'voyageId query parameter is required' });
  }

  const voyage = await Voyage.findById(voyageId).populate('vessel');
  if (!voyage) return res.status(404).json({ success: false, message: 'Voyage not found' });

  const fuelRecords = await FuelRecord.find({ voyage: voyage._id });
  const totalConsumed = fuelRecords.reduce((sum, r) => sum + r.fuelConsumed, 0);

  // Fuel efficiency score: how close actual consumption is to budget (100 = at or under budget)
  const fuelScore =
    voyage.fuelBudget > 0
      ? Math.max(0, Math.min(100, Math.round(100 - ((totalConsumed - voyage.fuelBudget) / voyage.fuelBudget) * 100)))
      : 80;

  // Schedule adherence: on-time or early = 100, degrades with days late
  let scheduleScore = 100;
  if (voyage.actualArrival && voyage.expectedArrival) {
    const lateMs = new Date(voyage.actualArrival) - new Date(voyage.expectedArrival);
    const lateDays = Math.max(0, lateMs / (1000 * 60 * 60 * 24));
    scheduleScore = Math.max(0, Math.round(100 - lateDays * 10));
  } else if (voyage.status === 'Delayed') {
    scheduleScore = 60;
  }

  // Route efficiency: distance travelled vs planned distance (over-distance implies deviation)
  const routeScore =
    voyage.distance > 0
      ? Math.max(0, Math.min(100, Math.round(100 - ((voyage.distanceTravelled - voyage.distance) / voyage.distance) * 100)))
      : 80;

  const cargoItems = await Cargo.find({ voyage: voyage._id });
  const delivered = cargoItems.filter((c) => c.status === 'Delivered').length;
  const cargoScore = cargoItems.length > 0 ? Math.round((delivered / cargoItems.length) * 100) : 100;

  const overall = Math.round((fuelScore + scheduleScore + routeScore + cargoScore) / 4);

  res.json({
    success: true,
    data: {
      voyageId: voyage._id,
      breakdown: {
        fuelEfficiency: fuelScore,
        schedule: scheduleScore,
        routeEfficiency: routeScore,
        cargoDelivery: cargoScore,
      },
      overall,
      rating: overall >= 85 ? 'Excellent' : overall >= 70 ? 'Good' : overall >= 50 ? 'Fair' : 'Poor',
    },
  });
});

module.exports = {
  getDashboardAnalytics,
  getFuelAnalytics,
  getVoyageAnalytics,
  getMaintenanceAnalytics,
  getPerformanceAnalytics,
};
