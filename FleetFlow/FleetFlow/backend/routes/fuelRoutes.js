const express = require('express');
const router = express.Router();
const { getFuelRecords, getFuelForVessel, createFuelRecord } = require('../controllers/fuelController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getFuelRecords);
router.get('/:vesselId', getFuelForVessel);
router.post('/', authorize('ADMIN', 'FLEET_MANAGER', 'CAPTAIN'), createFuelRecord);

module.exports = router;
