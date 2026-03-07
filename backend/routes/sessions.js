const express = require('express');
const Session = require('../models/Session');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();
const SUPPORTED_EXERCISES = ['curl', 'press', 'squat', 'walking'];

// POST /sessions/start
router.post('/start', authMiddleware, roleMiddleware('patient'), async (req, res) => {
  try {
    const { prescriptionId, exerciseType } = req.body;
    const normalizedExercise = String(exerciseType || '').toLowerCase();

    if (!SUPPORTED_EXERCISES.includes(normalizedExercise) || normalizedExercise === 'walking') {
      return res.status(400).json({ 
        message: 'Only curl, press, or squat exercises are supported' 
      });
    }

    res.json({
      message: 'Session started',
      sessionId: 'temp_' + Date.now(),
      prescriptionId,
      exerciseType: normalizedExercise,
      startTime: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /sessions/complete - with pose landmarks
router.post('/complete', authMiddleware, roleMiddleware('patient'), async (req, res) => {
  try {
    const {
      prescriptionId,
      exerciseType,
      duration,
      reps,
      formAccuracy,
      formBreakdown,
      feedback,
      poseLandmarks,
      keyframeImages,
      confidenceScore
    } = req.body;

    const normalizedExercise = String(exerciseType || '').toLowerCase();

    if (normalizedExercise === 'walking') {
      return completeWalkingSession(req, res);
    }

    if (!SUPPORTED_EXERCISES.includes(normalizedExercise)) {
      return res.status(400).json({ 
        message: 'Only curl, press, squat, or walking exercises are supported' 
      });
    }

    // Calculate confidence interval
    const formVariance = calculateFormVariance(poseLandmarks);

    // Session marked as verified based on form accuracy
    const formAccuracyScore = formAccuracy || 0;
    const isVerified = formAccuracyScore > 0;  // Mark verified if form accuracy recorded

    const session = new Session({
      patientId: req.user.id,
      prescriptionId,
      exerciseType: normalizedExercise,
      exerciseName: normalizedExercise,
      duration,
      reps: reps || 0,
      formAccuracy: formAccuracyScore,
      formVariance,
      formBreakdown: formBreakdown || { depth: 0, alignment: 0, posture: 0 },
      feedback: feedback || [],
      verified: isVerified,
      verificationSource: 'ai',
      confidence: confidenceScore || 0,
      poseLandmarks: poseLandmarks || [],
      keyframeImages: keyframeImages || []
    });

    await session.save();

    res.status(201).json({
      ...session.toObject(),
      confidenceInterval: {
        low: Math.max(0, formAccuracy - formVariance),
        high: Math.min(100, formAccuracy + formVariance)
      }
    });
  } catch (error) {
    console.error('Session complete error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /sessions?patientId=
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { patientId, prescriptionId } = req.query;
    const query = {};

    if (patientId) {
      query.patientId = patientId;
    } else if (req.user.role === 'patient') {
      query.patientId = req.user.id;
    }

    if (prescriptionId) {
      query.prescriptionId = prescriptionId;
    }

    const sessions = await Session.find(query)
      .populate('prescriptionId', 'condition')
      .sort({ timestamp: -1 });
    
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /sessions/:id - Single session
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('patientId', 'name email')
      .populate('prescriptionId', 'condition');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Authorization check
    if (req.user.role === 'patient' && session.patientId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /sessions/:id/analysis - For doctor review
router.get('/:id/analysis', authMiddleware, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('patientId', 'name age condition')
      .populate('prescriptionId', 'condition plan');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Only doctor or patient can see
    if (req.user.role === 'patient' && session.patientId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (session.exerciseType === 'walking') {
      return res.json({
        sessionId: session._id,
        patientName: session.patientId.name,
        exerciseType: session.exerciseType,
        timestamp: session.timestamp,
        duration: session.duration,
        verificationSummary: session.verificationSummary,
        verificationEvents: session.verificationEvents,
        notes: session.notes
      });
    }

    // Calculate confidence interval
    const confidenceInterval = {
      low: Math.max(0, session.formAccuracy - session.formVariance),
      high: Math.min(100, session.formAccuracy + session.formVariance)
    };

    res.json({
      sessionId: session._id,
      patientName: session.patientId.name,
      exerciseType: session.exerciseType,
      timestamp: session.timestamp,
      reps: session.reps,
      duration: session.duration,
      
      // AI results
      aiFormAccuracy: session.formAccuracy,
      formBreakdown: session.formBreakdown,
      confidenceInterval,
      feedback: session.feedback,
      
      // PT review (if exists)
      ptReview: session.ptReview,
      deviation: session.ptReview?.deviation,
      
      // Audit trail
      poseLandmarksSample: session.poseLandmarks.slice(0, 10),
      keyframes: session.keyframeImages
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /sessions/:id/review - PT Review
router.post('/:id/review', authMiddleware, roleMiddleware('doctor'), async (req, res) => {
  try {
    const { ptScore, notes } = req.body;

    if (ptScore < 0 || ptScore > 100) {
      return res.status(400).json({ message: 'Score must be between 0-100' });
    }

    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const deviation = ptScore - session.formAccuracy;

    session.ptReview = {
      reviewed: true,
      ptScore,
      notes: notes || '',
      deviation,
      reviewedBy: req.user.id,
      reviewedAt: new Date()
    };

    await session.save();

    res.json({
      message: 'Review submitted',
      session: {
        aiScore: session.formAccuracy,
        ptScore,
        deviation,
        flagged: Math.abs(deviation) > 20 // Red flag if > 20% difference
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper: Calculate form variance (std dev) from landmarks
function calculateFormVariance(landmarks) {
  if (!landmarks || landmarks.length < 5) return 10; // Default variance

  const scores = landmarks.map(l => l.formAccuracy || 0);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  return Math.round(stdDev * 10) / 10; // Round to 1 decimal
}

async function completeWalkingSession(req, res) {
  try {
    const {
      prescriptionId,
      duration,
      distanceMeters,
      verificationEvents = [],
      notes,
      terminatedEarly,
      terminationReason
    } = req.body;

    if (!prescriptionId) {
      return res.status(400).json({ message: 'prescriptionId is required' });
    }

    if (!verificationEvents.length) {
      return res.status(400).json({ message: 'Verification events required for walking sessions' });
    }

    const normalizedEvents = verificationEvents.map((event, idx) => normalizeVerificationEvent(event, idx));
    const summary = summarizeVerification(normalizedEvents);
    const avgConfidence = normalizedEvents.reduce((sum, evt) => sum + (evt.confidence || 0), 0) /
      (normalizedEvents.length || 1);

    const session = new Session({
      patientId: req.user.id,
      prescriptionId,
      exerciseType: 'walking',
      exerciseName: 'Walking',
      duration: duration || 0,
      distanceMeters: distanceMeters || 0,
      verificationEvents: normalizedEvents,
      verificationSummary: summary,
      verified: summary.status === 'verified',
      verificationSource: 'face',
      confidence: Math.round(avgConfidence),
      feedback: [],
      notes: notes || '',
      terminatedEarly: Boolean(terminatedEarly),
      terminationReason: terminationReason || undefined
    });

    await session.save();

    return res.status(201).json(session);
  } catch (error) {
    console.error('Walking session error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
}

const SUPPORTED_VERIFICATION_STATUSES = ['passed', 'failed', 'skipped'];

function normalizeVerificationEvent(event = {}, index = 0) {
  const status = SUPPORTED_VERIFICATION_STATUSES.includes(event.status)
    ? event.status
    : 'failed';

  const rawConfidence = typeof event.confidence === 'number' ? event.confidence : 0;
  const confidencePercent = rawConfidence > 1 ? rawConfidence : rawConfidence * 100;

  return {
    checkpointSeconds: Number(event.checkpointSeconds) || 0,
    status,
    confidence: Math.max(0, Math.min(100, Math.round(confidencePercent))),
    capturedAt: event.capturedAt ? new Date(event.capturedAt) : new Date(),
    notes: event.notes || `Face check #${index + 1}`
  };
}

function summarizeVerification(events = []) {
  const summary = events.reduce((acc, event) => {
    acc.totalChecks += 1;
    if (event.status === 'passed') acc.passed += 1;
    if (event.status === 'failed') acc.failed += 1;
    if (event.status === 'skipped') acc.skipped += 1;
    return acc;
  }, { totalChecks: 0, passed: 0, failed: 0, skipped: 0 });

  const effectiveFailures = summary.failed + summary.skipped;
  if (!summary.totalChecks) {
    summary.status = 'pending';
  } else if (effectiveFailures === 0) {
    summary.status = 'verified';
  } else if (effectiveFailures === summary.totalChecks) {
    summary.status = 'unverified';
  } else {
    summary.status = 'partial';
  }

  return summary;
}

module.exports = router;
