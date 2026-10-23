const Maintenance = require('../models/Maintenance');
const asyncHandler = require('../utils/asyncHandler');
const { raiseAlert, resolveAlertByKey } = require('../services/alertService');

// Flips any non-terminal task whose scheduledDate has passed to "Overdue",
// and raises a matching alert. Called at the top of every read so the list
// is always accurate without needing a separate cron process for this demo.
async function syncOverdueStatuses(io) {
  const now = new Date();
  const overdueCandidates = await Maintenance.find({
    scheduledDate: { $lt: now },
    status: { $nin: ['Completed', 'Cancelled', 'Overdue'] },
  });

  for (const task of overdueCandidates) {
    task.status = 'Overdue';
    await task.save();
    await raiseAlert(
      {
        vessel: task.vessel,
        type: 'Maintenance Overdue',
        severity: 'Critical',
        message: `Maintenance "${task.title}" is overdue.`,
        dedupeKey: `MAINT_OVERDUE:${task._id}`,
      },
      io
    );
  }
}

// GET /api/maintenance?vessel=&status=&priority=&page=&limit=
const getMaintenanceTasks = asyncHandler(async (req, res) => {
  await syncOverdueStatuses(req.app.get('io'));

  const { vessel, status, priority, page = 1, limit = 10 } = req.query;
  const query = {};
  if (vessel) query.vessel = vessel;
  if (status) query.status = status;
  if (priority) query.priority = priority;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  const [tasks, total] = await Promise.all([
    Maintenance.find(query)
      .populate('vessel', 'name imoNumber')
      .sort('scheduledDate')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Maintenance.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: tasks,
    pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) || 1 },
  });
});

// GET /api/maintenance/:id
const getMaintenanceTask = asyncHandler(async (req, res) => {
  const task = await Maintenance.findById(req.params.id).populate('vessel');
  if (!task) return res.status(404).json({ success: false, message: 'Maintenance task not found' });
  res.json({ success: true, data: task });
});

// POST /api/maintenance
const createMaintenanceTask = asyncHandler(async (req, res) => {
  const task = await Maintenance.create(req.body);
  res.status(201).json({ success: true, data: task });
});

// PUT /api/maintenance/:id
const updateMaintenanceTask = asyncHandler(async (req, res) => {
  const task = await Maintenance.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!task) return res.status(404).json({ success: false, message: 'Maintenance task not found' });

  if (task.status === 'Completed') {
    await resolveAlertByKey(`MAINT_OVERDUE:${task._id}`);
  }

  res.json({ success: true, data: task });
});

// DELETE /api/maintenance/:id
const deleteMaintenanceTask = asyncHandler(async (req, res) => {
  const task = await Maintenance.findByIdAndDelete(req.params.id);
  if (!task) return res.status(404).json({ success: false, message: 'Maintenance task not found' });
  res.json({ success: true, message: 'Maintenance task deleted', data: { id: req.params.id } });
});

module.exports = {
  getMaintenanceTasks,
  getMaintenanceTask,
  createMaintenanceTask,
  updateMaintenanceTask,
  deleteMaintenanceTask,
};
