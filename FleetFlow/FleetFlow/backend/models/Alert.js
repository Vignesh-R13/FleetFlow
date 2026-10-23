const mongoose = require('mongoose');

const ALERT_TYPES = [
  'Fuel Warning',
  'Maintenance Overdue',
  'Maintenance Due',
  'Voyage Delay',
  'Route Deviation',
  'Vessel Offline',
  'Engine Warning',
  'Low Fuel',
  'Incident',
];

const ALERT_SEVERITIES = ['Info', 'Warning', 'Critical'];
const ALERT_STATUSES = ['Unread', 'Read', 'Resolved'];

const alertSchema = new mongoose.Schema(
  {
    vessel: { type: mongoose.Schema.Types.ObjectId, ref: 'Vessel', default: null },
    voyage: { type: mongoose.Schema.Types.ObjectId, ref: 'Voyage', default: null },
    type: { type: String, enum: ALERT_TYPES, required: true },
    severity: { type: String, enum: ALERT_SEVERITIES, default: 'Info' },
    message: { type: String, required: true },
    status: { type: String, enum: ALERT_STATUSES, default: 'Unread' },
    resolvedAt: { type: Date, default: null },
    // dedupe key so the same condition doesn't spam alerts, e.g. "LOW_FUEL:<vesselId>"
    dedupeKey: { type: String, default: null },
  },
  { timestamps: true }
);

alertSchema.index({ status: 1 });
alertSchema.index({ severity: 1 });
alertSchema.index({ vessel: 1 });
alertSchema.index({ createdAt: -1 });
alertSchema.index({ dedupeKey: 1, status: 1 });

module.exports = mongoose.model('Alert', alertSchema);
module.exports.ALERT_TYPES = ALERT_TYPES;
module.exports.ALERT_SEVERITIES = ALERT_SEVERITIES;
module.exports.ALERT_STATUSES = ALERT_STATUSES;
