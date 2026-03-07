const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['patient', 'doctor', 'admin'],
    required: true
  },
  age: {
    type: Number,
    required: function() {
      return this.role === 'patient';
    }
  },
  sex: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: function() {
      return this.role === 'patient';
    }
  },
  condition: {
    type: String,
    required: function() {
      return this.role === 'patient';
    }
  },
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  faceVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
