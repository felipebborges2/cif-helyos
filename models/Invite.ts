import mongoose, { Schema } from 'mongoose'

const InviteSchema = new Schema({
  token: { type: String, required: true, unique: true },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
  usedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

export default mongoose.models.Invite || mongoose.model('Invite', InviteSchema)
