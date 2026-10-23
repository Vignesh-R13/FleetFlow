const Cargo = require('../models/Cargo');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/cargo?voyage=&status=&page=&limit=
const getCargoList = asyncHandler(async (req, res) => {
  const { voyage, status, page = 1, limit = 10 } = req.query;
  const query = {};
  if (voyage) query.voyage = voyage;
  if (status) query.status = status;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  const [items, total] = await Promise.all([
    Cargo.find(query)
      .populate({ path: 'voyage', select: 'origin destination vessel', populate: { path: 'vessel', select: 'name' } })
      .sort('-createdAt')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Cargo.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) || 1 },
  });
});

// GET /api/cargo/:id
const getCargoItem = asyncHandler(async (req, res) => {
  const item = await Cargo.findById(req.params.id).populate('voyage');
  if (!item) return res.status(404).json({ success: false, message: 'Cargo not found' });
  res.json({ success: true, data: item });
});

// POST /api/cargo
const createCargoItem = asyncHandler(async (req, res) => {
  const item = await Cargo.create(req.body);
  res.status(201).json({ success: true, data: item });
});

// PUT /api/cargo/:id
const updateCargoItem = asyncHandler(async (req, res) => {
  const item = await Cargo.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ success: false, message: 'Cargo not found' });
  res.json({ success: true, data: item });
});

// DELETE /api/cargo/:id
const deleteCargoItem = asyncHandler(async (req, res) => {
  const item = await Cargo.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Cargo not found' });
  res.json({ success: true, message: 'Cargo deleted', data: { id: req.params.id } });
});

module.exports = { getCargoList, getCargoItem, createCargoItem, updateCargoItem, deleteCargoItem };
