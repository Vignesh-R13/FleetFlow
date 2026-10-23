const express = require('express');
const router = express.Router();
const {
  getCargoList,
  getCargoItem,
  createCargoItem,
  updateCargoItem,
  deleteCargoItem,
} = require('../controllers/cargoController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getCargoList);
router.get('/:id', getCargoItem);
router.post('/', authorize('ADMIN', 'FLEET_MANAGER'), createCargoItem);
router.put('/:id', authorize('ADMIN', 'FLEET_MANAGER'), updateCargoItem);
router.delete('/:id', authorize('ADMIN', 'FLEET_MANAGER'), deleteCargoItem);

module.exports = router;
