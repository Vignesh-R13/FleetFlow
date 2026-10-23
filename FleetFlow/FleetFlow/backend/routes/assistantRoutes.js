const express = require('express');
const router = express.Router();
const { ask, getInsights, commandSummary } = require('../controllers/assistantController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/ask', ask);
router.get('/insights', getInsights);
router.get('/command-summary', commandSummary);

module.exports = router;
