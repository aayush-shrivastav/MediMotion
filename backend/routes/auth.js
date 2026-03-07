const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { registerFace } = require('../services/faceService');

const router = express.Router();

const parseBase64Image = (imageString = '') => {
  if (!imageString) {
    return null;
  }

  const matches = imageString.match(/^data:(?<mime>.*?);base64,(?<data>.*)$/);
  const base64Data = matches ? matches.groups.data : imageString;
  return Buffer.from(base64Data, 'base64');
};

// POST /auth/signup
router.post('/signup', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'patient',
      assignedDoctor,
      age,
      sex,
      condition,
      faceImage
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!faceImage) {
      return res.status(400).json({ message: 'Face image is required for signup' });
    }

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
      age,
      sex,
      condition,
      assignedDoctor: role === 'patient' ? assignedDoctor : undefined
    });

    const imageBuffer = parseBase64Image(faceImage);
    if (!imageBuffer) {
      return res.status(400).json({ message: 'Invalid face image format' });
    }

    try {
      await registerFace(user._id.toString(), imageBuffer);
      user.faceVerified = true;
    } catch (err) {
      return res.status(400).json({
        message: 'Face registration failed',
        detail: err.message || 'Unable to verify face image'
      });
    }

    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        faceVerified: user.faceVerified,
        assignedDoctor: user.assignedDoctor
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate('assignedDoctor', 'name');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordHash = user.passwordHash || user.password;
    if (!passwordHash) {
      return res.status(500).json({ message: 'User password not set' });
    }

    const isMatch = await bcrypt.compare(password, passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        faceVerified: user.faceVerified,
        assignedDoctor: user.assignedDoctor
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-passwordHash')
      .populate('assignedDoctor', 'name');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
