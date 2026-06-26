const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../auth');

// Apply auth middleware
router.use(authenticateToken);

// GET /api/visits - Search visit records globally or by patient
router.get('/', async (req, res) => {
  const { q, patient_id } = req.query;
  try {
    const visits = await db.visits.search(q, patient_id);
    res.json(visits);
  } catch (err) {
    console.error('Search visits error:', err);
    res.status(500).json({ error: 'Failed to search visit records' });
  }
});

// GET /api/visits/patient/:patientId - View complete visit history for a specific patient
router.get('/patient/:patientId', async (req, res) => {
  try {
    const patient = await db.patients.get(req.params.patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const visits = await db.visits.listByPatient(req.params.patientId);
    res.json(visits);
  } catch (err) {
    console.error('List patient visits error:', err);
    res.status(500).json({ error: 'Failed to fetch visit history' });
  }
});

// POST /api/visits/patient/:patientId - Record a new visit for a patient
router.post('/patient/:patientId', async (req, res) => {
  const { visit_date, complaint, treatment_given, treatment_status, duration_minutes, notes, services, next_appointment } = req.body;
  
  if (!visit_date || !complaint || !treatment_given || !duration_minutes) {
    return res.status(400).json({ 
      error: 'Visit date, complaint, treatment, and duration are required' 
    });
  }

  try {
    const patient = await db.patients.get(req.params.patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const newVisit = await db.visits.create(req.params.patientId, {
      visit_date,
      complaint,
      treatment_given,
      treatment_status: treatment_status || 'Ongoing',
      duration_minutes: Number(duration_minutes),
      notes: notes || '',
      services: services || [],
      next_appointment: next_appointment || null
    });

    res.status(201).json(newVisit);
  } catch (err) {
    console.error('Create visit error:', err);
    res.status(500).json({ error: 'Failed to record visit' });
  }
});

// DELETE /api/visits/:id - Soft delete a visit record
router.delete('/:id', async (req, res) => {
  try {
    const success = await db.visits.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Visit record not found' });
    }
    res.json({ message: 'Visit record soft-deleted successfully' });
  } catch (err) {
    console.error('Delete visit error:', err);
    res.status(500).json({ error: 'Failed to delete visit record' });
  }
});

module.exports = router;
