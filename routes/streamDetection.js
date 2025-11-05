const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');

router.get('/stream-detection', (req, res) => {
  const trackName = req.query.trackName;
  if (!trackName) return res.status(400).send('trackName is required');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Allow streaming from behind a proxy
  res.flushHeaders();

  const process = spawn('python3', ['scripts/process_video.py', trackName]);

  process.stdout.on('data', (data) => {
    res.write(`data: ${data.toString().trim()}\n\n`);
    res.flush?.(); // Flush response if supported
  });

  process.stderr.on('data', (data) => {
    res.write(`data: ❌ [Python STDERR]: ${data.toString().trim()}\n\n`);
    res.flush?.();
  });

  process.on('close', (code) => {
    res.write(`data: ✅ Python script exited with code ${code}\n\n`);
    res.end();
  });

  req.on('close', () => {
    process.kill();
  });
});

module.exports = router;
