const mongoose = require('mongoose');

const CARGO_STATUSES = [
  'Booked',
  'Loading',
  'Loaded',
  'In Transit',
  'Arrived',
  'Delivered',
  'Delayed',
];

const cargoSchema = new mongoose.Schema(
  {
    cargoId: { type: String, required: true, trim: true },
    voyage: { type: mongoose.Schema.Types.ObjectId, ref: 'Voyage', required: true },
    cargoType: { type: String, required: true },
    weight: { type: Number, required: true }, // tons
    containerCount: { type: Number, default: 0 },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    loadingDate: { type: Date, default: null },
    expectedDelivery: { type: Date, required: true },
    actualDelivery: { type: Date, default: null },
    status: { type: String, enum: CARGO_STATUSES, default: 'Booked' },
  },
  { timestamps: true }
);

cargoSchema.index({ voyage: 1 });
cargoSchema.index({ status: 1 });
cargoSchema.index({ cargoId: 1 }, { unique: true });

module.exports = mongoose.model('Cargo', cargoSchema);
module.exports.CARGO_STATUSES = CARGO_STATUSES;
