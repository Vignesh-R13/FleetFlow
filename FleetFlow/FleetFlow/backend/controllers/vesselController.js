const Vessel = require('../models/Vessel');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/vessels?search=&status=&type=&flag=&sort=&page=&limit=
const getVessels = asyncHandler(async (req, res) => {
  const { search, status, type, flag, sort = '-createdAt', page = 1, limit = 10 } = req.query;

  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { imoNumber: { $regex: search, $options: 'i' } },
    ];
  }
  if (status) query.status = status;
  if (type) query.type = type;
  if (flag) query.flag = flag;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  const [vessels, total] = await Promise.all([
    Vessel.find(query)
      .sort(sort)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Vessel.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: vessels,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    },
  });
});

// GET /api/vessels/:id
const getVessel = asyncHandler(async (req, res) => {
  const vessel = await Vessel.findById(req.params.id);
  if (!vessel) {
    return res.status(404).json({ success: false, message: 'Vessel not found' });
  }
  res.json({ success: true, data: vessel });
});

// POST /api/vessels
const createVessel = asyncHandler(async (req, res) => {
  const vessel = await Vessel.create(req.body);
  res.status(201).json({ success: true, data: vessel });
});

// PUT /api/vessels/:id
const updateVessel = asyncHandler(async (req, res) => {
  const vessel = await Vessel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!vessel) {
    return res.status(404).json({ success: false, message: 'Vessel not found' });
  }
  res.json({ success: true, data: vessel });
});

// DELETE /api/vessels/:id
const deleteVessel = asyncHandler(async (req, res) => {
  const vessel = await Vessel.findByIdAndDelete(req.params.id);
  if (!vessel) {
    return res.status(404).json({ success: false, message: 'Vessel not found' });
  }
  res.json({ success: true, message: 'Vessel deleted', data: { id: req.params.id } });
});

module.exports = { getVessels, getVessel, createVessel, updateVessel, deleteVessel };
