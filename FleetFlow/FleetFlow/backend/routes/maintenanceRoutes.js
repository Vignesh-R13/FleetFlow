const express = require('express');
const router = express.Router();
const {
  getMaintenanceTasks,
  getMaintenanceTask,
  createMaintenanceTask,
  updateMaintenanceTask,
  deleteMaintenanceTask,
} = require('../controllers/maintenanceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getMaintenanceTasks);
router.get('/:id', getMaintenanceTask);
router.post('/', authorize('ADMIN', 'MAINTENANCE_MANAGER', 'FLEET_MANAGER'), createMaintenanceTask);
router.put('/:id', authorize('ADMIN', 'MAINTENANCE_MANAGER', 'FLEET_MANAGER'), updateMaintenanceTask);
router.delete('/:id', authorize('ADMIN', 'MAINTENANCE_MANAGER'), deleteMaintenanceTask);

module.exports = router;
