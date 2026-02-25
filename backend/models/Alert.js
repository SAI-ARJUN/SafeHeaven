import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  tourist_id: { type: String, required: true },
  username: String,
  status: { 
    type: String, 
    enum: ['safe', 'alert', 'danger'], 
    default: 'alert' 
  },
  latitude: Number,
  longitude: Number,
  alert_type: String,
  zone_name: String,
  zone_level: String,
  dismissed: { type: Boolean, default: false }
}, { timestamps: true });

export const Alert = mongoose.models.Alert || mongoose.model('Alert', alertSchema);
