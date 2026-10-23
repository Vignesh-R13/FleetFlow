const express = require('express');
const router = express.Router();
const {
  getVoyages,
  getVoyage,
  createVoyage,
  updateVoyage,
  deleteVoyage,
} = require('../controllers/voyageController');
const { voyageRules } = require('../validators/voyageValidators');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getVoyages);
router.get('/:id', getVoyage);
router.post('/', authorize('ADMIN', 'FLEET_MANAGER'), voyageRules, createVoyage);
router.put('/:id', authorize('ADMIN', 'FLEET_MANAGER', 'CAPTAIN'), updateVoyage);
router.delete('/:id', authorize('ADMIN', 'FLEET_MANAGER'), deleteVoyage);

module.exports = router;
