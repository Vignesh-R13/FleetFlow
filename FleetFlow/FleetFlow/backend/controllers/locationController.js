const VesselLocation = require('../models/VesselLocation');
const Vessel = require('../models/Vessel');
const asyncHandler = require('../utils/asyncHandler');
const { resolveAlertByKey } = require('../services/alertService');

// GET /api/vessels/:id/locations
const getVesselLocations = asyncHandler(async (req, res) => {
  const { limit = 100 } = req.query;
  const locations = await VesselLocation.find({ vessel: req.params.id })
    .sort('-timestamp')
    .limit(Math.min(parseInt(limit, 10) || 100, 500));
  res.json({ success: true, data: locations });
});

// POST /api/vessels/:id/location
// Used both by manual updates (captain reporting position) and by the
// simulation engine (Phase 7) to append a new position and update the vessel doc.
const postVesselLocation = asyncHandler(async (req, res) => {
  const vessel = await Vessel.findById(req.params.id);
  if (!vessel) return res.status(404).json({ success: false, message: 'Vessel not found' });

  const { latitude, longitude, speed = 0, heading = 0 } = req.body;

  const location = await VesselLocation.create({
    vessel: vessel._id,
    latitude,
    longitude,
    speed,
    heading,
  });

  vessel.currentLatitude = latitude;
  vessel.currentLongitude = longitude;
  vessel.currentSpeed = speed;
  vessel.currentHeading = heading;
  vessel.lastLocationUpdate = new Date();
  await vessel.save();
  await resolveAlertByKey(`OFFLINE:${vessel._id}`);

  const io = req.app.get('io');
  if (io) {
    io.emit('vessel:position', {
      vesselId: vessel._id,
      name: vessel.name,
      latitude,
      longitude,
      speed,
      heading,
      timestamp: location.timestamp,
    });
  }

  res.status(201).json({ success: true, data: location });
});

module.exports = { getVesselLocations, postVesselLocation };
