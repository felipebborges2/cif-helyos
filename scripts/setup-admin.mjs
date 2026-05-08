import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const MONGODB_URI = 'mongodb://localhost:27017/copa-helyos'
const ADMIN_EMAIL = 'felipebborges_@outlook.com'

await mongoose.connect(MONGODB_URI)

const UserSchema = new mongoose.Schema({
  name:            String,
  email:           { type: String, unique: true },
  password:        String,
  role:            String,
  organizerNumber: String,
  permissions:     mongoose.Schema.Types.Mixed,
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', UserSchema)

let user = await User.findOne({ email: ADMIN_EMAIL })

if (!user) {
  const hashed = await bcrypt.hash('helyos2026', 10)
  const num = String(Math.floor(1000 + Math.random() * 9000))
  user = await User.create({
    name: 'Felipe Borges',
    email: ADMIN_EMAIL,
    password: hashed,
    role: 'admin',
    organizerNumber: num,
    permissions: {
      createTeams: true, editTeams: true,
      createMatches: true, editMatches: true,
      editLive: true, managePlayers: true,
      manageSuspensions: true,
    },
  })
  console.log(`✓ Usuário admin criado — senha temporária: helyos2026`)
} else {
  await User.updateOne({ email: ADMIN_EMAIL }, {
    $set: {
      role: 'admin',
      'permissions.createTeams': true,
      'permissions.editTeams': true,
      'permissions.createMatches': true,
      'permissions.editMatches': true,
      'permissions.editLive': true,
      'permissions.managePlayers': true,
      'permissions.manageSuspensions': true,
    }
  })
  console.log(`✓ Usuário existente promovido a admin`)
}

console.log(`   Email: ${ADMIN_EMAIL}`)
console.log(`   Número: ${user.organizerNumber}`)
await mongoose.disconnect()
