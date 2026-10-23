const Voyage = require('../models/Voyage');
const Vessel = require('../models/Vessel');
const asyncHandler = require('../utils/asyncHandler');
const { raiseAlert, resolveAlertByKey } = require('../services/alertService');

// GET /api/voyages?search=&status=&vessel=&sort=&page=&limit=
const getVoyages = asyncHandler(async (req, res) => {
  const { search, status, vessel, sort = '-departureDate', page = 1, limit = 10 } = req.query;

  const query = {};
  if (status) query.status = status;
  if (vessel) query.vessel = vessel;
  if (search) {
    query.$or = [
      { origin: { $regex: search, $options: 'i' } },
      { destination: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  const [voyages, total] = await Promise.all([
    Voyage.find(query)
      .populate('vessel', 'name imoNumber type status')
      .sort(sort)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Voyage.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: voyages,
    pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) || 1 },
  });
});

// GET /api/voyages/:id
const getVoyage = asyncHandler(async (req, res) => {
  const voyage = await Voyage.findById(req.params.id).populate('vessel');
  if (!voyage) return res.status(404).json({ success: false, message: 'Voyage not found' });
  res.json({ success: true, data: voyage });
});

// POST /api/voyages
const createVoyage = asyncHandler(async (req, res) => {
  const vessel = await Vessel.findById(req.body.vessel);
  if (!vessel) return res.status(404).json({ success: false, message: 'Vessel not found' });

  const voyage = await Voyage.create(req.body);

  // A vessel starting a voyage that isn't merely "Scheduled" is operationally active.
  if (voyage.status && voyage.status !== 'Scheduled' && voyage.status !== 'Cancelled') {
    vessel.status = 'Active';
    await vessel.save();
  }

  res.status(201).json({ success: true, data: voyage });
});

// PUT /api/voyages/:id
const updateVoyage = asyncHandler(async (req, res) => {
  const voyage = await Voyage.findById(req.params.id);
  if (!voyage) return res.status(404).json({ success: false, message: 'Voyage not found' });

  Object.assign(voyage, req.body);
  await voyage.save();

  // Delay detection: compare current ETA (expectedArrival) against departure-time plan.
  // Captains can push expectedArrival forward when conditions change; if it now falls
  // after the original schedule and the voyage isn't finished, raise/refresh a delay alert.
  const dedupeKey = `VOYAGE_DELAY:${voyage._id}`;
  const isFinished = ['Arrived', 'Completed', 'Cancelled'].includes(voyage.status);

  if (voyage.status === 'Delayed' && !isFinished) {
    await raiseAlert(
      {
        vessel: voyage.vessel,
        voyage: voyage._id,
        type: 'Voyage Delay',
        severity: 'Warning',
        message: `Voyage ${voyage.origin} → ${voyage.destination} is delayed.`,
        dedupeKey,
      },
      req.app.get('io')
    );
  } else {
    await resolveAlertByKey(dedupeKey);
  }

  if (isFinished) {
    const vessel = await Vessel.findById(voyage.vessel);
    if (vessel && vessel.status === 'Active') {
      vessel.status = 'Idle';
      await vessel.save();
    }
  }

  res.json({ success: true, data: voyage });
});

// DELETE /api/voyages/:id
const deleteVoyage = asyncHandler(async (req, res) => {
  const voyage = await Voyage.findByIdAndDelete(req.params.id);
  if (!voyage) return res.status(404).json({ success: false, message: 'Voyage not found' });
  res.json({ success: true, message: 'Voyage deleted', data: { id: req.params.id } });
});

module.exports = { getVoyages, getVoyage, createVoyage, updateVoyage, deleteVoyage };
