import mongoose, { Schema } from 'mongoose'

const MatchSchema = new Schema({
  homeTeam: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  awayTeam: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  homeScore: { type: Number, default: 0 },
  awayScore: { type: Number, default: 0 },
  phase: { type: String, enum: ['group', 'quarterfinal', 'semifinal', 'final'], required: true },
  round: { type: Number }, // para fase de grupos: rodada
  matchNumber: { type: Number }, // numeração geral
  status: { type: String, enum: ['scheduled', 'live', 'finished'], default: 'scheduled' },
  date: { type: Date },
  venue: { type: String },
  half: { type: Number, default: 1 },
  manOfTheMatch: { type: Schema.Types.ObjectId, ref: 'Player' },
  timerRunning: { type: Boolean, default: false },
  timerStartedAt: { type: Date },
  timerElapsedMs: { type: Number, default: 0 },
}, { timestamps: true })

export default mongoose.models.Match || mongoose.model('Match', MatchSchema)
