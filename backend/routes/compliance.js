const express = require('express');
const Session = require('../models/Session');
const Prescription = require('../models/Prescription');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /compliance/patient/:id
router.get('/patient/:id', authMiddleware, async (req, res) => {
  try {
    const patientId = req.params.id;

    const activePrescription = await Prescription.findOne({
      patientId,
      status: 'active',
      endDate: { $gte: new Date() }
    });

    if (!activePrescription) {
      return res.json({
        adherencePercentage: 0,
        streak: 0,
        riskStatus: 'no_active_prescription',
        sessionsCompleted: 0,
        sessionsRequired: 0
      });
    }

    const sessions = await Session.find({
      patientId,
      prescriptionId: activePrescription._id
    });

    const totalSessions = sessions.length;
    const verifiedSessions = sessions.filter(session => session.verified).length;

    const daysSinceStart = Math.floor(
      (Date.now() - activePrescription.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    // For MVP: Show progress for this week (current 7 days)
    const sessionsRequired = activePrescription.plan.weeklyGoal || 1;
    const sessionsCompleted = totalSessions;

    // Calculate streak
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const nextDate = new Date(checkDate);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const hasSession = sessions.some(s => {
        const sessionDate = new Date(s.timestamp);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === checkDate.getTime();
      });
      
      if (hasSession) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    // For MVP: on_track if at least sessions meet weekly goal, at_risk if below
    const adherencePercentage = Math.min(100, Math.round((sessionsCompleted / sessionsRequired) * 100));
    const verificationRate = totalSessions > 0
      ? Math.round((verifiedSessions / totalSessions) * 100)
      : 0;

    const riskStatus = sessionsCompleted >= sessionsRequired
      ? 'on_track'
      : 'at_risk';

    res.json({
      patientId,
      adherencePercentage,
      streak,
      riskStatus,
      sessionsCompleted,
      verifiedSessions,
      verificationRate,
      sessionsRequired,
      prescription: {
        id: activePrescription._id,
        condition: activePrescription.condition,
        complianceThreshold: activePrescription.complianceThreshold,
        weeklyGoal: activePrescription.plan.weeklyGoal
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /compliance/summary/:doctorId
router.get('/summary/:doctorId', authMiddleware, async (req, res) => {
  try {
    const doctorId = req.params.doctorId;

    const prescriptions = await Prescription.find({
      doctorId,
      status: 'active'
    }).populate('patientId', 'name email');

  const summaries = await Promise.all(
    prescriptions.map(async (prescription) => {
      const sessions = await Session.find({
        patientId: prescription.patientId._id,
        prescriptionId: prescription._id,
        verified: true
      });

      const daysSinceStart = Math.floor(
        (Date.now() - prescription.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const weeksElapsed = Math.max(1, Math.ceil(daysSinceStart / 7));
      const sessionsRequired = weeksElapsed * prescription.plan.weeklyGoal;
      const sessionsCompleted = sessions.length;
      const adherencePercentage = Math.min(100, Math.round((sessionsCompleted / sessionsRequired) * 100));

      // Calculate average form accuracy from verified sessions
      const avgFormAccuracy = sessions.length > 0
        ? Math.round(sessions.reduce((sum, s) => sum + (s.formAccuracy || s.postureScore || 0), 0) / sessions.length)
        : 0;

      const riskStatus = adherencePercentage >= prescription.complianceThreshold
        ? 'on_track'
        : 'at_risk';

      return {
        patient: prescription.patientId,
        condition: prescription.condition,
        adherencePercentage,
        riskStatus,
        sessionsCompleted,
        sessionsRequired,
        avgFormAccuracy,
        prescription
      };
    })
  );

    res.json(summaries);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
