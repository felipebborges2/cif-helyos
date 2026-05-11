import mongoose from 'mongoose'

const LOCAL_URI = 'mongodb://localhost:27017/cif-helyos'
const ATLAS_URI = process.env.ATLAS_URI

if (!ATLAS_URI) {
  console.error('Defina a variável ATLAS_URI')
  process.exit(1)
}

const COLLECTIONS = ['teams', 'players', 'matches', 'matchevents', 'suspensions', 'users', 'medias']

const local = await mongoose.createConnection(LOCAL_URI).asPromise()
const atlas = await mongoose.createConnection(ATLAS_URI).asPromise()

console.log('Conectado nos dois bancos. Iniciando migração...\n')

for (const name of COLLECTIONS) {
  const docs = await local.db.collection(name).find({}).toArray()
  if (docs.length === 0) {
    console.log(`  ${name}: vazio, pulando`)
    continue
  }
  await atlas.db.collection(name).deleteMany({})
  await atlas.db.collection(name).insertMany(docs)
  console.log(`  ${name}: ${docs.length} documento(s) migrado(s)`)
}

await local.close()
await atlas.close()

console.log('\nMigração concluída!')
