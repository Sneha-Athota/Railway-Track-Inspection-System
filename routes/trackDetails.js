// This route handles fetching details of a specific track based on the track number.   
const express = require('express');
const router = express.Router();
const FaultReport = require('../models/FaultReport');

router.get('/track-details/:track', async (req, res) => {
  try {
    const trackName = `Track ${req.params.track}`;
    const report = await FaultReport.findOne({ trackName });
    if (!report) {
      return res.status(404).json({ error: 'Track not found' });
    }
    res.json(report);
  } catch (error) {
    console.error('Error fetching track details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
