const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  documentType: {
    type: String,
    enum: ['aadhaar', 'passport', 'pan', 'driving_license', 'voter_id', 'other'],
    required: true
  },
  extractedData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  imageUrl: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  language: String,
  confidence: Number
});

module.exports = mongoose.model('Document', documentSchema);
