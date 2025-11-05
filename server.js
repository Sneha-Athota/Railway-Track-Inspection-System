const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const mongoose = require('mongoose');

const app = express();

const PORT = process.env.PORT || 5001;
const mongoURI = process.env.MONGODB_URI;



app.use(express.static(path.join(__dirname, 'public')));
app.use(cors()); // Allow frontend requests
app.use(express.json()); // Parse JSON requests


const faultReportRoutes = require('./routes/faultReport');
app.use('/api', faultReportRoutes);

const sectionRoutes = require('./routes/sections');
app.use('/api', sectionRoutes);

const trackDetailsRoutes = require('./routes/trackDetails');
app.use('/api', trackDetailsRoutes);

const notificationsRoutes = require('./routes/notifications');
app.use('/api', notificationsRoutes);

const uploadVideoRoute = require('./routes/uploadVideo');
app.use('/api', uploadVideoRoute);

const blobAccessRoutes = require('./routes/blobAccess');
app.use('/api', blobAccessRoutes);

const runScriptRoute = require('./routes/runDetectionScript');
app.use('/api', runScriptRoute);

const streamDetection = require('./routes/streamDetection');
app.use('/api', streamDetection);

const compression = require('compression');

app.use((req, res, next) => {
  if (req.url === '/api/stream-detection') {
    return next(); // skip compression for SSE
  }
  compression()(req, res, next);
});


mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

  
// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});