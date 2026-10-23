const express = require('express');
const router = express.Router();
const {
  getFleetHealth,
  getRisks,
  getCommandCenterSummary,
  getMaintenanceRisk,
  getVesselMaintenanceRisk,
  getFuelIntelligence,
  getVoyageIntelligence,
  getProfitability,
  getVoyageProfitability,
} = require('../controllers/intelligenceController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/fleet-health', getFleetHealth);
router.get('/risks', getRisks);
router.get('/command-center', getCommandCenterSummary);
router.get('/maintenance', getMaintenanceRisk);
router.get('/maintenance/:vesselId', getVesselMaintenanceRisk);
router.get('/fuel', getFuelIntelligence);
router.get('/voyages', getVoyageIntelligence);
router.get('/profitability', getProfitability);
router.get('/profitability/:voyageId', getVoyageProfitability);

module.exports = router;
