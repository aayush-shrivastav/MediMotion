const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
    required: true
  },
  exerciseType: {
    type: String,
    required: true,
    enum: ['curl', 'press', 'squat', 'walking']
  },
  exerciseName: {
    type: String,
    default: 'Squat'
  },
  distanceMeters: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number,
    required: true
  },
  reps: {
    type: Number,
    default: 0
  },
  formAccuracy: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  formVariance: {
    type: Number,
    default: 0 // Standard deviation for confidence interval
  },
  formBreakdown: {
    depth: { type: Number, default: 0 },
    alignment: { type: Number, default: 0 },
    posture: { type: Number, default: 0 }
  },
  verified: {
    type: Boolean,
    default: false
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  verificationSource: {
    type: String,
    enum: ['ai', 'face', 'pending'],
    default: 'pending'
  },
  verificationEvents: [{
    checkpointSeconds: Number,
    status: {
      type: String,
      enum: ['passed', 'failed', 'skipped']
    },
    confidence: Number,
    capturedAt: Date,
    notes: String
  }],
  verificationSummary: {
    totalChecks: { type: Number, default: 0 },
    passed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['verified', 'partial', 'unverified', 'pending'],
      default: 'pending'
    }
  },
  terminatedEarly: {
    type: Boolean,
    default: false
  },
  terminationReason: {
    type: String
  },
  // Pose data for audit trail
  poseLandmarks: [{
    timestamp: Number, // ms from session start
    landmarks: [{
      x: Number,
      y: Number,
      z: Number,
      visibility: Number
    }],
    formAccuracy: Number
  }],
  
  // Keyframe images for visual verification
  keyframeImages: [String], // base64-encoded PNG
  
  // PT review for ground truth validation
  ptReview: {
    reviewed: { type: Boolean, default: false },
    ptScore: Number,
    notes: String,
    deviation: Number, // ptScore - AI formAccuracy
    reviewedBy: mongoose.Schema.Types.ObjectId,
    reviewedAt: Date
  },
  
  feedback: [String],
  timestamp: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  notes: String
});

module.exports = mongoose.model('Session', sessionSchema);
