const mongoose = require('mongoose');

const MAINTENANCE_CATEGORIES = [
  'Engine',
  'Propeller',
  'Hull',
  'Electrical',
  'Navigation',
  'Safety',
  'Fuel System',
  'Other',
];
const MAINTENANCE_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const MAINTENANCE_STATUSES = [
  'Scheduled',
  'Assigned',
  'In Progress',
  'Completed',
  'Overdue',
  'Cancelled',
];

const maintenanceSchema = new mongoose.Schema(
  {
    vessel: { type: mongoose.Schema.Types.ObjectId, ref: 'Vessel', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, enum: MAINTENANCE_CATEGORIES, default: 'Other' },
    priority: { type: String, enum: MAINTENANCE_PRIORITIES, default: 'Medium' },
    scheduledDate: { type: Date, required: true },
    startDate: { type: Date, default: null },
    completionDate: { type: Date, default: null },
    assignedTechnician: { type: String, default: '' },
    cost: { type: Number, default: 0 },
    status: { type: String, enum: MAINTENANCE_STATUSES, default: 'Scheduled' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

maintenanceSchema.index({ vessel: 1 });
maintenanceSchema.index({ status: 1 });
maintenanceSchema.index({ scheduledDate: 1 });

module.exports = mongoose.model('Maintenance', maintenanceSchema);
module.exports.MAINTENANCE_CATEGORIES = MAINTENANCE_CATEGORIES;
module.exports.MAINTENANCE_PRIORITIES = MAINTENANCE_PRIORITIES;
module.exports.MAINTENANCE_STATUSES = MAINTENANCE_STATUSES;
