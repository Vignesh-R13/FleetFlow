const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES } = require('../models/User');

// GET /api/users
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort('name');
  res.json({ success: true, data: users.map((u) => u.toSafeObject()) });
});

// PUT /api/users/:id  — update role / active status (admin only)
const updateUser = asyncHandler(async (req, res) => {
  const { role, isActive } = req.body;
  const updates = {};
  if (role) {
    if (!ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    updates.role = role;
  }
  if (typeof isActive === 'boolean') updates.isActive = isActive;

  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  res.json({ success: true, data: user.toSafeObject() });
});

module.exports = { getUsers, updateUser };
