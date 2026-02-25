import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// Get all alerts
router.get('/', async (req, res) => {
  try {
    const [alerts] = await db.query(
      'SELECT * FROM alerts ORDER BY created_at DESC LIMIT 100'
    );
    res.json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new alert
router.post('/', async (req, res) => {
  try {
    const { 
      id, alert_id, user_id, tourist_id, username, 
      status, lat, lng, alert_type, zone_name, zone_level 
    } = req.body;

    await db.query(
      `INSERT INTO alerts (id, alert_id, user_id, tourist_id, username, status, lat, lng, alert_type, zone_name, zone_level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id || alert_id, alert_id, user_id, tourist_id, username, status || 'alert', lat, lng, alert_type, zone_name, zone_level]
    );

    res.json({ success: true, message: 'Alert created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dismiss alert
router.put('/:id/dismiss', async (req, res) => {
  try {
    await db.query(
      'UPDATE alerts SET dismissed = TRUE WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true, message: 'Alert dismissed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
