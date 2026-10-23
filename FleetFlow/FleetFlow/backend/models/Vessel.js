const mongoose = require('mongoose');

const VESSEL_TYPES = [
  'Container Ship',
  'Bulk Carrier',
  'Tanker',
  'Cargo Ship',
  'Ro-Ro',
  'General Cargo',
  'Other',
];

const VESSEL_STATUSES = ['Active', 'Idle', 'Maintenance', 'Offline'];

const vesselSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    imoNumber: { type: String, required: true, trim: true },
    type: { type: String, enum: VESSEL_TYPES, default: 'Container Ship' },
    flag: { type: String, required: true },
    yearBuilt: { type: Number },
    capacity: { type: Number, default: 0 }, // TEU or DWT depending on type
    fuelCapacity: { type: Number, default: 0 }, // tons
    engineType: { type: String, default: 'Diesel' },
    status: { type: String, enum: VESSEL_STATUSES, default: 'Idle' },

    currentLatitude: { type: Number, default: 0 },
    currentLongitude: { type: Number, default: 0 },
    currentSpeed: { type: Number, default: 0 }, // knots
    currentHeading: { type: Number, default: 0 }, // degrees
    currentFuel: { type: Number, default: 0 }, // tons remaining
    lastLocationUpdate: { type: Date, default: null },
  },
  { timestamps: true }
);

vesselSchema.index({ name: 1 });
vesselSchema.index({ imoNumber: 1 }, { unique: true });
vesselSchema.index({ status: 1 });

module.exports = mongoose.model('Vessel', vesselSchema);
module.exports.VESSEL_TYPES = VESSEL_TYPES;
module.exports.VESSEL_STATUSES = VESSEL_STATUSES;
