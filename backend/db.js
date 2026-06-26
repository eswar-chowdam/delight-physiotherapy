const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

let dbInstance = null;
let isSqlite = false;

// Paths
const DB_FILE_SQLITE = path.join(__dirname, 'database.sqlite');
const DB_FILE_JSON = path.join(__dirname, 'database.json');

// Default admin details
const DEFAULT_ADMIN = {
  username: 'admin',
  password_plain: 'admin123',
  name: 'Delight Physiotherapy Admin',
  role: 'physiotherapist'
};

// ==========================================
// 1. JSON FILE ENGINE FALLBACK
// ==========================================
class JsonDbEngine {
  constructor() {
    this.filePath = DB_FILE_JSON;
    this.data = {
      users: [],
      patients: [],
      visits: [],
      services: [],
      appointments: []
    };
    this.init();
  }

  init() {
    if (!fs.existsSync(this.filePath)) {
      this.save();
    } else {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        this.data = JSON.parse(raw);
        // Ensure all arrays exist
        this.data.users = this.data.users || [];
        this.data.patients = this.data.patients || [];
        this.data.visits = this.data.visits || [];
        this.data.services = this.data.services || [];
        this.data.appointments = this.data.appointments || [];

        this.data.visits = this.data.visits.map(v => ({
          ...v,
          treatment_status: v.treatment_status || 'Ongoing'
        }));

        this.data.patients = this.data.patients.map(p => ({
          ...p,
          registration_date: p.registration_date || (p.created_at || new Date().toISOString()).split('T')[0].split(' ')[0]
        }));
      } catch (err) {
        console.error('Failed to load JSON database, resetting. Error:', err);
        this.save();
      }
    }
    this.seedAdmin();
  }

  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
  }

  seedAdmin() {
    const existing = this.data.users.find(u => u.username === DEFAULT_ADMIN.username);
    if (!existing) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(DEFAULT_ADMIN.password_plain, salt);
      this.data.users.push({
        id: 1,
        username: DEFAULT_ADMIN.username,
        password_hash: hash,
        name: DEFAULT_ADMIN.name,
        role: DEFAULT_ADMIN.role,
        created_at: new Date().toISOString()
      });
      this.save();
      console.log('JSON Database: Seeded default admin user');
    }
  }

  // Generic helpers
  getNextId(table) {
    const list = this.data[table];
    if (list.length === 0) return 1;
    return Math.max(...list.map(item => item.id)) + 1;
  }
}

// ==========================================
// 2. SQLITE DATABASE ENGINE
// ==========================================
class SqliteDbEngine {
  constructor(sqlite3) {
    this.sqlite3 = sqlite3.verbose();
    this.db = new this.sqlite3.Database(DB_FILE_SQLITE);
  }

  async ensureVisitTreatmentStatusColumn() {
    return new Promise((resolve, reject) => {
      this.db.all('PRAGMA table_info(visits)', [], (err, columns) => {
        if (err) return reject(err);
        const found = columns.some(col => col.name === 'treatment_status');
        if (found) return resolve();

        this.db.run(
          "ALTER TABLE visits ADD COLUMN treatment_status TEXT DEFAULT 'Ongoing'",
          [],
          (alterErr) => {
            if (alterErr) return reject(alterErr);
            resolve();
          }
        );
      });
    });
  }

  async ensureAppointmentVisitIdColumn() {
    return new Promise((resolve, reject) => {
      this.db.all('PRAGMA table_info(appointments)', [], (err, columns) => {
        if (err) return reject(err);
        const found = columns.some(col => col.name === 'visit_id');
        if (found) return resolve();

        this.db.run(
          "ALTER TABLE appointments ADD COLUMN visit_id INTEGER",
          [],
          (alterErr) => {
            if (alterErr) return reject(alterErr);
            resolve();
          }
        );
      });
    });
  }

