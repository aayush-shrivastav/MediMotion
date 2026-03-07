const express = require('express');
const Decision = require('../models/Decision');
const Notification = require('../models/Notification');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /decisions
router.post('/', authMiddleware, roleMiddleware('doctor'), async (req, res) => {
  try {
    const {
      patientId,
      prescriptionId,
      summary,
      complianceData,
      labValues,
      outcome,
      nextSteps
    } = req.body;

    const decision = new Decision({
      doctorId: req.user.id,
      patientId,
      prescriptionId,
      summary,
      complianceData,
      labValues,
      outcome,
      nextSteps
    });

    await decision.save();

    // Create notification for patient
    await Notification.create({
      userId: patientId,
      type: 'decision_recorded',
      title: 'Treatment Decision Recorded',
      message: 'Your doctor has recorded a treatment decision'
    });

    res.status(201).json(decision);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /decisions?patientId=
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.query;
    const query = {};

    if (patientId) {
      query.patientId = patientId;
    }

    if (req.user.role === 'patient') {
      query.patientId = req.user.id;
    } else if (req.user.role === 'doctor') {
      query.doctorId = req.user.id;
    }

    const decisions = await Decision.find(query)
      .populate('doctorId', 'name')
      .populate('patientId', 'name')
      .sort({ timestamp: -1 });
    
    res.json(decisions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
