const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /users/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-passwordHash')
      .populate('assignedDoctor', 'name email');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /users?role=patient
router.get('/', authMiddleware, roleMiddleware('doctor', 'admin'), async (req, res) => {
  try {
    const { role, assignedOnly } = req.query;
    const query = {};
    
    if (role) {
      query.role = role;
    }
    
    const restrictToAssigned = assignedOnly !== 'false' && assignedOnly !== '0';

    if (req.user.role === 'doctor' && restrictToAssigned) {
      query.assignedDoctor = req.user.id;
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .populate('assignedDoctor', 'name');
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /users (Admin only)
router.post('/', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { name, email, password, role, assignedDoctor } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      passwordHash: hashedPassword,
      role,
      assignedDoctor
    });

    await user.save();

    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
