// This file defines the routes for the fault report feature
const express = require('express');
const router = express.Router();
const faultReportController = require('../controllers/faultReportController');
const FaultReport = require('../models/FaultReport');

router.post('/fault-report', faultReportController.createFaultReport);

router.get('/fault-report', async (req, res) => {
    const { trackName } = req.query;
  
    if (!trackName) {
      return res.status(400).json({ error: 'trackName query parameter is required' });
    }
  
    try {
      const report = await FaultReport.findOne({ trackName });
  
      if (!report) {
        return res.status(404).json({ error: 'No fault report found for this track.' });
      }
  
      res.json(report);
    } catch (error) {
      console.error('Error fetching fault report:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

module.exports = router;
