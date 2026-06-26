const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../auth');

// Apply auth middleware to all patient routes
router.use(authenticateToken);

// GET /api/patients - List patients (with optional search query q)
router.get('/', async (req, res) => {
  try {
    const q = req.query.q || '';
    const patients = await db.patients.list(q);
    res.json(patients);
  } catch (err) {
    console.error('List patients error:', err);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// GET /api/patients/:id - Patient details and dashboard overview
router.get('/:id', async (req, res) => {
  try {
    const patient = await db.patients.get(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const dashboard = await db.reports.getPatientDashboardSummary(req.params.id);
    
    res.json({
      ...patient,
      dashboard
    });
  } catch (err) {
    console.error('Get patient error:', err);
    res.status(500).json({ error: 'Failed to fetch patient details' });
  }
});

// POST /api/patients - Register a new patient
router.post('/', async (req, res) => {
  const { name, age, gender, contact_number, address, medical_history, registration_date } = req.body;
  if (!name || !age || !gender || !contact_number) {
    return res.status(400).json({ error: 'Name, age, gender, and contact number are required' });
  }

  try {
    const newPatient = await db.patients.create({
      name,
      age: Number(age),
      gender,
      contact_number,
      address: address || '',
      medical_history: medical_history || '',
      registration_date
    });
    res.status(201).json(newPatient);
  } catch (err) {
    console.error('Create patient error:', err);
    res.status(500).json({ error: 'Failed to register patient' });
  }
});

// PUT /api/patients/:id - Update patient profile
router.put('/:id', async (req, res) => {
  const { name, age, gender, contact_number, address, medical_history, registration_date } = req.body;
  if (!name || !age || !gender || !contact_number) {
    return res.status(400).json({ error: 'Name, age, gender, and contact number are required' });
  }

  try {
    const patient = await db.patients.get(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const updatedPatient = await db.patients.update(req.params.id, {
      name,
      age: Number(age),
      gender,
      contact_number,
      address: address || '',
      medical_history: medical_history || '',
      registration_date
    });
    res.json(updatedPatient);
  } catch (err) {
    console.error('Update patient error:', err);
    res.status(500).json({ error: 'Failed to update patient profile' });
  }
});

// DELETE /api/patients/:id - Soft delete patient
router.delete('/:id', async (req, res) => {
  try {
    const patient = await db.patients.get(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    await db.patients.delete(req.params.id);
    res.json({ message: 'Patient profile soft-deleted successfully' });
  } catch (err) {
    console.error('Delete patient error:', err);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

module.exports = router;
