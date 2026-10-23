const mongoose = require('mongoose');

const VOYAGE_STATUSES = [
  'Scheduled',
  'Loading',
  'Departed',
  'In Transit',
  'Delayed',
  'Arrived',
  'Completed',
  'Cancelled',
];

const voyageSchema = new mongoose.Schema(
  {
    vessel: { type: mongoose.Schema.Types.ObjectId, ref: 'Vessel', required: true },
    origin: { type: String, required: true },
    originLat: { type: Number },
    originLng: { type: Number },
    destination: { type: String, required: true },
    destinationLat: { type: Number },
    destinationLng: { type: Number },
    departureDate: { type: Date, required: true },
    expectedArrival: { type: Date, required: true },
    actualArrival: { type: Date, default: null },
    distance: { type: Number, required: true }, // nautical miles
    distanceTravelled: { type: Number, default: 0 },
    status: { type: String, enum: VOYAGE_STATUSES, default: 'Scheduled' },
    fuelBudget: { type: Number, default: 0 }, // tons
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

voyageSchema.index({ status: 1 });
voyageSchema.index({ vessel: 1 });
voyageSchema.index({ departureDate: 1 });

voyageSchema.virtual('distanceRemaining').get(function () {
  return Math.max(this.distance - this.distanceTravelled, 0);
});

voyageSchema.set('toJSON', { virtuals: true });
voyageSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Voyage', voyageSchema);
module.exports.VOYAGE_STATUSES = VOYAGE_STATUSES;
