import type { RealtimeAdapter, RoomMode, RoomPlayerState, RoomState, RoomStatus } from '../../types/multiplayer'

// No backend available: rooms live in this browser's localStorage, and every
// open tab/window on the same device hears about changes instantly via
// BroadcastChannel (with a localStorage 'storage' event as a same-origin
// cross-tab fallback for browsers where BroadcastChannel is unavailable).
// This is genuinely useful for testing multiplayer flows and for a
// single shared classroom display + students on the same machine; for real
// cross-device classroom play, swap in FirebaseAdapter (see SETUP.md).

const STORAGE_PREFIX = 'carbon-kingdom-room-'
const CHANNEL_PREFIX = 'carbon-kingdom-room-'

function storageKey(code: string) {
  return `${STORAGE_PREFIX}${code}`
}

function readRoom(code: string): RoomState | null {
  try {
    const raw = localStorage.getItem(storageKey(code))
    return raw ? (JSON.parse(raw) as RoomState) : null
  } catch {
    return null
  }
}

function writeRoom(state: RoomState) {
  localStorage.setItem(storageKey(state.code), JSON.stringify(state))
  try {
    new BroadcastChannel(`${CHANNEL_PREFIX}${state.code}`).postMessage('update')
  } catch {
    // BroadcastChannel unsupported — the native 'storage' event still fires
    // in other tabs since we wrote to localStorage above.
  }
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function readAllRooms(): RoomState[] {
  const rooms: RoomState[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(STORAGE_PREFIX)) continue
    try {
      const raw = localStorage.getItem(key)
      if (raw) rooms.push(JSON.parse(raw) as RoomState)
    } catch {
      // ignore a corrupt/partial entry rather than let it break the whole list
    }
  }
  return rooms
}

export function createLocalAdapter(): RealtimeAdapter {
  return {
    kind: 'local',

    async createRoom(mode: RoomMode) {
      let code = generateCode()
      // avoid the astronomically unlikely but easy-to-guard collision
      while (readRoom(code)) code = generateCode()
      const state: RoomState = {
        code,
        mode,
        status: 'lobby',
        createdAt: Date.now(),
        teacherPresent: true,
        players: {},
        missedCounts: {}
      }
      writeRoom(state)
      return code
    },

    async joinRoom(code, player) {
      const room = readRoom(code)
      if (!room) return null
      const full: RoomPlayerState = {
        ...player,
        currentLevelIndex: 0,
        score: 0,
        badges: [],
        questionsAnswered: 0,
        questionsWrong: 0,
        consecutiveWrong: 0,
        connectedAt: Date.now(),
        lastUpdateAt: Date.now()
      }
      room.players[player.id] = full
      writeRoom(room)
      return room
    },

    subscribeRoom(code, cb) {
      let channel: BroadcastChannel | null = null
      const push = () => cb(readRoom(code))
      push()

      try {
        channel = new BroadcastChannel(`${CHANNEL_PREFIX}${code}`)
        channel.onmessage = push
      } catch {
        // ignored — handled by the storage listener below
      }

      const onStorage = (e: StorageEvent) => {
        if (e.key === storageKey(code)) push()
      }
      window.addEventListener('storage', onStorage)

      // light polling safety net: catches same-tab writes and any browser
      // quirk where the events above don't fire reliably
      const interval = window.setInterval(push, 1500)

      return () => {
        channel?.close()
        window.removeEventListener('storage', onStorage)
        window.clearInterval(interval)
      }
    },

    async updatePlayer(code, playerId, patch) {
      const room = readRoom(code)
      if (!room || !room.players[playerId]) return
      room.players[playerId] = { ...room.players[playerId], ...patch, lastUpdateAt: Date.now() }
      writeRoom(room)
    },

    async recordMiss(code, questionId) {
      const room = readRoom(code)
      if (!room) return
      room.missedCounts[questionId] = (room.missedCounts[questionId] ?? 0) + 1
      writeRoom(room)
    },

    async setStatus(code, status: RoomStatus) {
      const room = readRoom(code)
      if (!room) return
      room.status = status
      writeRoom(room)
    },

    async leaveRoom(code, playerId) {
      const room = readRoom(code)
      if (!room) return
      delete room.players[playerId]
      writeRoom(room)
    },

    async resetScores(code) {
      const room = readRoom(code)
      if (!room) return
      for (const playerId of Object.keys(room.players)) {
        room.players[playerId] = {
          ...room.players[playerId],
          score: 0,
          badges: [],
          currentLevelIndex: 0,
          questionsAnswered: 0,
          questionsWrong: 0,
          consecutiveWrong: 0
        }
      }
      room.missedCounts = {}
      writeRoom(room)
    },

    subscribeAllRooms(cb) {
      const push = () => cb(readAllRooms())
      push()

      // BroadcastChannel is per-room-code here, so for "every room" we lean
      // on the same-origin 'storage' event (fires for any key change from
      // another tab) plus a polling safety net, matching subscribeRoom above.
      const onStorage = (e: StorageEvent) => {
        if (!e.key || e.key.startsWith(STORAGE_PREFIX)) push()
      }
      window.addEventListener('storage', onStorage)
      const interval = window.setInterval(push, 1500)

      return () => {
        window.removeEventListener('storage', onStorage)
        window.clearInterval(interval)
      }
    }
  }
}
