export type RoomMode = 'class-race' | 'team-battle'
export type RoomStatus = 'lobby' | 'playing' | 'ended'
export type Team = 'A' | 'B'

export interface MissedQuestion {
  levelId: string
  questionId: string
  count: number
}

export interface RoomPlayerState {
  id: string
  name: string
  avatarColor: string
  team?: Team
  currentLevelIndex: number
  score: number
  badges: string[]
  questionsAnswered: number
  questionsWrong: number
  consecutiveWrong: number
  connectedAt: number
  lastUpdateAt: number
}

export interface RoomState {
  code: string
  mode: RoomMode
  status: RoomStatus
  createdAt: number
  teacherPresent: boolean
  players: Record<string, RoomPlayerState>
  /** questionId -> wrong-attempt count, across every player in the room (drives the teacher heatmap). */
  missedCounts: Record<string, number>
}

/**
 * Backend-agnostic sync interface. LocalAdapter (BroadcastChannel + localStorage)
 * works out of the box on one device across browser tabs — good for testing
 * and for a single shared classroom screen. FirebaseAdapter implements the
 * same contract against Firebase Realtime Database for real cross-device
 * classroom play once a teacher adds their own Firebase config (see SETUP.md).
 */
export interface RealtimeAdapter {
  readonly kind: 'local' | 'firebase'
  createRoom(mode: RoomMode): Promise<string>
  joinRoom(code: string, player: Omit<RoomPlayerState, 'currentLevelIndex' | 'score' | 'badges' | 'questionsAnswered' | 'questionsWrong' | 'consecutiveWrong' | 'connectedAt' | 'lastUpdateAt'>): Promise<RoomState | null>
  subscribeRoom(code: string, cb: (state: RoomState | null) => void, onError?: (err: unknown) => void): () => void
  updatePlayer(code: string, playerId: string, patch: Partial<RoomPlayerState>): Promise<void>
  recordMiss(code: string, questionId: string): Promise<void>
  setStatus(code: string, status: RoomStatus): Promise<void>
  leaveRoom(code: string, playerId: string): Promise<void>
  /** Resets every player's score/progress/badges in the room back to zero (keeps the room and its players, just clears the scoreboard) and clears the missed-question heatmap. */
  resetScores(code: string): Promise<void>
  /** All currently-known rooms, live — powers the teacher dashboard's "all rooms combined" leaderboard view. */
  subscribeAllRooms(cb: (rooms: RoomState[]) => void): () => void
}
