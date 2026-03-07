const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const { registerFace, verifyFace } = require('../services/faceService');

const router = express.Router();

const parseBase64Image = (imageString = '') => {
  if (!imageString) {
    return null;
  }
  const matches = imageString.match(/^data:(?<mime>.*?);base64,(?<data>.*)$/);
  const base64Data = matches ? matches.groups.data : imageString;
  return Buffer.from(base64Data, 'base64');
};

router.post('/register', authMiddleware, async (req, res) => {
  try {
    const { image, userId } = req.body;
    const targetUserId = userId && req.user.role === 'doctor' ? userId : req.user.id;

    if (!image) {
      return res.status(400).json({ message: 'Face image required' });
    }

    const buffer = parseBase64Image(image);
    if (!buffer) {
      return res.status(400).json({ message: 'Invalid image format' });
    }

    await registerFace(targetUserId, buffer);
    await User.findByIdAndUpdate(targetUserId, { faceVerified: true });

    res.json({ success: true, message: 'Face registered successfully' });
  } catch (error) {
    const status = error.name === 'FaceServiceError'
      ? (error.status >= 500 ? 502 : error.status)
      : 400;
    res.status(status).json({ message: 'Face registration failed', detail: error.message });
  }
});

router.post('/verify', authMiddleware, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ message: 'Face image required' });
    }

    const buffer = parseBase64Image(image);
    if (!buffer) {
      return res.status(400).json({ message: 'Invalid image format' });
    }

    const result = await verifyFace(req.user.id, buffer);
    res.json({
      verified: result.verified,
      confidence: result.confidence
    });
  } catch (error) {
    const status = error.name === 'FaceServiceError'
      ? (error.status >= 500 ? 502 : error.status)
      : 400;
    res.status(status).json({ message: 'Face verification failed', detail: error.message });
  }
});

module.exports = router;
