// Fault Report Controller
const FaultReport = require('../models/FaultReport');

exports.createFaultReport = async (req, res) => {
  try {
    const report = new FaultReport(req.body);
    await report.save();
    console.log('📥 Received and stored fault report:', report);
    res.status(201).json({ message: '✅ Fault report saved successfully.' });
  } catch (error) {
    console.error('❌ Error saving fault report:', error);
    res.status(500).json({ message: '❌ Failed to save fault report.' });
  }
};
