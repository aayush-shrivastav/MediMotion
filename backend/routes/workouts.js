const express = require('express');
const Session = require('../models/Session');
const Prescription = require('../models/Prescription');
const Notification = require('../models/Notification');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/workouts/verify
 * Receive AI-verified workout results from client
 */
router.post('/verify', authMiddleware, roleMiddleware('patient'), async (req, res) => {
  try {
    const {
      prescriptionId,
      exerciseType,
      reps,
      durationSeconds,
      formAccuracy,
      feedback,
      confidenceScore,
      timestamp
    } = req.body;

    // Validate required fields
    if (!prescriptionId || !exerciseType || formAccuracy === undefined) {
      return res.status(400).json({ 
        message: 'Missing required fields: prescriptionId, exerciseType, formAccuracy' 
      });
    }

    // Verify prescription exists and belongs to user
    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    if (prescription.patientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access to prescription' });
    }

    // Create session record
    const session = new Session({
      patientId: req.user.id,
      prescriptionId,
      exerciseType,
      exerciseName: exerciseType,
      duration: Math.floor((durationSeconds || 0) / 60), // Convert to minutes
      postureScore: formAccuracy,
      // Verified only if BOTH confidence >= 70% AND form accuracy >= 70%
      verified: confidenceScore >= 0.7 && formAccuracy >= 70,
      confidence: Math.round(confidenceScore * 100),
      formAccuracy,
      verificationSource: 'ai',
      notes: feedback ? feedback.join('; ') : ''
    });

    await session.save();

    // Calculate compliance
    const complianceStats = await calculateCompliance(req.user.id, prescriptionId);

    // Check for notifications triggers
    await checkNotificationTriggers(
      req.user.id, 
      prescription, 
      formAccuracy, 
      complianceStats
    );

    res.status(201).json({
      message: 'Workout verified successfully',
      session,
      compliance: complianceStats,
      verified: session.verified,
      formAccuracy,
      feedback
    });

  } catch (error) {
    console.error('Workout verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Calculate patient compliance for a prescription
 */
async function calculateCompliance(patientId, prescriptionId) {
  try {
    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) return { percentage: 0, sessionsCompleted: 0 };

    // Get all verified sessions for this prescription
    const sessions = await Session.find({
      patientId,
      prescriptionId,
      verified: true
    });

    const totalSessions = sessions.length;

    // Calculate expected sessions based on duration
    const prescriptionDuration = prescription.duration; // days
    const startDate = new Date(prescription.startDate);
    const currentDate = new Date();
    const daysElapsed = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
    const daysActive = Math.min(daysElapsed, prescriptionDuration);

    // Expected sessions (assuming 1 per day minimum)
    const expectedSessions = Math.max(daysActive, 1);

    // Compliance percentage
    const percentage = Math.min(Math.round((totalSessions / expectedSessions) * 100), 100);

    // Calculate streak
    const streak = await calculateStreak(patientId, prescriptionId);

    return {
      percentage,
      sessionsCompleted: totalSessions,
      expectedSessions,
      streak,
      lastSession: sessions.length > 0 ? sessions[sessions.length - 1].timestamp : null
    };

  } catch (error) {
    console.error('Compliance calculation error:', error);
    return { percentage: 0, sessionsCompleted: 0 };
  }
}

/**
 * Calculate current streak of consecutive days with sessions
 */
async function calculateStreak(patientId, prescriptionId) {
  try {
    const sessions = await Session.find({
      patientId,
      prescriptionId,
      verified: true
    }).sort({ timestamp: -1 });

    if (sessions.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < sessions.length; i++) {
      const sessionDate = new Date(sessions[i].timestamp);
      sessionDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((currentDate - sessionDate) / (1000 * 60 * 60 * 24));

      if (daysDiff === streak) {
        streak++;
        currentDate = new Date(sessionDate);
      } else if (daysDiff > streak) {
        break;
      }
    }

    return streak;
  } catch (error) {
    console.error('Streak calculation error:', error);
    return 0;
  }
}

/**
 * Check and create notifications based on workout results
 */
async function checkNotificationTriggers(patientId, prescription, formAccuracy, complianceStats) {
  try {
    const notifications = [];

    // 1. Low form accuracy warning
    if (formAccuracy < prescription.minimumPostureScore || formAccuracy < 70) {
      notifications.push({
        userId: patientId,
        type: 'compliance_warning',
        title: 'Form Accuracy Below Threshold',
        message: `Your exercise form scored ${formAccuracy}%. Please review proper technique or consult your doctor.`,
        relatedTo: 'session',
        relatedId: prescription._id
      });
    }

    // 2. Milestone achievements
    if (complianceStats.streak === 7) {
      notifications.push({
        userId: patientId,
        type: 'session_reminder',
        title: '7-Day Streak! 🎉',
        message: 'Congratulations! You\'ve maintained a 7-day exercise streak.',
        relatedTo: 'achievement',
        relatedId: prescription._id
      });
    } else if (complianceStats.streak === 14) {
      notifications.push({
        userId: patientId,
        type: 'session_reminder',
        title: '14-Day Streak! 🏆',
        message: 'Amazing! Two weeks of consistent exercise.',
        relatedTo: 'achievement',
        relatedId: prescription._id
      });
    }

    // 3. Excellent form recognition
    if (formAccuracy >= 90) {
      notifications.push({
        userId: patientId,
        type: 'info',
        title: 'Excellent Form',
        message: `Great job! Your form scored ${formAccuracy}%. Keep it up!`,
        relatedTo: 'session',
        relatedId: prescription._id
      });
    }

    // 4. Compliance threshold reached
    if (complianceStats.percentage >= prescription.complianceThreshold) {
      const existingNotif = await Notification.findOne({
        userId: patientId,
        title: 'Compliance Goal Reached',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      if (!existingNotif) {
        notifications.push({
          userId: patientId,
          type: 'session_reminder',
          title: 'Compliance Goal Reached',
          message: `You've reached ${complianceStats.percentage}% compliance! Excellent progress.`,
          relatedTo: 'prescription',
          relatedId: prescription._id
        });
      }
    }

    // Create all notifications
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // Notify doctor if form is consistently poor
    if (formAccuracy < 60) {
      await Notification.create({
        userId: prescription.doctorId,
        type: 'compliance_warning',
        title: 'Patient Form Concern',
        message: `Patient showed low form accuracy (${formAccuracy}%) in recent exercise session.`,
        relatedTo: 'session',
        relatedId: prescription._id
      });
    }

  } catch (error) {
    console.error('Notification trigger error:', error);
  }
}

/**
 * GET /api/workouts/stats
 * Get workout statistics for patient
 */
router.get('/stats', authMiddleware, roleMiddleware('patient'), async (req, res) => {
  try {
    const { prescriptionId } = req.query;

    if (!prescriptionId) {
      return res.status(400).json({ message: 'prescriptionId required' });
    }

    const stats = await calculateCompliance(req.user.id, prescriptionId);

    // Get recent sessions
    const recentSessions = await Session.find({
      patientId: req.user.id,
      prescriptionId,
      verified: true
    })
      .sort({ timestamp: -1 })
      .limit(10);

    // Calculate average form accuracy
    const avgFormAccuracy = recentSessions.length > 0
      ? Math.round(
          recentSessions.reduce((sum, s) => sum + s.postureScore, 0) / recentSessions.length
        )
      : 0;

    res.json({
      compliance: stats,
      avgFormAccuracy,
      recentSessions,
      totalWorkouts: recentSessions.length
    });

  } catch (error) {
    console.error('Stats retrieval error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
