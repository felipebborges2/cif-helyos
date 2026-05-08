import mongoose, { Schema } from 'mongoose'

const MatchEventSchema = new Schema({
  match: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
  minute: { type: Number, required: true },
  half: { type: Number, enum: [1, 2], default: 1 },
  type: { type: String, enum: ['goal', 'yellow_card', 'red_card', 'substitution', 'difficult_save'], required: true },
  player: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  assistPlayer: { type: Schema.Types.ObjectId, ref: 'Player' },
  substitutedPlayer: { type: Schema.Types.ObjectId, ref: 'Player' },
  team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
}, { timestamps: true })

export default mongoose.models.MatchEvent || mongoose.model('MatchEvent', MatchEventSchema)
