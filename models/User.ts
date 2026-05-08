import mongoose, { Schema } from 'mongoose'
import bcrypt from 'bcryptjs'

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'organizer'], default: 'organizer' },
  organizerNumber: { type: String },
  permissions: {
    createTeams:        { type: Boolean, default: false },
    editTeams:          { type: Boolean, default: false },
    createMatches:      { type: Boolean, default: false },
    editMatches:        { type: Boolean, default: false },
    editLive:           { type: Boolean, default: false },
    managePlayers:      { type: Boolean, default: false },
    manageSuspensions:  { type: Boolean, default: false },
  },
}, { timestamps: true })

UserSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10)
  }
})

export default mongoose.models.User || mongoose.model('User', UserSchema)
