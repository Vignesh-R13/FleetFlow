const mongoose = require('mongoose');

const fuelRecordSchema = new mongoose.Schema(
  {
    vessel: { type: mongoose.Schema.Types.ObjectId, ref: 'Vessel', required: true },
    voyage: { type: mongoose.Schema.Types.ObjectId, ref: 'Voyage', default: null },
    fuelConsumed: { type: Number, required: true }, // tons, cumulative or incremental depending on recordedAt cadence
    fuelRemaining: { type: Number, required: true }, // tons
    distanceTravelled: { type: Number, required: true }, // nm at time of record
    expectedFuelConsumed: { type: Number, default: null },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

fuelRecordSchema.index({ vessel: 1, recordedAt: -1 });
fuelRecordSchema.index({ voyage: 1 });

module.exports = mongoose.model('FuelRecord', fuelRecordSchema);
