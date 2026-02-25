import express from 'express';
import { Profile } from '../models/Profile.js';

const router = express.Router();

// Login with Tourist ID
router.post('/login', async (req, res) => {
  try {
    const { tourist_id } = req.body;

    if (!tourist_id) {
      return res.status(400).json({ error: 'Tourist ID required' });
    }

    const profile = await Profile.findOne({ tourist_id });

    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: profile
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Login with Wallet
router.post('/login/wallet', async (req, res) => {
  try {
    const { wallet_address } = req.body;

    if (!wallet_address) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const profile = await Profile.findOne({ wallet_address });

    if (!profile) {
      return res.status(404).json({ error: 'Account not found. Please register first.' });
    }

    res.json({
      success: true,
      user: profile
    });
  } catch (error) {
    console.error('Wallet login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { 
      tourist_id, 
      username, 
      email, 
      phone, 
      dob, 
      wallet_address 
    } = req.body;

    if (!tourist_id || !username) {
      return res.status(400).json({ error: 'Tourist ID and username required' });
    }

    // Check if tourist_id already exists
    const existing = await Profile.findOne({ tourist_id });

    if (existing) {
      return res.status(409).json({ error: 'User already registered' });
    }

    // Create new profile
    const profile = await Profile.create({
      tourist_id,
      username,
      email,
      phone,
      dob,
      wallet_address,
      status: 'safe'
    });

    res.json({
      success: true,
      message: 'Registration successful',
      user: profile
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

export default router;
