const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const FaultReport = require('../models/FaultReport');

router.get('/sections', asyncHandler(async (req, res) => {
  const reports = await FaultReport.find();

  // Aggregate faults per track
  const sectionMap = {};

  reports.forEach(report => {
    const track = report.trackName;
    if (!sectionMap[track]) {
      sectionMap[track] = 0;
    }
    sectionMap[track] += report.numberofFaults;
  });

  const sectionData = Object.keys(sectionMap).map((track, index) => ({
    id: index + 1,
    track: track,
    faults: sectionMap[track]
  }));

  res.json(sectionData);
}));

module.exports = router;
