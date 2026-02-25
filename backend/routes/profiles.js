import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// Get all profiles
router.get('/', async (req, res) => {
  try {
    const [profiles] = await db.query(
      'SELECT * FROM profiles ORDER BY created_at DESC'
    );
    res.json({ success: true, data: profiles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get profile by tourist_id
router.get('/:tourist_id', async (req, res) => {
  try {
    const [profiles] = await db.query(
      'SELECT * FROM profiles WHERE tourist_id = ?',
      [req.params.tourist_id]
    );
    
    if (profiles.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json({ success: true, data: profiles[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update profile
router.put('/:tourist_id', async (req, res) => {
  try {
    const { status, email, phone } = req.body;
    
    await db.query(
      'UPDATE profiles SET status = ?, email = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE tourist_id = ?',
      [status, email, phone, req.params.tourist_id]
    );
    
    res.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
