const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
  vendorId: {
    type: String,
    required: true,
  },
  fruit: {
    type: String,
    required: true,
    trim: true,
  },
  quality: {
    type: String,
    required: true,
    enum: ['Fresh', 'Rotten', 'Unknown'],
    default: 'Unknown',
  },
  isFresh: {
    type: Boolean,
    required: true,
  },
  imageOriginalName: {
    type: String,
  },
}, { timestamps: true });

// Index for fast vendor queries
scanSchema.index({ vendor: 1, createdAt: -1 });

module.exports = mongoose.model('Scan', scanSchema);
