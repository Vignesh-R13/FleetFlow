const express = require('express');
const router = express.Router();
const { register, login, logout, getMe } = require('../controllers/authController');
const { registerRules, loginRules } = require('../validators/authValidators');
const { protect } = require('../middleware/auth');

router.post('/register', registerRules, register);
router.post('/login', loginRules, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;
