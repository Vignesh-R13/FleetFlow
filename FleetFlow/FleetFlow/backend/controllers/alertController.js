const Alert = require('../models/Alert');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/alerts?severity=&vessel=&status=&page=&limit=
const getAlerts = asyncHandler(async (req, res) => {
  const { severity, vessel, status, page = 1, limit = 20 } = req.query;
  const query = {};
  if (severity) query.severity = severity;
  if (vessel) query.vessel = vessel;
  if (status) query.status = status;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200);

  const [alerts, total] = await Promise.all([
    Alert.find(query)
      .populate('vessel', 'name imoNumber')
      .sort('-createdAt')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Alert.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: alerts,
    pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) || 1 },
  });
});

// PUT /api/alerts/:id/read
const markAsRead = asyncHandler(async (req, res) => {
  const alert = await Alert.findByIdAndUpdate(req.params.id, { status: 'Read' }, { new: true });
  if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
  res.json({ success: true, data: alert });
});

// PUT /api/alerts/:id/resolve
const resolveAlert = asyncHandler(async (req, res) => {
  const alert = await Alert.findByIdAndUpdate(
    req.params.id,
    { status: 'Resolved', resolvedAt: new Date() },
    { new: true }
  );
  if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
  res.json({ success: true, data: alert });
});

module.exports = { getAlerts, markAsRead, resolveAlert };
