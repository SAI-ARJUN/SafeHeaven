import mongoose from 'mongoose';

const dangerZoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  radius: { type: Number, required: true },
  level: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    default: 'medium' 
  }
}, { timestamps: true });

export const DangerZone = mongoose.models.DangerZone || mongoose.model('DangerZone', dangerZoneSchema);
