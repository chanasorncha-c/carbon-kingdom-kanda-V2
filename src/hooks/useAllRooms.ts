import { useEffect, useState } from 'react'
import { getAdapter } from '../services/realtime/getAdapter'
import type { RoomState } from '../types/multiplayer'

/**
 * Live list of every currently-known room — powers the teacher dashboard's
 * "all rooms combined" leaderboard view. Only subscribes while `active` is
 * true, so a teacher who never opens that view doesn't pay for a
 * whole-database listener just for viewing their own room.
 */
export function useAllRooms(active: boolean) {
  const [rooms, setRooms] = useState<RoomState[]>([])

  useEffect(() => {
    if (!active) return
    let unsub: (() => void) | undefined
    let cancelled = false
    void (async () => {
      const adapter = await getAdapter()
      if (cancelled) return
      unsub = adapter.subscribeAllRooms(setRooms)
    })()
    return () => {
      cancelled = true
      unsub?.()
    }
  }, [active])

  return rooms
}
