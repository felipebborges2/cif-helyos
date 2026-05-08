import { connectDB } from './db'
import Player from '@/models/Player'
import Suspension from '@/models/Suspension'
import type { Phase } from '@/types'

/**
 * Chamada após registrar um cartão amarelo.
 * Se atingir 3, cria suspensão e zera o contador.
 */
export async function handleYellowCard(playerId: string, phase: Phase) {
  await connectDB()
  const player = await Player.findById(playerId)
  if (!player) return

  player.yellowCardCount += 1

  if (player.yellowCardCount >= 3) {
    await Suspension.create({
      player: playerId,
      reason: 'yellow_cards',
      matchesToServe: 1,
      matchesServed: 0,
      status: 'pending',
      originPhase: phase,
    })
    player.yellowCardCount = 0
  }

  await player.save()
}

/**
 * Chamada após registrar um cartão vermelho normal.
 * Cria suspensão de 1 jogo automaticamente.
 */
export async function handleRedCard(playerId: string, phase: Phase) {
  await connectDB()
  await Suspension.create({
    player: playerId,
    reason: 'red_card',
    matchesToServe: 1,
    matchesServed: 0,
    status: 'pending',
    originPhase: phase,
  })
}

/**
 * Zera os cartões amarelos de todos os jogadores na virada de fase grupos → mata-mata.
 * Suspensões pendentes NÃO são zeradas (são cumpridas na próxima fase).
 */
export async function transitionToKnockout() {
  await connectDB()
  await Player.updateMany({}, { yellowCardCount: 0 })
}

/**
 * Retorna o status de suspensão de um jogador.
 */
export async function getPlayerSuspensionStatus(playerId: string) {
  await connectDB()
  const player = await Player.findById(playerId)
  const pendingSuspension = await Suspension.findOne({
    player: playerId,
    status: 'pending',
  })

  return {
    isSuspended: !!pendingSuspension,
    isWarned: !pendingSuspension && player?.yellowCardCount === 2,
    yellowCardCount: player?.yellowCardCount ?? 0,
  }
}
