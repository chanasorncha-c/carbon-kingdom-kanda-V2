import { useCallback, useEffect, useRef, useState } from 'react'
import { getAdapter } from '../services/realtime/getAdapter'
import type { RoomMode, RoomState, RoomStatus } from '../types/multiplayer'

/**
 * URL for a teacher window dedicated to one specific room code — same
 * hash-routing scheme as the plain #teacher entry (see main.tsx), just with
 * the code appended.
 */
function roomWindowUrl(code: string) {
  const url = new URL(window.location.href)
  url.hash = `teacher/${code}`
  return url.toString()
}

/**
 * Teacher side: creates and controls a room, but is never itself a player in it.
 *
 * Every room lives in its own dedicated browser window/tab. Creating a room
 * — whether from the very first "สร้างห้อง" button or "สร้างห้องใหม่" from
 * inside an existing room's dashboard — always opens a brand-new window
 * pointed at that room's own code (see `createRoomInNewWindow`) instead of
 * swapping the current window's view out from under the teacher. That way a
 * teacher running several classes/periods at once gets one window per room
 * and can flip between them like any other browser tabs, and the window
 * that spun off a new room keeps showing exactly the room it already had.
 *
 * `initialCode` is how a window opened this way (#teacher/<CODE>) knows
 * which existing room to attach to on mount — it subscribes directly, it
 * never calls `createRoom` for it, since the room already exists.
 */
export function useTeacherRoom(initialCode?: string | null) {
  const [room, setRoom] = useState<RoomState | null>(null)
  const [code] = useState<string | null>(initialCode ?? null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const unsubRef = useRef<(() => void) | null>(null)
  // Mirrors `room` synchronously (state updates are async/batched) so the
  // stall watchdog below can check "has real room data arrived yet?" without
  // depending on `room` and re-running the whole effect on every update.
  const roomRef = useRef<RoomState | null>(null)

  useEffect(() => () => unsubRef.current?.(), [])

  const attach = useCallback((roomCode: string) => {
    unsubRef.current?.()
    roomRef.current = null
    void (async () => {
      const adapter = await getAdapter()
      unsubRef.current = adapter.subscribeRoom(
        roomCode,
        state => {
          roomRef.current = state
          setRoom(state)
          // Real data made it through — clear any earlier stall/permission warning.
          if (state) setError(null)
        },
        err => {
          // Rules can allow WRITE but deny READ (or vice versa) — the room
          // gets created but this window can never subscribe to it.
          const message = err instanceof Error ? err.message : String(err)
          setError(`เชื่อมต่อห้องสำเร็จ แต่อ่านข้อมูลห้องไม่ได้: ${message}`)
        }
      )

      // Belt-and-suspenders: if neither real data nor a permission error
      // shows up at all within a few seconds, something is stalled silently
      // — say so instead of leaving the teacher staring at an empty screen.
      setTimeout(() => {
        if (!roomRef.current) {
          setError(
            'เชื่อมต่อห้อง ' +
              roomCode +
              ' แล้ว แต่ยังดึงข้อมูลห้องไม่ได้ — ส่วนใหญ่เกิดจาก Realtime Database Rules อนุญาตให้เขียนแต่ไม่อนุญาตให้อ่าน ตรวจสอบ Rules ใน Firebase Console'
          )
        }
      }, 8000)
    })()
  }, [])

  // A window opened for a specific room (#teacher/<code>) attaches to that
  // existing room immediately on mount — it never creates a new one.
  useEffect(() => {
    if (initialCode) attach(initialCode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Creates a brand-new room and opens it in its own dedicated browser
  // window/tab, leaving *this* window's current room (if any) completely
  // untouched. The window is opened synchronously, before the `await`, so
  // browsers still recognize it as a direct result of the click and don't
  // block it as a pop-up once the async room-creation call resolves later —
  // it starts as a small "กำลังสร้างห้อง..." holding page and is navigated
  // to the finished room's own URL once the code comes back.
  const createRoomInNewWindow = useCallback(async (mode: RoomMode) => {
    setError(null)
    setCreating(true)
    let win: Window | null = null
    try {
      win = window.open('', '_blank')
    } catch {
      win = null
    }
    if (win) {
      try {
        win.document.title = 'กำลังสร้างห้อง...'
        win.document.body.style.cssText =
          'display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:system-ui,sans-serif;background:#faf5ec;color:#8a7a63;font-size:1.1rem;'
        win.document.body.textContent = 'กำลังสร้างห้อง...'
      } catch {
        // best-effort loading placeholder only — never fatal
      }
    }
    try {
      const adapter = await getAdapter()
      // A real network/connectivity problem (blocked host, no internet,
      // wrong databaseURL) can make the Firebase SDK hang and quietly retry
      // forever instead of rejecting — without a timeout the button would be
      // stuck on "..." with no feedback at all.
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('หมดเวลาเชื่อมต่อ (10 วินาที) — ตรวจสอบอินเทอร์เน็ต หรือ databaseURL ใน firebaseConfig.ts')), 10000)
      )
      const roomCode = await Promise.race([adapter.createRoom(mode), timeout])
      const url = roomWindowUrl(roomCode)
      if (win) {
        win.location.href = url
      } else {
        // Pop-up got blocked (or opening it threw) — the room WAS created
        // successfully in the backend, so hand the teacher the code and the
        // exact link instead of silently losing it.
        setError(
          `สร้างห้องสำเร็จ (รหัส ${roomCode}) แต่เบราว์เซอร์บล็อกการเปิดหน้าต่างใหม่ — กรุณาอนุญาตป๊อปอัปสำหรับเว็บนี้แล้วลองอีกครั้ง หรือเปิดลิงก์นี้เอง: ${url}`
        )
      }
      return roomCode
    } catch (err) {
      win?.close()
      // Most often a Firebase Realtime Database permission/rules problem
      // (rules don't allow the write) or the databaseURL/project being
      // unreachable — surface the raw message so it can actually be fixed
      // instead of the button silently doing nothing.
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      console.error('[Carbon Kingdom] createRoom failed:', err)
      return null
    } finally {
      setCreating(false)
    }
  }, [])

  const setStatus = useCallback(
    async (status: RoomStatus) => {
      if (!code) return
      const adapter = await getAdapter()
      await adapter.setStatus(code, status)
    },
    [code]
  )

  const resetScores = useCallback(async () => {
    if (!code) return
    const adapter = await getAdapter()
    await adapter.resetScores(code)
  }, [code])

  return { room, code, error, creating, createRoomInNewWindow, setStatus, resetScores }
}
