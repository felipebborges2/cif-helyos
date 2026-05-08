import mongoose, { Schema } from 'mongoose'

const TeamSchema = new Schema({
  name: { type: String, required: true, unique: true },
  shortName: { type: String, required: true, maxlength: 4 },
  color: { type: String, required: true, default: '#22c55e' },
  logo: { type: String },
  foundingYear: { type: Number },
  description: { type: String },
  titles: { type: Number, default: 0 },
  titleYears: { type: [Number], default: [] },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

// Delete cached model in development so schema changes are picked up on hot reload
if (process.env.NODE_ENV !== 'production' && mongoose.models.Team) {
  delete (mongoose.models as any).Team
}

export default mongoose.models.Team || mongoose.model('Team', TeamSchema)
