import mongoose, { Schema } from 'mongoose'

const MediaSchema = new Schema({
  url: { type: String, required: true },
  type: { type: String, enum: ['photo', 'video'], required: true },
  match: { type: Schema.Types.ObjectId, ref: 'Match' },
  description: { type: String },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

export default mongoose.models.Media || mongoose.model('Media', MediaSchema)
