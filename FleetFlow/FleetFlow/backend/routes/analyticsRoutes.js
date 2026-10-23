const express = require('express');
const router = express.Router();
const {
  getDashboardAnalytics,
  getFuelAnalytics,
  getVoyageAnalytics,
  getMaintenanceAnalytics,
  getPerformanceAnalytics,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/dashboard', getDashboardAnalytics);
router.get('/fuel', getFuelAnalytics);
router.get('/voyages', getVoyageAnalytics);
router.get('/maintenance', getMaintenanceAnalytics);
router.get('/performance', getPerformanceAnalytics);

module.exports = router;
