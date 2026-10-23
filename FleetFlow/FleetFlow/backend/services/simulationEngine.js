const Vessel = require('../models/Vessel');
const VesselLocation = require('../models/VesselLocation');
const { raiseAlert, resolveAlertByKey } = require('./alertService');

const OFFLINE_THRESHOLD_MS = 30 * 60 * 1000; // no location update in 30 min -> offline alert


// Advances every "Active" vessel's position a small step along its current
// heading, with a little jitter on speed/heading so it doesn't look robotic.
// This is a demo/development simulation, not real AIS/GPS data — the frontend
// labels it as such (see Tracking.jsx) so it's never mistaken for the real thing.
function stepPosition(lat, lng, headingDeg, speedKnots, intervalMs) {
  const hours = intervalMs / (1000 * 60 * 60);
  const distanceNm = speedKnots * hours;
  const distanceDeg = distanceNm / 60; // ~60 NM per degree of latitude

  const headingRad = (headingDeg * Math.PI) / 180;
  const newLat = lat + distanceDeg * Math.cos(headingRad);
  const newLng = lng + distanceDeg * Math.sin(headingRad) / Math.cos((lat * Math.PI) / 180 || 1);

  return { lat: newLat, lng: newLng };
}

function startSimulation(io) {
  const enabled = process.env.SIMULATION_ENABLED !== 'false';
  const interval = Number(process.env.SIMULATION_INTERVAL) || 5000;

  if (!enabled) {
    console.log('[simulation] Vessel position simulation is disabled (SIMULATION_ENABLED=false)');
    return null;
  }

  console.log(`[simulation] Vessel position simulation running every ${interval}ms`);

  const timer = setInterval(async () => {
    try {
      const activeVessels = await Vessel.find({ status: 'Active' });

      for (const vessel of activeVessels) {
        // Small random walk on heading/speed so movement looks organic
        const headingDrift = (Math.random() - 0.5) * 10;
        const speedDrift = (Math.random() - 0.5) * 1.5;

        const newHeading = ((vessel.currentHeading || 0) + headingDrift + 360) % 360;
        const newSpeed = Math.max(4, Math.min(24, (vessel.currentSpeed || 14) + speedDrift));

        const { lat, lng } = stepPosition(
          vessel.currentLatitude,
          vessel.currentLongitude,
          newHeading,
          newSpeed,
          interval
        );

        vessel.currentLatitude = lat;
        vessel.currentLongitude = lng;
        vessel.currentHeading = newHeading;
        vessel.currentSpeed = +newSpeed.toFixed(1);
        vessel.lastLocationUpdate = new Date();
        await vessel.save();
        await resolveAlertByKey(`OFFLINE:${vessel._id}`);

        await VesselLocation.create({
          vessel: vessel._id,
          latitude: lat,
          longitude: lng,
          speed: vessel.currentSpeed,
          heading: newHeading,
        });

        io.emit('vessel:position', {
          vesselId: vessel._id,
          name: vessel.name,
          latitude: lat,
          longitude: lng,
          speed: vessel.currentSpeed,
          heading: newHeading,
          simulated: true,
          timestamp: new Date(),
        });
      }

      // Vessel offline detection: any vessel not marked Offline whose last
      // location update is older than the threshold gets flagged and alerted.
      // (Active vessels get fresh updates every tick via the loop above, so this
      // mainly catches Idle/Maintenance vessels that have gone stale, or a vessel
      // that was Active but stopped reporting for some other reason.)
      const cutoff = new Date(Date.now() - OFFLINE_THRESHOLD_MS);
      const staleVessels = await Vessel.find({
        status: { $ne: 'Offline' },
        $or: [{ lastLocationUpdate: { $lt: cutoff } }, { lastLocationUpdate: null }],
      });

      for (const vessel of staleVessels) {
        await raiseAlert(
          {
            vessel: vessel._id,
            type: 'Vessel Offline',
            severity: 'Critical',
            message: `${vessel.name}: no location update received in over ${Math.round(OFFLINE_THRESHOLD_MS / 60000)} minutes.`,
            dedupeKey: `OFFLINE:${vessel._id}`,
          },
          io
        );
      }
    } catch (err) {
      console.error('[simulation] Error during tick:', err.message);
    }
  }, interval);

  return timer;
}

module.exports = { startSimulation };
