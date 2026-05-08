export type Phase = 'group' | 'quarterfinal' | 'semifinal' | 'final'
export type MatchStatus = 'scheduled' | 'live' | 'finished'
export type EventType = 'goal' | 'yellow_card' | 'red_card' | 'substitution'
export type SuspensionReason = 'yellow_cards' | 'red_card' | 'disciplinary'
export type SuspensionStatus = 'pending' | 'serving' | 'completed'

export interface ITeam {
  _id: string
  name: string
  shortName: string
  color: string
  logo?: string
}

export interface IPlayer {
  _id: string
  name: string
  number: number
  team: ITeam | string
  photo?: string
  isActive: boolean
}

export interface IMatchEvent {
  _id: string
  match: string
  minute: number
  type: EventType
  player: IPlayer | string
  assistPlayer?: IPlayer | string
  team: ITeam | string
  substitutedPlayer?: IPlayer | string
}

export interface IMatch {
  _id: string
  homeTeam: ITeam | string
  awayTeam: ITeam | string
  homeScore: number
  awayScore: number
  phase: Phase
  round?: number
  status: MatchStatus
  date?: string
  venue?: string
  events: IMatchEvent[]
  matchNumber?: number
}

export interface ISuspension {
  _id: string
  player: IPlayer | string
  reason: SuspensionReason
  matchesToServe: number
  matchesServed: number
  status: SuspensionStatus
  disciplinaryNote?: string
  createdAt: string
}

export interface IPlayerStats {
  player: IPlayer
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  gamesPlayed: number
  isSuspended: boolean
  isWarned: boolean
}

export interface IStandingRow {
  team: ITeam
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}
