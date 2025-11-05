
const mongoose = require('mongoose');

const FaultImageSchema = new mongoose.Schema({
  image: { type: String, required: true },
  description: { type: String, required: true },
  timestamp: { type: Number, required: true }
}, { _id: false });

const FaultReportSchema = new mongoose.Schema({
  trackName: { type: String, required: true },
  numberofFaults: { type: Number, required: true },
  faultImages: { type: [FaultImageSchema], required: true },
  imageContainer: { type: String, required: true },
  trackVideo: { type: String, required: false },
  videoContainer: { type: String, required: false }
}, { timestamps: true });

module.exports = mongoose.model('FaultReport', FaultReportSchema);
