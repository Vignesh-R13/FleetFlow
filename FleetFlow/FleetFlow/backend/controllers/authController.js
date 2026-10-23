const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ success: false, message: 'An account with that email already exists.' });
  }

  // Self-registration is intentionally restricted to CAPTAIN by default.
  // Admins should be the ones promoting users to other roles via the Users management screen.
  const allowedSelfRoles = ['CAPTAIN'];
  const finalRole = allowedSelfRoles.includes(role) ? role : 'CAPTAIN';

  const user = await User.create({ name, email, password, role: finalRole });
  const token = generateToken(user._id);

  res.status(201).json({ success: true, data: { user: user.toSafeObject(), token } });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const token = generateToken(user._id);
  res.json({ success: true, data: { user: user.toSafeObject(), token } });
});

// POST /api/auth/logout
// JWTs are stateless, so "logout" is a client-side token discard. This endpoint
// exists for a consistent API surface and as a hook point for future token blacklisting.
const logout = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeObject() } });
});

module.exports = { register, login, logout, getMe };
