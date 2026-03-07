const mongoose = require('mongoose');

const decisionSchema = new mongoose.Schema({
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
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'
  },
  summary: {
    type: String,
    required: true
  },
  complianceData: {
    adherencePercentage: Number,
    sessionsCompleted: Number,
    sessionsRequired: Number
  },
  labValues: {
    type: Map,
    of: String
  },
  outcome: {
    type: String,
    required: true
  },
  nextSteps: String,
  timestamp: {
    type: Date,
    default: Date.now,
    immutable: true
  }
});

module.exports = mongoose.model('Decision', decisionSchema);
