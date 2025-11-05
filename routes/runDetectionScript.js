// Example in routes/runDetection.js
const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');

router.get('/run-detection', (req, res) => {
  const trackName = req.query.trackName;
  if (!trackName) {
    return res.status(400).json({ error: 'Missing trackName' });
  }

  const python = spawn('python3', ['scripts/process_video.py', trackName]);

  let outputLogs = '';
  let errorLogs = '';

  python.stdout.on('data', (data) => {
    outputLogs += data.toString();
    console.log(`📥 [Python STDOUT]: ${data.toString()}`);
  });

  python.stderr.on('data', (data) => {
    errorLogs += data.toString();
    console.error(`❌ [Python STDERR]: ${data.toString()}`);
  });

  python.on('close', (code) => {
    if (code === 0) {
      console.log(`✅ Python script exited successfully.`);
      res.json({ status: 'Execution completed successfully.', logs: outputLogs });
    } else {
      console.error(`❌ Python script failed with code ${code}`);
      res.status(500).json({
        status: 'Python script failed',
        exitCode: code,
        error: errorLogs || 'Unknown error occurred',
      });
    }
  });
});

module.exports = router;
