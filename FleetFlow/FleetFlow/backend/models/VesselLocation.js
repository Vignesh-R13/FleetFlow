const mongoose = require('mongoose');

const vesselLocationSchema = new mongoose.Schema({
  vessel: { type: mongoose.Schema.Types.ObjectId, ref: 'Vessel', required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  speed: { type: Number, default: 0 },
  heading: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
});

vesselLocationSchema.index({ vessel: 1, timestamp: -1 });

module.exports = mongoose.model('VesselLocation', vesselLocationSchema);
