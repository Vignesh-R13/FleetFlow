const express = require('express');
const router = express.Router();
const { getAlerts, markAsRead, resolveAlert } = require('../controllers/alertController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getAlerts);
router.put('/:id/read', markAsRead);
router.put('/:id/resolve', resolveAlert);

module.exports = router;
