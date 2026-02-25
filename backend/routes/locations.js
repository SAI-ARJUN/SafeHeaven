import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// Get all locations
router.get('/', async (req, res) => {
  try {
    const [locations] = await db.query(
      'SELECT * FROM user_locations ORDER BY updated_at DESC'
    );
    res.json({ success: true, data: locations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update/Create location (upsert)
router.post('/', async (req, res) => {
  try {
    const { id, user_id, tourist_id, lat, lng, status } = req.body;

    await db.query(
      `INSERT INTO user_locations (id, user_id, tourist_id, lat, lng, status)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE lat = ?, lng = ?, status = ?, updated_at = CURRENT_TIMESTAMP`,
      [id, user_id, tourist_id, lat, lng, status, lat, lng, status]
    );

    res.json({ success: true, message: 'Location updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
