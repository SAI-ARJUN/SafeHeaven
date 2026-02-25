import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// Get all danger zones
router.get('/', async (req, res) => {
  try {
    const [zones] = await db.query(
      'SELECT * FROM danger_zones ORDER BY created_at DESC'
    );
    res.json({ success: true, data: zones });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create danger zone
router.post('/', async (req, res) => {
  try {
    const { id, name, lat, lng, radius, level } = req.body;
    
    await db.query(
      `INSERT INTO danger_zones (id, name, lat, lng, radius, level)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, lat, lng, radius, level || 'medium']
    );

    res.json({ success: true, message: 'Danger zone created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete danger zone
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM danger_zones WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Danger zone deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
