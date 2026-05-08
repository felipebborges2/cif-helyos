import mongoose from 'mongoose'

const MONGODB_URI = 'mongodb://localhost:27017/cif-helyos'

await mongoose.connect(MONGODB_URI)

const db = mongoose.connection.db

const matches    = await db.collection('matches').deleteMany({})
const events     = await db.collection('matchevents').deleteMany({})
const suspensions = await db.collection('suspensions').deleteMany({})
const players    = await db.collection('players').updateMany({}, { $set: { yellowCardCount: 0 } })

console.log(`✓ Partidas removidas:     ${matches.deletedCount}`)
console.log(`✓ Eventos removidos:      ${events.deletedCount}`)
console.log(`✓ Suspensões removidas:   ${suspensions.deletedCount}`)
console.log(`✓ Jogadores zerados:      ${players.modifiedCount}`)
console.log('\nTimes, jogadores e usuários preservados.')

await mongoose.disconnect()
