import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema({
  tourist_id: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  email: String,
  phone: String,
  dob: String,
  wallet_address: { type: String, unique: true },
  status: { 
    type: String, 
    enum: ['safe', 'alert', 'danger'], 
    default: 'safe' 
  },
  latitude: Number,
  longitude: Number,
  lastLocationUpdate: Date
}, { timestamps: true });

export const Profile = mongoose.models.Profile || mongoose.model('Profile', profileSchema);
