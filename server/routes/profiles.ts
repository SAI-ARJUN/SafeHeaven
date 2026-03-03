import { Router } from 'express';
import { Profile } from '../models/Profile.js';

const router = Router();

// Get all profiles
router.get('/', async (req, res) => {
  try {
    const profiles = await Profile.find().sort({ createdAt: -1 });
    res.json(profiles);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

// Get profile by ID
router.get('/:id', async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);
    if (profile) {
      res.json(profile);
    } else {
      res.status(404).json({ error: 'Profile not found' });
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get profile by email
router.get('/email/:email', async (req, res) => {
  try {
    const profile = await Profile.findOne({ email: req.params.email });
    if (profile) {
      res.json(profile);
    } else {
      res.status(404).json({ error: 'Profile not found' });
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Create new profile
router.post('/', async (req, res) => {
  try {
    const { email, name, phone, status, location_status, wallet_address } = req.body;
    
    // 🔒 Check if wallet address is already registered
    if (wallet_address) {
      const existingWallet = await Profile.findOne({ wallet_address });
      if (existingWallet) {
        console.error('❌ Wallet address already registered:', wallet_address);
        return res.status(409).json({ error: 'Wallet address already registered' });
      }
    }
    
    const profile = new Profile({
      email,
      name,
      phone,
      status,
      location_status,
      wallet_address,
    });
    await profile.save();
    res.status(201).json(profile);
  } catch (error: any) {
    console.error('Error creating profile:', error);
    if (error.code === 11000) {
      res.status(409).json({ error: 'Profile with this email already exists' });
    } else if (error.message === 'Wallet address already registered') {
      res.status(409).json({ error: 'Wallet address already registered' });
    } else {
      res.status(500).json({ error: 'Failed to create profile' });
    }
  }
});

// Update profile
router.patch('/:id', async (req, res) => {
  try {
    const { name, phone, status, location_status } = req.body;
    const profile = await Profile.findByIdAndUpdate(
      req.params.id,
      { name, phone, status, location_status },
      { new: true }
    );
    if (profile) {
      res.json(profile);
    } else {
      res.status(404).json({ error: 'Profile not found' });
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Delete profile
router.delete('/:id', async (req, res) => {
  try {
    const profile = await Profile.findByIdAndDelete(req.params.id);
    if (profile) {
      res.json({ message: 'Profile deleted' });
    } else {
      res.status(404).json({ error: 'Profile not found' });
    }
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
});

export default router;
