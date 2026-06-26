const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../auth');

// Apply auth middleware
router.use(authenticateToken);

// GET /api/reports/dashboard - Dashboard overview stats
router.get('/dashboard', async (req, res) => {
  try {
    const summary = await db.reports.getSystemDashboardOverview();
    res.json(summary);
  } catch (err) {
    console.error('System dashboard overview error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard overview statistics' });
  }
});

// GET /api/reports/scheduled-followups - Patients with follow-up required and upcoming appointment
router.get('/scheduled-followups', async (req, res) => {
  try {
    const patients = await db.reports.getScheduledFollowupPatients();
    res.json(patients);
  } catch (err) {
    console.error('Scheduled follow-ups error:', err);
    res.status(500).json({ error: 'Failed to fetch scheduled follow-up patients' });
  }
});



// GET /api/reports/active-patients - Patients with current follow-up required status
router.get('/active-patients', async (req, res) => {
  try {
    const patients = await db.reports.getActivePatients();
    res.json(patients);
  } catch (err) {
    console.error('Active patients error:', err);
    res.status(500).json({ error: 'Failed to fetch active patients' });
  }
});

// GET /api/reports/monthly - Monthly visit count report and service distribution
router.get('/monthly', async (req, res) => {
  try {
    const { year } = req.query;
    const report = await db.reports.getMonthlyReportData(year);
    res.json(report);
  } catch (err) {
    console.error('Monthly reports data error:', err);
    res.status(500).json({ error: 'Failed to fetch monthly reports statistics' });
  }
});

module.exports = router;
