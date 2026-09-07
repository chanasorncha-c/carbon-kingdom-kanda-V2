import type { RealtimeAdapter, RoomMode, RoomPlayerState, RoomState, RoomStatus } from '../../types/multiplayer'
import { firebaseConfig } from './firebaseConfig'

// Real cross-device classroom multiplayer via Firebase Realtime Database.
// Inactive unless firebaseConfig.ts has real credentials — getAdapter() falls
// back to the local same-device adapter when it's null. The "firebase"
// package is a real dependency (see package.json), loaded via a plain
// dynamic import() so Vite code-splits it into its own chunk that's only
// fetched once a room is actually created/joined, instead of bloating the
// main bundle for the (common) case where a class never touches multiplayer.
// (An earlier version of this file built the specifier from a joined array
// with /* @vite-ignore */ specifically so the app would still build if
// "firebase" wasn't installed — but that also stops Vite from ever bundling
// the module, so the dynamic import 404s in the browser even when the
// package IS installed. Since firebase is now always installed, a literal
// specifier is both simpler and the one that actually works.)

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

// Realtime Database silently drops empty-object nodes: writing
// `players: {}` and reading it straight back gives `players: undefined`,
// not `{}`. Every consumer in the app (leaderboard, progress grid, heatmap,
// student join) assumes `room.players` / `room.missedCounts` are always
// real objects and calls Object.values/Object.entries on them directly —
// so an un-normalized room crashes the whole app the moment a freshly
// created (still-empty) room is read back, a few seconds after the room
// code first appears. Normalize at this single choke point so nothing
// downstream ever has to special-case it.
function normalizeRoom(raw: any): RoomState {
  return {
    ...raw,
    players: raw?.players ?? {},
    missedCounts: raw?.missedCounts ?? {}
  }
}

export async function tryCreateFirebaseAdapter(): Promise<RealtimeAdapter | null> {
  if (!firebaseConfig) return null

  let appMod: any
  let dbMod: any
  try {
    appMod = await import('firebase/app')
    dbMod = await import('firebase/database')
  } catch {
    console.warn('[Carbon Kingdom] firebaseConfig is set but the "firebase" package failed to load. Falling back to local same-device multiplayer.')
    return null
  }

  const { initializeApp } = appMod
  const { getDatabase, ref, set, update, onValue, off, get, runTransaction } = dbMod

  const app = initializeApp(firebaseConfig)
  const db = getDatabase(app)

  return {
    kind: 'firebase',

    async createRoom(mode: RoomMode) {
      let code = generateCode()
      // guard against an (unlikely) code collision against a live room
      for (let attempt = 0; attempt < 5; attempt++) {
        const snap = await get(ref(db, `rooms/${code}`))
        if (!snap.exists()) break
        code = generateCode()
      }
      const state: RoomState = {
        code,
        mode,
        status: 'lobby',
        createdAt: Date.now(),
        teacherPresent: true,
        players: {},
        missedCounts: {}
      }
      await set(ref(db, `rooms/${code}`), state)
      return code
    },

    async joinRoom(code, player) {
      const snap = await get(ref(db, `rooms/${code}`))
      if (!snap.exists()) return null
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
      await set(ref(db, `rooms/${code}/players/${player.id}`), full)
      const fresh = await get(ref(db, `rooms/${code}`))
      return fresh.exists() ? normalizeRoom(fresh.val()) : null
    },

    subscribeRoom(code, cb, onError) {
      const roomRef = ref(db, `rooms/${code}`)
      // The cancelCallback (3rd arg) fires when the listen itself is denied —
      // e.g. Realtime Database rules allow writes but not reads. Without it,
      // a permission-denied read fails completely silently: cb is simply
      // never called again, so the UI just sits there with no data and no
      // error, which is indistinguishable from "still loading".
      const listener = onValue(
        roomRef,
        (snap: any) => cb(snap.exists() ? normalizeRoom(snap.val()) : null),
        (err: unknown) => {
          console.error('[Carbon Kingdom] subscribeRoom denied/failed:', err)
          onError?.(err)
        }
      )
      return () => off(roomRef, 'value', listener)
    },

    async updatePlayer(code, playerId, patch) {
      await update(ref(db, `rooms/${code}/players/${playerId}`), { ...patch, lastUpdateAt: Date.now() })
    },

    async recordMiss(code, questionId) {
      await runTransaction(ref(db, `rooms/${code}/missedCounts/${questionId}`), (current: number | null) => (current ?? 0) + 1)
    },

    async setStatus(code, status: RoomStatus) {
      await update(ref(db, `rooms/${code}`), { status })
    },

    async leaveRoom(code, playerId) {
      await set(ref(db, `rooms/${code}/players/${playerId}`), null)
    },

    async resetScores(code) {
      const snap = await get(ref(db, `rooms/${code}/players`))
      const players = snap.exists() ? snap.val() : {}
      // One multi-path update: keeps each player's identity (name, avatar,
      // team) but zeroes everything scoring-related, and clears the
      // most-missed-question heatmap for a clean slate.
      const updates: Record<string, unknown> = { missedCounts: null }
      for (const playerId of Object.keys(players)) {
        updates[`players/${playerId}/score`] = 0
        updates[`players/${playerId}/badges`] = null
        updates[`players/${playerId}/currentLevelIndex`] = 0
        updates[`players/${playerId}/questionsAnswered`] = 0
        updates[`players/${playerId}/questionsWrong`] = 0
        updates[`players/${playerId}/consecutiveWrong`] = 0
      }
      await update(ref(db, `rooms/${code}`), updates)
    },

    subscribeAllRooms(cb) {
      // Reads the whole rooms/ tree — fine at classroom scale (a handful of
      // concurrently active rooms), not meant for a large multi-school
      // deployment sharing one database.
      const roomsRef = ref(db, 'rooms')
      const listener = onValue(roomsRef, (snap: any) => {
        if (!snap.exists()) {
          cb([])
          return
        }
        const val = snap.val()
        cb(Object.values(val).map((raw: any) => normalizeRoom(raw)))
      })
      return () => off(roomsRef, 'value', listener)
    }
  }
}
