const express = require('express');
const router = express.Router();
const { fleetReport, voyageReport, maintenanceReport, fuelReport, profitabilityReport } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/fleet', fleetReport);
router.get('/voyages', voyageReport);
router.get('/maintenance', maintenanceReport);
router.get('/fuel', fuelReport);
router.get('/profitability', profitabilityReport);

module.exports = router;
