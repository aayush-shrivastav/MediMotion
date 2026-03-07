const express = require('express');
const Prescription = require('../models/Prescription');
const Notification = require('../models/Notification');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /prescriptions
router.post('/', authMiddleware, roleMiddleware('doctor'), async (req, res) => {
  try {
    const {
      patientId,
      condition,
      regimen,
      plan,
      duration,
      complianceThreshold,
      startDate,
      notes
    } = req.body;

    console.log('POST /prescriptions received:', {
      patientId,
      condition,
      regimen,
      plan,
      duration,
      complianceThreshold,
      startDate,
      notes
    });

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + duration);

    const prescription = new Prescription({
      doctorId: req.user.id,
      patientId,
      condition,
      regimen,
      plan,
      duration,
      complianceThreshold,
      startDate,
      endDate,
      notes
    });

    await prescription.save();
    console.log('Prescription saved successfully:', prescription);

    // Create notification for patient
    await Notification.create({
      userId: patientId,
      type: 'prescription_issued',
      title: 'New Prescription Issued',
      message: `Your doctor has issued a new prescription for ${condition}`
    });

    res.status(201).json(prescription);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /prescriptions/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('doctorId', 'name')
      .populate('patientId', 'name');
    
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    res.json(prescription);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /prescriptions?patientId=
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.query;
    const query = {};

    if (patientId) {
      query.patientId = patientId;
    } else if (req.user.role === 'patient') {
      query.patientId = req.user.id;
    } else if (req.user.role === 'doctor') {
      query.doctorId = req.user.id;
    }

    const prescriptions = await Prescription.find(query)
      .populate('doctorId', 'name')
      .populate('patientId', 'name')
      .sort({ createdAt: -1 });
    
    res.json(prescriptions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
