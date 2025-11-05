const express = require('express');
const router = express.Router();
const FaultReport = require('../models/FaultReport');

router.get('/notification', async (req, res) => {
  try {
    const reports = await FaultReport.find({}, 'trackName numberofFaults faultImages').lean();

    const notifications = reports
      .filter(report =>
        Array.isArray(report.faultImages) &&
        report.faultImages.length > 0 &&
        report.numberofFaults > 0
      )
      .map(report => {
        const latestImage = report.faultImages.reduce((latest, current) =>
          current.timestamp > latest.timestamp ? current : latest
        );

        // Format timestamp to readable date-time
        const date = new Date(latestImage.timestamp);
        const formattedDateTime = date.toLocaleString('en-GB', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });

        return {
          track: report.trackName,
          issue: `${report.numberofFaults} faults detected at ${formattedDateTime}`,
          timestamp: latestImage.timestamp
        };
      });

    res.json({ faults: notifications });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
