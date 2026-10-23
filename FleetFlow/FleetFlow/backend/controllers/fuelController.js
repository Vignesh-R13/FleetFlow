const FuelRecord = require('../models/FuelRecord');
const Vessel = require('../models/Vessel');
const asyncHandler = require('../utils/asyncHandler');
const { raiseAlert, resolveAlertByKey } = require('../services/alertService');

const OVER_CONSUMPTION_THRESHOLD = 1.15; // 15% over expected triggers a warning
const LOW_FUEL_PCT = 0.2; // below 20% of capacity triggers a low-fuel alert

// GET /api/fuel?vessel=&voyage=
const getFuelRecords = asyncHandler(async (req, res) => {
  const { vessel, voyage, page = 1, limit = 20 } = req.query;
  const query = {};
  if (vessel) query.vessel = vessel;
  if (voyage) query.voyage = voyage;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200);

  const [records, total] = await Promise.all([
    FuelRecord.find(query)
      .populate('vessel', 'name imoNumber fuelCapacity')
      .sort('-recordedAt')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    FuelRecord.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: records,
    pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) || 1 },
  });
});

// GET /api/fuel/:vesselId  -> history + efficiency summary for one vessel
const getFuelForVessel = asyncHandler(async (req, res) => {
  const vessel = await Vessel.findById(req.params.vesselId);
  if (!vessel) return res.status(404).json({ success: false, message: 'Vessel not found' });

  const records = await FuelRecord.find({ vessel: vessel._id }).sort('-recordedAt').limit(100);

  const totalConsumed = records.reduce((sum, r) => sum + r.fuelConsumed, 0);
  const totalDistance = records.reduce((sum, r) => sum + r.distanceTravelled, 0);
  // Fuel Efficiency = Distance Travelled / Fuel Consumed
  const efficiency = totalConsumed > 0 ? +(totalDistance / totalConsumed).toFixed(2) : null;

  res.json({
    success: true,
    data: {
      vessel: { id: vessel._id, name: vessel.name, fuelCapacity: vessel.fuelCapacity, currentFuel: vessel.currentFuel },
      records,
      efficiency, // nautical miles per ton
    },
  });
});

// POST /api/fuel
const createFuelRecord = asyncHandler(async (req, res) => {
  const vessel = await Vessel.findById(req.body.vessel);
  if (!vessel) return res.status(404).json({ success: false, message: 'Vessel not found' });

  const record = await FuelRecord.create(req.body);

  vessel.currentFuel = record.fuelRemaining;
  await vessel.save();

  const io = req.app.get('io');

  // Rule: actual consumption > expected consumption * threshold -> warning
  if (record.expectedFuelConsumed && record.fuelConsumed > record.expectedFuelConsumed * OVER_CONSUMPTION_THRESHOLD) {
    await raiseAlert(
      {
        vessel: vessel._id,
        voyage: record.voyage,
        type: 'Fuel Warning',
        severity: 'Warning',
        message: `${vessel.name} fuel consumption (${record.fuelConsumed}t) is above the expected baseline (${record.expectedFuelConsumed}t).`,
        dedupeKey: `FUEL_OVER:${vessel._id}`,
      },
      io
    );
  } else {
    await resolveAlertByKey(`FUEL_OVER:${vessel._id}`);
  }

  // Rule: fuelRemaining < 20% of capacity -> low fuel alert
  if (vessel.fuelCapacity > 0 && record.fuelRemaining < vessel.fuelCapacity * LOW_FUEL_PCT) {
    await raiseAlert(
      {
        vessel: vessel._id,
        voyage: record.voyage,
        type: 'Low Fuel',
        severity: 'Critical',
        message: `${vessel.name} fuel remaining (${record.fuelRemaining}t) is below 20% of capacity.`,
        dedupeKey: `LOW_FUEL:${vessel._id}`,
      },
      io
    );
  } else {
    await resolveAlertByKey(`LOW_FUEL:${vessel._id}`);
  }

  res.status(201).json({ success: true, data: record });
});

module.exports = { getFuelRecords, getFuelForVessel, createFuelRecord };
