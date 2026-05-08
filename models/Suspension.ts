import mongoose, { Schema } from 'mongoose'

const SuspensionSchema = new Schema({
  player: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  reason: { type: String, enum: ['yellow_cards', 'red_card', 'disciplinary'], required: true },
  matchesToServe: { type: Number, required: true, default: 1 },
  matchesServed: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'serving', 'completed'], default: 'pending' },
  disciplinaryNote: { type: String },
  // para saber de qual fase surgiu
  originPhase: { type: String, enum: ['group', 'quarterfinal', 'semifinal', 'final'] },
}, { timestamps: true })

export default mongoose.models.Suspension || mongoose.model('Suspension', SuspensionSchema)
