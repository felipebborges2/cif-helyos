import mongoose, { Schema } from 'mongoose'

const PlayerSchema = new Schema({
  name: { type: String, required: true },
  number: { type: Number, required: true },
  team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  photo: { type: String },
  isActive: { type: Boolean, default: true },
  // cartões acumulados na fase atual (zera com suspensão ou virada de fase)
  yellowCardCount: { type: Number, default: 0 },
}, { timestamps: true })

export default mongoose.models.Player || mongoose.model('Player', PlayerSchema)
