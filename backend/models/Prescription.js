const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  condition: {
    type: String,
    required: true
  },
  regimen: {
    name: String, // e.g., "Knee Rehabilitation - Phase 1"
    frequency: String, // e.g., "1 session daily"
    minimumPostureScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 70
    },
    exercises: [{
      name: String, // e.g., "Knee Flexion"
      sets: Number,
      reps: Number,
      duration: Number, // in seconds
      instructions: String,
      videoUrl: String // Placeholder for future video integration
    }]
  },
  plan: {
    exerciseType: String,
    weeklyGoal: { type: Number, default: 1 },  // Default: 1 session per week (MVP)
    sessionDuration: Number,
    instructions: String
  },
  duration: {
    type: Number,
    required: true
  },
  complianceThreshold: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  notes: String,
  status: {
    type: String,
    enum: ['active', 'completed', 'terminated'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  }
});

module.exports = mongoose.model('Prescription', prescriptionSchema);
