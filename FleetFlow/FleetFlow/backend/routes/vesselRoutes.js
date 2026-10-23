const express = require('express');
const router = express.Router();
const {
  getVessels,
  getVessel,
  createVessel,
  updateVessel,
  deleteVessel,
} = require('../controllers/vesselController');
const { vesselRules } = require('../validators/vesselValidators');
const { protect, authorize } = require('../middleware/auth');
const { getVesselLocations, postVesselLocation } = require('../controllers/locationController');

router.use(protect); // every vessel route requires authentication

router.get('/', getVessels);
router.get('/:id', getVessel);
router.post('/', authorize('ADMIN', 'FLEET_MANAGER'), vesselRules, createVessel);
router.put('/:id', authorize('ADMIN', 'FLEET_MANAGER'), updateVessel);
router.delete('/:id', authorize('ADMIN'), deleteVessel);

router.get('/:id/locations', getVesselLocations);
router.post('/:id/location', authorize('ADMIN', 'FLEET_MANAGER', 'CAPTAIN'), postVesselLocation);

module.exports = router;