  async ensurePatientRegistrationDateColumn() {
    return new Promise((resolve, reject) => {
      this.db.all('PRAGMA table_info(patients)', [], (err, columns) => {
        if (err) return reject(err);
        const found = columns.some(col => col.name === 'registration_date');
        if (found) return resolve();

        this.db.run(
          "ALTER TABLE patients ADD COLUMN registration_date TEXT",
          [],
          (alterErr) => {
            if (alterErr) return reject(alterErr);
            // Populate registration_date = SUBSTR(created_at, 1, 10) for existing patients
            this.db.run(
              "UPDATE patients SET registration_date = SUBSTR(created_at, 1, 10) WHERE registration_date IS NULL",
              [],
              (updateErr) => {
                if (updateErr) return reject(updateErr);
                resolve();
              }
            );
          }
        );
      });
    });
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Create users table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Create patients table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            age INTEGER NOT NULL,
            gender TEXT NOT NULL,
            contact_number TEXT NOT NULL,
            address TEXT NOT NULL,
            medical_history TEXT,
            is_deleted INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Create visits table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS visits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            visit_date TEXT NOT NULL,
            complaint TEXT NOT NULL,
            treatment_given TEXT NOT NULL,
            treatment_status TEXT DEFAULT 'Ongoing',
            duration_minutes INTEGER NOT NULL,
            notes TEXT,
            is_deleted INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(id)
          )
        `);

        // Create services table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            visit_id INTEGER NOT NULL,
            service_type TEXT NOT NULL,
            body_part TEXT NOT NULL,
            session_number INTEGER NOT NULL,
            progress_notes TEXT,
            is_deleted INTEGER DEFAULT 0,
            FOREIGN KEY (visit_id) REFERENCES visits(id)
          )
        `);

        // Create appointments table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            visit_id INTEGER,
            appointment_date TEXT NOT NULL,
            notes TEXT,
            status TEXT DEFAULT 'scheduled',
            FOREIGN KEY (patient_id) REFERENCES patients(id),
            FOREIGN KEY (visit_id) REFERENCES visits(id)
          )
        `, async (err) => {
          if (err) {
            console.error('Error creating SQLite tables:', err);
            reject(err);
          } else {
            try {
              await this.ensureVisitTreatmentStatusColumn();
              await this.ensureAppointmentVisitIdColumn();
              await this.ensurePatientRegistrationDateColumn();
              this.seedAdmin().then(resolve).catch(reject);
            } catch (schemaErr) {
              reject(schemaErr);
            }
          }
        });
      });
    });
  }

  async seedAdmin() {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE username = ?', [DEFAULT_ADMIN.username], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        if (!row) {
          const salt = bcrypt.genSaltSync(10);
          const hash = bcrypt.hashSync(DEFAULT_ADMIN.password_plain, salt);
          this.db.run(
            'INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)',
            [DEFAULT_ADMIN.username, hash, DEFAULT_ADMIN.name, DEFAULT_ADMIN.role],
            (insertErr) => {
              if (insertErr) reject(insertErr);
              else {
                console.log('SQLite Database: Seeded default admin user');
                resolve();
              }
            }
          );
        } else {
          resolve();
        }
      });
    });
  }

  // SQLite helper queries
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }
}

// ==========================================
// 3. DATABASE MODULE LOADER & INITIALIZER
// ==========================================
try {
  const sqlite3 = require('sqlite3');
  dbInstance = new SqliteDbEngine(sqlite3);
  isSqlite = true;
  console.log('Successfully loaded sqlite3 driver. Using SQLite database.');
} catch (e) {
  console.warn('sqlite3 driver failed to load or is not compiled. Falling back to JSON Relational File Store.');
  dbInstance = new JsonDbEngine();
  isSqlite = false;
}

// Export database operations
module.exports = {
  isSqlite,
  async init() {
    if (isSqlite) {
      await dbInstance.init();
    }
  },

  users: {
    async getByUsername(username) {
      if (isSqlite) {
        return dbInstance.get('SELECT * FROM users WHERE username = ?', [username]);
      } else {
        return dbInstance.data.users.find(u => u.username === username) || null;
      }
    },
    async getById(id) {
      if (isSqlite) {
        return dbInstance.get('SELECT * FROM users WHERE id = ?', [id]);
      } else {
        return dbInstance.data.users.find(u => u.id === Number(id)) || null;
      }
    }
  },

  patients: {
    async list(searchQuery = '') {
      const mapPatients = (rows) => rows.map(row => ({
        ...row,
        registration_date: row.registration_date || (row.created_at || '').split('T')[0].split(' ')[0],
        status: row.status || 'Not Started'
      }));

      if (isSqlite) {
        let rows;
        if (searchQuery) {
          const likeQuery = `%${searchQuery}%`;
          rows = await dbInstance.all(
            `SELECT p.*, 
               (SELECT v.treatment_status 
                FROM visits v 
                WHERE v.patient_id = p.id AND v.is_deleted = 0 
                ORDER BY v.visit_date DESC, v.id DESC LIMIT 1) AS status
             FROM patients p 
             WHERE p.is_deleted = 0 AND (p.name LIKE ? OR p.contact_number LIKE ?)
             ORDER BY p.name ASC`,
            [likeQuery, likeQuery]
          );
        } else {
          rows = await dbInstance.all(
            `SELECT p.*, 
               (SELECT v.treatment_status 
                FROM visits v 
                WHERE v.patient_id = p.id AND v.is_deleted = 0 
                ORDER BY v.visit_date DESC, v.id DESC LIMIT 1) AS status
             FROM patients p 
             WHERE p.is_deleted = 0 
             ORDER BY p.name ASC`
          );
        }
        return mapPatients(rows);
      } else {
        let list = dbInstance.data.patients.filter(p => !p.is_deleted);
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          list = list.filter(
            p => p.name.toLowerCase().includes(q) || p.contact_number.includes(q)
          );
        }
        const patientsWithStatus = list.map(p => {
          const patientVisits = dbInstance.data.visits.filter(v => v.patient_id === p.id && !v.is_deleted);
          let status = 'Not Started';
          if (patientVisits.length > 0) {
            const sorted = patientVisits.sort((a, b) => b.visit_date.localeCompare(a.visit_date) || b.id - a.id);
            status = sorted[0].treatment_status || 'Ongoing';
          }
          return {
            ...p,
            status
          };
        });
        return mapPatients(patientsWithStatus).sort((a, b) => a.name.localeCompare(b.name));
      }
    },

    async get(id) {
      const patientId = Number(id);
      if (isSqlite) {
        const row = await dbInstance.get('SELECT * FROM patients WHERE id = ? AND is_deleted = 0', [patientId]);
        return row ? { ...row, registration_date: row.registration_date || (row.created_at || '').split('T')[0].split(' ')[0] } : null;
      } else {
        const p = dbInstance.data.patients.find(p => p.id === patientId && !p.is_deleted) || null;
        return p ? { ...p, registration_date: p.registration_date || (p.created_at || '').split('T')[0].split(' ')[0] } : null;
      }
    },

    async create(patientData) {
      const { name, age, gender, contact_number, address, medical_history, registration_date } = patientData;
      const finalRegDate = registration_date || new Date().toISOString().split('T')[0];
      if (isSqlite) {
        const result = await dbInstance.run(
          `INSERT INTO patients (name, age, gender, contact_number, address, medical_history, registration_date) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [name, Number(age), gender, contact_number, address, medical_history, finalRegDate]
        );
        return { id: result.id, ...patientData, registration_date: finalRegDate };
      } else {
        const id = dbInstance.getNextId('patients');
        const now = new Date().toISOString();
        const record = {
          id,
          name,
          age: Number(age),
          gender,
          contact_number,
          address,
          medical_history,
          registration_date: finalRegDate,
          is_deleted: 0,
          created_at: now,
          updated_at: now
        };
        dbInstance.data.patients.push(record);
        dbInstance.save();
        return record;
      }
    },

    async update(id, patientData) {
      const patientId = Number(id);
      const { name, age, gender, contact_number, address, medical_history, registration_date } = patientData;
      const finalRegDate = registration_date || new Date().toISOString().split('T')[0];
      if (isSqlite) {
        await dbInstance.run(
          `UPDATE patients 
           SET name = ?, age = ?, gender = ?, contact_number = ?, address = ?, medical_history = ?, registration_date = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [name, Number(age), gender, contact_number, address, medical_history, finalRegDate, patientId]
        );
        return { id: patientId, ...patientData, registration_date: finalRegDate };
      } else {
        const index = dbInstance.data.patients.findIndex(p => p.id === patientId && !p.is_deleted);
        if (index === -1) throw new Error('Patient not found');
        const now = new Date().toISOString();
        const updatedRecord = {
          ...dbInstance.data.patients[index],
          name,
          age: Number(age),
          gender,
          contact_number,
          address,
          medical_history,
          registration_date: finalRegDate,
          updated_at: now
        };
        dbInstance.data.patients[index] = updatedRecord;
        dbInstance.save();
        return updatedRecord;
      }
    },

    async delete(id) {
      const patientId = Number(id);
      if (isSqlite) {
        // Soft delete patients, and their visits, and services
        await dbInstance.run('UPDATE patients SET is_deleted = 1 WHERE id = ?', [patientId]);
        await dbInstance.run('UPDATE visits SET is_deleted = 1 WHERE patient_id = ?', [patientId]);
        // Note: For services we can delete them or leave them because their visits are deleted.
        return true;
      } else {
        const index = dbInstance.data.patients.findIndex(p => p.id === patientId && !p.is_deleted);
        if (index === -1) return false;
        dbInstance.data.patients[index].is_deleted = 1;
        
        // Also cascade soft-delete visits
        dbInstance.data.visits.forEach(v => {
          if (v.patient_id === patientId) {
            v.is_deleted = 1;
          }
        });
        
        dbInstance.save();
        return true;
      }
    }
  },

  visits: {
    async listByPatient(patientId) {
      const pid = Number(patientId);
      if (isSqlite) {
        const visits = await dbInstance.all(
          'SELECT * FROM visits WHERE patient_id = ? AND is_deleted = 0 ORDER BY visit_date DESC, id DESC',
          [pid]
        );
        // Load services for each visit
        for (let visit of visits) {
          visit.services = await dbInstance.all(
            'SELECT * FROM services WHERE visit_id = ? AND is_deleted = 0',
            [visit.id]
          );
        }
        return visits;
      } else {
        const visits = dbInstance.data.visits
          .filter(v => v.patient_id === pid && !v.is_deleted)
          .sort((a, b) => {
            const dateCompare = b.visit_date.localeCompare(a.visit_date);
            if (dateCompare !== 0) return dateCompare;
            return b.id - a.id;
          });
        
        // Map services
        visits.forEach(v => {
          v.services = dbInstance.data.services.filter(s => s.visit_id === v.id && !s.is_deleted);
        });
        return visits;
      }
    },

    async create(patientId, visitData) {
      const pid = Number(patientId);
      const { visit_date, complaint, treatment_given, treatment_status, duration_minutes, notes, services, next_appointment } = visitData;
      const normalizedTreatmentStatus = treatment_status || 'Ongoing';

      if (isSqlite) {
        // Run as a transaction
        await dbInstance.run('BEGIN TRANSACTION');
        try {
          const result = await dbInstance.run(
            `INSERT INTO visits (patient_id, visit_date, complaint, treatment_given, treatment_status, duration_minutes, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              pid,
              visit_date,
              complaint,
              treatment_given,
              normalizedTreatmentStatus,
              Number(duration_minutes),
              notes
            ]
          );
          const visitId = result.id;

          // Insert services
          if (services && Array.isArray(services)) {
            for (let svc of services) {
              await dbInstance.run(
                `INSERT INTO services (visit_id, service_type, body_part, session_number, progress_notes) 
                 VALUES (?, ?, ?, ?, ?)`,
                [visitId, svc.service_type, svc.body_part, Number(svc.session_number), svc.progress_notes]
              );
            }
          }

          // Insert appointment if scheduled
          if (next_appointment && next_appointment.appointment_date && normalizedTreatmentStatus !== 'Completed') {
            // Delete old scheduled appointments first
            await dbInstance.run(
              "UPDATE appointments SET status = 'cancelled' WHERE patient_id = ? AND status = 'scheduled'",
              [pid]
            );
            await dbInstance.run(
              `INSERT INTO appointments (patient_id, visit_id, appointment_date, notes, status) 
               VALUES (?, ?, ?, ?, 'scheduled')`,
              [pid, visitId, next_appointment.appointment_date, next_appointment.notes || '']
            );
          } else if (normalizedTreatmentStatus === 'Completed') {
            await dbInstance.run(
              "UPDATE appointments SET status = 'cancelled' WHERE patient_id = ? AND status = 'scheduled'",
              [pid]
            );
          }

          await dbInstance.run('COMMIT');
          return { id: visitId, patient_id: pid, ...visitData };
        } catch (err) {
          await dbInstance.run('ROLLBACK');
          throw err;
        }
      } else {
        const visitId = dbInstance.getNextId('visits');
        const now = new Date().toISOString();
        const visitRecord = {
          id: visitId,
          patient_id: pid,
          visit_date,
          complaint,
          treatment_given,
          treatment_status: normalizedTreatmentStatus,
          duration_minutes: Number(duration_minutes),
          notes,
          is_deleted: 0,
          created_at: now
        };

        dbInstance.data.visits.push(visitRecord);

        // Add services
        const addedServices = [];
        if (services && Array.isArray(services)) {
          services.forEach(svc => {
            const svcId = dbInstance.getNextId('services');
            const svcRecord = {
              id: svcId,
              visit_id: visitId,
              service_type: svc.service_type,
              body_part: svc.body_part,
              session_number: Number(svc.session_number),
              progress_notes: svc.progress_notes,
              is_deleted: 0
            };
            dbInstance.data.services.push(svcRecord);
            addedServices.push(svcRecord);
          });
        }

        // Add next appointment
        if (next_appointment && next_appointment.appointment_date && normalizedTreatmentStatus !== 'Completed') {
          // Cancel active appointments
          dbInstance.data.appointments.forEach(a => {
            if (a.patient_id === pid && a.status === 'scheduled') {
              a.status = 'cancelled';
            }
          });

          const aptId = dbInstance.getNextId('appointments');
          dbInstance.data.appointments.push({
            id: aptId,
            patient_id: pid,
            visit_id: visitId,
            appointment_date: next_appointment.appointment_date,
            notes: next_appointment.notes || '',
            status: 'scheduled'
          });
        } else if (normalizedTreatmentStatus === 'Completed') {
          dbInstance.data.appointments.forEach(a => {
            if (a.patient_id === pid && a.status === 'scheduled') {
              a.status = 'cancelled';
            }
          });
        }

        dbInstance.save();
        return { ...visitRecord, services: addedServices };
      }
    },

    async delete(visitId) {
      const vid = Number(visitId);
      if (isSqlite) {
        const visit = await dbInstance.get('SELECT patient_id FROM visits WHERE id = ? AND is_deleted = 0', [vid]);
        if (!visit) return false;

        await dbInstance.run('UPDATE visits SET is_deleted = 1 WHERE id = ?', [vid]);
        await dbInstance.run('UPDATE services SET is_deleted = 1 WHERE visit_id = ?', [vid]);
        await dbInstance.run(
          "UPDATE appointments SET status = 'cancelled' WHERE (visit_id = ? OR patient_id = ?) AND status = 'scheduled'",
          [vid, visit.patient_id]
        );
        return true;
      } else {
        const visit = dbInstance.data.visits.find(v => v.id === vid && !v.is_deleted);
        if (!visit) return false;
        visit.is_deleted = 1;
        dbInstance.data.services.forEach(s => {
          if (s.visit_id === vid) {
            s.is_deleted = 1;
          }
        });
        dbInstance.data.appointments.forEach(a => {
          if ((a.visit_id === vid || a.patient_id === visit.patient_id) && a.status === 'scheduled') {
            a.status = 'cancelled';
          }
        });
        dbInstance.save();
        return true;
      }
    },

    async search(query = '', patientId = null) {
      if (isSqlite) {
        let sql = `
          SELECT DISTINCT v.*, p.name as patient_name, p.contact_number as patient_contact
          FROM visits v
          JOIN patients p ON v.patient_id = p.id
          LEFT JOIN services s ON s.visit_id = v.id AND s.is_deleted = 0
          WHERE v.is_deleted = 0 AND p.is_deleted = 0
        `;
        const params = [];

        if (patientId) {
          sql += ` AND v.patient_id = ?`;
          params.push(Number(patientId));
        }

        if (query) {
          const likeQuery = `%${query}%`;
          sql += ` AND (
            p.name LIKE ? OR 
            v.visit_date LIKE ? OR 
            v.complaint LIKE ? OR 
            v.treatment_given LIKE ? OR 
            v.notes LIKE ? OR
            s.service_type LIKE ? OR 
            s.body_part LIKE ?
          )`;
          params.push(likeQuery, likeQuery, likeQuery, likeQuery, likeQuery, likeQuery, likeQuery);
        }

        sql += ` ORDER BY v.visit_date DESC, v.id DESC`;
        const visits = await dbInstance.all(sql, params);

        // Fetch services for matches
        for (let visit of visits) {
          visit.services = await dbInstance.all(
            'SELECT * FROM services WHERE visit_id = ? AND is_deleted = 0',
            [visit.id]
          );
        }
        return visits;
      } else {
        let matchedVisits = dbInstance.data.visits.filter(v => !v.is_deleted);
        
        if (patientId) {
          matchedVisits = matchedVisits.filter(v => v.patient_id === Number(patientId));
        }

        let results = [];
        for (let v of matchedVisits) {
          const patient = dbInstance.data.patients.find(p => p.id === v.patient_id && !p.is_deleted);
          if (!patient) continue;

          const svcs = dbInstance.data.services.filter(s => s.visit_id === v.id && !s.is_deleted);
          
          if (query) {
            const q = query.toLowerCase();
            const matchesPatientName = (patient.name || '').toLowerCase().includes(q);
            const matchesVisitDate = (v.visit_date || '').toLowerCase().includes(q);
            const matchesComplaint = (v.complaint || '').toLowerCase().includes(q);
            const matchesTreatmentGiven = (v.treatment_given || '').toLowerCase().includes(q);
            const matchesNotes = (v.notes || '').toLowerCase().includes(q);
            const matchesServiceType = svcs.some(s => (s.service_type || '').toLowerCase().includes(q));
            const matchesBodyPart = svcs.some(s => (s.body_part || '').toLowerCase().includes(q));

            if (!matchesPatientName && !matchesVisitDate && !matchesComplaint && !matchesTreatmentGiven && !matchesNotes && !matchesServiceType && !matchesBodyPart) {
              continue;
            }
          }

          results.push({
            ...v,
            patient_name: patient.name,
            patient_contact: patient.contact_number,
            services: svcs
          });
        }

        return results.sort((a, b) => b.visit_date.localeCompare(a.visit_date) || b.id - a.id);
      }
    }
  },

  reports: {
    async getPatientDashboardSummary(patientId) {
      const pid = Number(patientId);
      if (isSqlite) {
        const stats = await dbInstance.get(
          `SELECT 
            COUNT(id) as total_visits,
            MAX(visit_date) as last_visit_date
           FROM visits 
           WHERE patient_id = ? AND is_deleted = 0`,
          [pid]
        );

        const appointment = await dbInstance.get(
          `SELECT appointment_date, notes
           FROM appointments 
           WHERE patient_id = ? AND status = 'scheduled'
           ORDER BY appointment_date ASC LIMIT 1`,
          [pid]
        );

        // Current treatment plan is usually in the notes/progress notes of the last visit
        const lastVisit = await dbInstance.get(
          `SELECT treatment_given, treatment_status, notes FROM visits 
           WHERE patient_id = ? AND is_deleted = 0 
           ORDER BY visit_date DESC, id DESC LIMIT 1`,
          [pid]
        );

        const overdueAppointment = await dbInstance.get(
          `SELECT appointment_date, notes 
           FROM appointments 
           WHERE patient_id = ? AND status = 'scheduled' AND appointment_date < ? 
           ORDER BY appointment_date ASC LIMIT 1`,
          [pid, new Date().toISOString().split('T')[0]]
        );

        const patient = await dbInstance.get(
          `SELECT created_at FROM patients WHERE id = ?`,
          [pid]
        );
        const registrationDate = patient ? patient.created_at.split('T')[0] : null;
        const compareDate = stats.last_visit_date || registrationDate;
        const todayStr = new Date().toISOString().split('T')[0];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(new Date().getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        const requiresFollowup = !appointment && compareDate && compareDate < thirtyDaysAgoStr;

        const nextAppointmentDaysRemaining = appointment ? Math.max(0, Math.floor((new Date(appointment.appointment_date).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24))) : null;
        return {
          total_visits: stats.total_visits || 0,
          last_visit_date: stats.last_visit_date || null,
          current_treatment_plan: lastVisit ? lastVisit.treatment_given : 'No treatments logged yet',
          current_treatment_status: lastVisit ? (lastVisit.treatment_status || 'Ongoing') : 'Not Started',
          next_appointment: appointment ? appointment.appointment_date : null,
          next_appointment_notes: appointment ? appointment.notes : '',
          next_appointment_days_remaining: nextAppointmentDaysRemaining,
          has_overdue_appointment: !!overdueAppointment,
          overdue_appointment_date: overdueAppointment ? overdueAppointment.appointment_date : null,
          overdue_days: overdueAppointment ? Math.floor((new Date().setHours(0,0,0,0) - new Date(overdueAppointment.appointment_date).setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)) : 0,
          requires_followup: requiresFollowup
        };
      } else {
        const patientRecord = dbInstance.data.patients.find(p => p.id === pid && !p.is_deleted);
        const patientCreatedAt = patientRecord ? patientRecord.created_at.split('T')[0] : null;
        const patientVisits = dbInstance.data.visits.filter(v => v.patient_id === pid && !v.is_deleted);
        const totalVisits = patientVisits.length;
        
        let lastVisitDate = null;
        let currentTreatmentPlan = 'No treatments logged yet';
        let currentTreatmentStatus = 'Not Started';
        
        if (totalVisits > 0) {
          const sortedVisits = [...patientVisits].sort((a, b) => b.visit_date.localeCompare(a.visit_date) || b.id - a.id);
          lastVisitDate = sortedVisits[0].visit_date;
          currentTreatmentPlan = sortedVisits[0].treatment_given;
          currentTreatmentStatus = sortedVisits[0].treatment_status || 'Ongoing';
        }

        const scheduledAppointments = dbInstance.data.appointments
          .filter(a => a.patient_id === pid && a.status === 'scheduled')
          .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));

        const overdueAppointments = dbInstance.data.appointments
          .filter(a => a.patient_id === pid && a.status === 'scheduled' && a.appointment_date < new Date().toISOString().split('T')[0])
          .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));

        const nextApt = scheduledAppointments.length > 0 ? scheduledAppointments[0] : null;
        const overdueApt = overdueAppointments.length > 0 ? overdueAppointments[0] : null;
        const compareDate = lastVisitDate || patientCreatedAt;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(new Date().getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        const nextAppointmentDaysRemaining = nextApt ? Math.max(0, Math.floor((new Date(nextApt.appointment_date).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24))) : null;
        return {
          total_visits: totalVisits,
          last_visit_date: lastVisitDate,
          current_treatment_plan: currentTreatmentPlan,
          current_treatment_status: currentTreatmentStatus,
          next_appointment: nextApt ? nextApt.appointment_date : null,
          next_appointment_notes: nextApt ? nextApt.notes : '',
          next_appointment_days_remaining: nextAppointmentDaysRemaining,
          has_overdue_appointment: !!overdueApt,
          overdue_appointment_date: overdueApt ? overdueApt.appointment_date : null,
          overdue_days: overdueApt ? Math.floor((new Date().setHours(0,0,0,0) - new Date(overdueApt.appointment_date).setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)) : 0,
          requires_followup: !nextApt && compareDate && compareDate < thirtyDaysAgoStr
        };
      }
    },

    async getSystemDashboardOverview() {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const startOfMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

      let activePatientsCount = 0;
      const followupNeeded = [];
      const scheduledFollowups = [];

      if (isSqlite) {
        const patients = await dbInstance.all('SELECT * FROM patients WHERE is_deleted = 0');

        const monthlyVisits = await dbInstance.get(
          `SELECT COUNT(id) as cnt FROM visits WHERE is_deleted = 0 AND visit_date >= ?`,
          [startOfMonthStr]
        );

        for (let p of patients) {
          const lastVisit = await dbInstance.get(
            `SELECT visit_date, treatment_status FROM visits 
             WHERE patient_id = ? AND is_deleted = 0 
             ORDER BY visit_date DESC, id DESC LIMIT 1`,
            [p.id]
          );

          const hasVisits = !!lastVisit;
          const latestStatus = hasVisits ? (lastVisit.treatment_status || 'Ongoing') : null;
          const isOngoing = hasVisits && (latestStatus === 'Ongoing');

          if (isOngoing) {
            activePatientsCount += 1;

            // Check scheduled follow-ups (future scheduled appointments)
            const scheduledFuture = await dbInstance.get(
              `SELECT appointment_date FROM appointments 
               WHERE patient_id = ? AND status = 'scheduled' AND appointment_date >= ? 
               ORDER BY appointment_date ASC LIMIT 1`,
              [p.id, todayStr]
            );

            if (scheduledFuture) {
              scheduledFollowups.push({
                id: p.id,
                name: p.name,
                contact_number: p.contact_number,
                last_visit_date: lastVisit.visit_date,
                next_appointment_date: scheduledFuture.appointment_date,
                days_remaining: Math.max(0, Math.floor((new Date(scheduledFuture.appointment_date).setHours(0,0,0,0) - now.setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)))
              });
            }

            // Check missed appointments (>30 days overdue)
            const scheduledApts = await dbInstance.all(
              `SELECT appointment_date FROM appointments 
               WHERE patient_id = ? AND status = 'scheduled' 
               ORDER BY appointment_date ASC`,
              [p.id]
            );

            for (let apt of scheduledApts) {
              const attendedRow = await dbInstance.get(
                `SELECT COUNT(*) as cnt FROM visits 
                 WHERE patient_id = ? AND is_deleted = 0 AND visit_date >= ?`,
                [p.id, apt.appointment_date]
              );

              if (attendedRow.cnt === 0) {
                const diffTime = new Date().setHours(0,0,0,0) - new Date(apt.appointment_date).setHours(0,0,0,0);
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 30) {
                  followupNeeded.push({
                    id: p.id,
                    name: p.name,
                    contact_number: p.contact_number,
                    last_visit_date: lastVisit.visit_date,
                    missed_appointment_date: apt.appointment_date,
                    days_since_missed: diffDays
                  });
                  break; // Flag patient once
                }
              }
            }
          }
        }

        return {
          total_active_patients: activePatientsCount,
          active_patients_count: activePatientsCount,
          visits_this_month: monthlyVisits.cnt || 0,
          scheduled_followups: scheduledFollowups.sort((a, b) => a.next_appointment_date.localeCompare(b.next_appointment_date)),
          scheduled_followups_count: scheduledFollowups.length,
          followup_needed: followupNeeded.sort((a, b) => b.days_since_missed - a.days_since_missed)
        };
      } else {
        const activePatients = dbInstance.data.patients.filter(p => !p.is_deleted);

        const monthlyVisits = dbInstance.data.visits.filter(
          v => !v.is_deleted && v.visit_date >= startOfMonthStr
        ).length;

        activePatients.forEach(p => {
          const patientVisits = dbInstance.data.visits.filter(v => v.patient_id === p.id && !v.is_deleted);
          let lastVisit = null;
          if (patientVisits.length > 0) {
            const sorted = patientVisits.sort((a, b) => b.visit_date.localeCompare(a.visit_date) || b.id - a.id);
            lastVisit = sorted[0];
          }

          const hasVisits = !!lastVisit;
          const latestStatus = hasVisits ? (lastVisit.treatment_status || 'Ongoing') : null;
          const isOngoing = hasVisits && (latestStatus === 'Ongoing');

          if (isOngoing) {
            activePatientsCount += 1;

            // Check scheduled follow-ups
            const scheduledFuture = dbInstance.data.appointments
              .filter(a => a.patient_id === p.id && a.status === 'scheduled' && a.appointment_date >= todayStr)
              .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date))[0];

            if (scheduledFuture) {
              scheduledFollowups.push({
                id: p.id,
                name: p.name,
                contact_number: p.contact_number,
                last_visit_date: lastVisit.visit_date,
                next_appointment_date: scheduledFuture.appointment_date,
                days_remaining: Math.max(0, Math.floor((new Date(scheduledFuture.appointment_date).setHours(0,0,0,0) - now.setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)))
              });
            }

            // Check missed appointments (>30 days overdue)
            const scheduledApts = dbInstance.data.appointments
              .filter(a => a.patient_id === p.id && a.status === 'scheduled')
              .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));

            for (let apt of scheduledApts) {
              const attended = dbInstance.data.visits.some(v => v.patient_id === p.id && !v.is_deleted && v.visit_date >= apt.appointment_date);
              if (!attended) {
                const diffTime = new Date().setHours(0,0,0,0) - new Date(apt.appointment_date).setHours(0,0,0,0);
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 30) {
                  followupNeeded.push({
                    id: p.id,
                    name: p.name,
                    contact_number: p.contact_number,
                    last_visit_date: lastVisit.visit_date,
                    missed_appointment_date: apt.appointment_date,
                    days_since_missed: diffDays
                  });
                  break;
                }
              }
            }
          }
        });

        return {
          total_active_patients: activePatientsCount,
          active_patients_count: activePatientsCount,
          visits_this_month: monthlyVisits,
          scheduled_followups: scheduledFollowups.sort((a, b) => a.next_appointment_date.localeCompare(b.next_appointment_date)),
          scheduled_followups_count: scheduledFollowups.length,
          followup_needed: followupNeeded.sort((a, b) => b.days_since_missed - a.days_since_missed)
        };
      }
    },

    async getScheduledFollowupPatients() {
      const todayStr = new Date().toISOString().split('T')[0];
      const now = new Date();
      const scheduled = [];

      if (isSqlite) {
        const patients = await dbInstance.all('SELECT id, name, contact_number FROM patients WHERE is_deleted = 0');
        for (let p of patients) {
          const lastVisit = await dbInstance.get(
            `SELECT visit_date, treatment_given, treatment_status FROM visits 
             WHERE patient_id = ? AND is_deleted = 0 
             ORDER BY visit_date DESC, id DESC LIMIT 1`,
            [p.id]
          );

          if (!lastVisit || lastVisit.treatment_status !== 'Ongoing') {
            continue;
          }

          const appointment = await dbInstance.get(
            `SELECT appointment_date, notes FROM appointments 
             WHERE patient_id = ? AND status = 'scheduled' AND appointment_date >= ? 
             ORDER BY appointment_date ASC LIMIT 1`,
            [p.id, todayStr]
          );

          if (!appointment) continue;

          const daysRemaining = Math.max(0, Math.floor((new Date(appointment.appointment_date).setHours(0,0,0,0) - now.setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)));
          scheduled.push({
            id: p.id,
            name: p.name,
            contact_number: p.contact_number,
            last_visit_date: lastVisit.visit_date || null,
            next_appointment_date: appointment.appointment_date,
            days_remaining: daysRemaining,
            treatment_plan: lastVisit.treatment_given || 'No treatment plan available'
          });
        }
      } else {
        const patients = dbInstance.data.patients.filter(p => !p.is_deleted);
        for (let p of patients) {
          const patientVisits = dbInstance.data.visits.filter(v => v.patient_id === p.id && !v.is_deleted);
          if (patientVisits.length === 0) continue;
          const sortedVisits = patientVisits.sort((a, b) => b.visit_date.localeCompare(a.visit_date) || b.id - a.id);
          const lastVisit = sortedVisits[0];
          if ((lastVisit.treatment_status || 'Ongoing') !== 'Ongoing') continue;

          const appointment = dbInstance.data.appointments
            .filter(a => a.patient_id === p.id && a.status === 'scheduled' && a.appointment_date >= todayStr)
            .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date))[0];
          if (!appointment) continue;

          const daysRemaining = Math.max(0, Math.floor((new Date(appointment.appointment_date).setHours(0,0,0,0) - now.setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)));
          scheduled.push({
            id: p.id,
            name: p.name,
            contact_number: p.contact_number,
            last_visit_date: lastVisit.visit_date || null,
            next_appointment_date: appointment.appointment_date,
            days_remaining: daysRemaining,
            treatment_plan: lastVisit.treatment_given || 'No treatment plan available'
          });
        }
      }

      return scheduled.sort((a, b) => a.next_appointment_date.localeCompare(b.next_appointment_date));
    },

    async getActivePatients() {
      const activePatients = [];

      if (isSqlite) {
        const patients = await dbInstance.all('SELECT id, name, age, gender, contact_number FROM patients WHERE is_deleted = 0');
        for (let p of patients) {
          const lastVisit = await dbInstance.get(
            `SELECT visit_date, treatment_given, treatment_status FROM visits 
             WHERE patient_id = ? AND is_deleted = 0 
             ORDER BY visit_date DESC, id DESC LIMIT 1`,
            [p.id]
          );

          if (!lastVisit || lastVisit.treatment_status !== 'Ongoing') {
            continue;
          }

          const totalVisitsRow = await dbInstance.get(
            `SELECT COUNT(id) as cnt FROM visits WHERE patient_id = ? AND is_deleted = 0`,
            [p.id]
          );

          const nextAppointment = await dbInstance.get(
            `SELECT appointment_date FROM appointments 
             WHERE patient_id = ? AND status = 'scheduled' 
             ORDER BY appointment_date ASC LIMIT 1`,
            [p.id]
          );

          activePatients.push({
            id: p.id,
            name: p.name,
            age: p.age,
            gender: p.gender,
            contact_number: p.contact_number,
            last_visit_date: lastVisit.visit_date || null,
            next_appointment_date: nextAppointment ? nextAppointment.appointment_date : null,
            total_visits: totalVisitsRow?.cnt || 0,
            current_treatment_plan: lastVisit.treatment_given || 'No treatment plan available',
            status: 'Ongoing'
          });
        }
      } else {
        const patients = dbInstance.data.patients.filter(p => !p.is_deleted);
        for (let p of patients) {
          const patientVisits = dbInstance.data.visits.filter(v => v.patient_id === p.id && !v.is_deleted);
          if (patientVisits.length === 0) continue;

          const sortedVisits = patientVisits.sort((a, b) => b.visit_date.localeCompare(a.visit_date) || b.id - a.id);
          const lastVisit = sortedVisits[0];
          if ((lastVisit.treatment_status || 'Ongoing') !== 'Ongoing') continue;

          const nextAppointment = dbInstance.data.appointments
            .filter(a => a.patient_id === p.id && a.status === 'scheduled')
            .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date))[0];

          activePatients.push({
            id: p.id,
            name: p.name,
            age: p.age,
            gender: p.gender,
            contact_number: p.contact_number,
            last_visit_date: lastVisit.visit_date || null,
            next_appointment_date: nextAppointment ? nextAppointment.appointment_date : null,
            total_visits: patientVisits.length,
            current_treatment_plan: lastVisit.treatment_given || 'No treatment plan available',
            status: 'Ongoing'
          });
        }
      }

      return activePatients.sort((a, b) => a.name.localeCompare(b.name));
    },

    async getMonthlyReportData(year) {
      const targetYear = Number(year) || 2026;

      // 1. Get list of all years with visit records (to populate the year dropdown)
      let visitYears = [];
      if (isSqlite) {
        const yearRows = await dbInstance.all(
          `SELECT DISTINCT SUBSTR(visit_date, 1, 4) AS year FROM visits WHERE is_deleted = 0`
        );
        visitYears = yearRows.map(row => Number(row.year)).filter(Boolean);
      } else {
        visitYears = dbInstance.data.visits
          .filter(v => !v.is_deleted)
          .map(v => Number(v.visit_date.split('-')[0]))
          .filter(Boolean);
      }
      const uniqueYears = Array.from(new Set([2026, ...visitYears])).sort((a, b) => b - a);

      // 2. Fetch all visits for the selected year
      const yearStart = `${targetYear}-01-01`;
      const yearEnd = `${targetYear + 1}-01-01`;

      let visits = [];
      if (isSqlite) {
        visits = await dbInstance.all(
          `SELECT id, patient_id, visit_date FROM visits 
           WHERE is_deleted = 0 AND visit_date >= ? AND visit_date < ?`,
          [yearStart, yearEnd]
        );
      } else {
        visits = dbInstance.data.visits.filter(
          v => !v.is_deleted && v.visit_date >= yearStart && v.visit_date < yearEnd
        );
      }

      // 3. Aggregate by month
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      const monthlyData = monthNames.map((name, index) => ({
        month: name,
        patientsSeen: 0,
        totalSessions: 0,
        patientIds: new Set()
      }));

      // Group visits
      visits.forEach(v => {
        const dateParts = v.visit_date.split('-');
        const vMonth = Number(dateParts[1]); // 1 to 12
        if (vMonth >= 1 && vMonth <= 12) {
          const mObj = monthlyData[vMonth - 1];
          mObj.totalSessions += 1;
          mObj.patientIds.add(v.patient_id);
        }
      });

      // Format report array
      const report = monthlyData.map(m => ({
        month: m.month,
        patientsSeen: m.patientIds.size,
        totalSessions: m.totalSessions
      }));

      // Calculate totals for the selected year
      const totalSessions = visits.length;
      const totalPatientsTreated = new Set(visits.map(v => v.patient_id)).size;

      return {
        selectedYear: targetYear,
        availableYears: uniqueYears,
        totalPatientsTreated,
        totalSessions,
        report
      };
    }
  }
};
