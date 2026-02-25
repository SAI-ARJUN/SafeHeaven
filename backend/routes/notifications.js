import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// Get notifications for tourist
router.get('/tourist/:tourist_id', async (req, res) => {
  try {
    const [notifications] = await db.query(
      'SELECT * FROM notifications WHERE tourist_id = ? ORDER BY created_at DESC',
      [req.params.tourist_id]
    );
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create notification
router.post('/', async (req, res) => {
  try {
    const { id, tourist_id, message, notification_type } = req.body;
    
    await db.query(
      `INSERT INTO notifications (id, tourist_id, message, notification_type)
       VALUES (?, ?, ?, ?)`,
      [id, tourist_id, message, notification_type || 'warning']
    );

    res.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET read = TRUE WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
