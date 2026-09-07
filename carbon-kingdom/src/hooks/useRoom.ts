import { useCallback, useEffect, useRef, useState } from 'react'
import { getAdapter } from '../services/realtime/getAdapter'
import { onAnswer, onLevelScore } from '../services/gameplayBus'
import type { Player } from '../types/player'
import type { RoomMode, RoomState, Team } from '../types/multiplayer'

function makePlayerId() {
  return `p_${Math.random().toString(36).slice(2, 10)}`
}

export function useRoom() {
  const [room, setRoom] = useState<RoomState | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [playerId] = useState(makePlayerId)
  const [joinError, setJoinError] = useState<string | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)
  // Sum of the final scores of levels this player has already finished —
  // the live per-question score pushed to the room (see the onLevelScore
  // effect below) is base + whatever the level currently on screen reports.
  const baseScoreRef = useRef(0)

  useEffect(() => () => unsubRef.current?.(), [])

  const subscribe = useCallback(async (roomCode: string) => {
    const adapter = await getAdapter()
    unsubRef.current?.()
    unsubRef.current = adapter.subscribeRoom(roomCode, setRoom)
  }, [])

  const createRoom = useCallback(
    async (mode: RoomMode, player: Player, team?: Team) => {
      baseScoreRef.current = 0
      const adapter = await getAdapter()
      const roomCode = await adapter.createRoom(mode)
      await adapter.joinRoom(roomCode, { id: playerId, name: player.name, avatarColor: player.avatarColor, team })
      setCode(roomCode)
      await subscribe(roomCode)
      return roomCode
    },
    [playerId, subscribe]
  )

  const joinRoom = useCallback(
    async (roomCode: string, player: Player) => {
      setJoinError(null)
      baseScoreRef.current = 0
      const adapter = await getAdapter()
      const result = await adapter.joinRoom(roomCode, { id: playerId, name: player.name, avatarColor: player.avatarColor })
      if (!result) {
        setJoinError('ไม่พบห้องนี้ กรุณาตรวจสอบรหัสห้องอีกครั้ง')
        return false
      }
      // team-battle rooms auto-balance: whichever team currently has fewer
      // players gets the new joiner (a coin flip on the very first join)
      if (result.mode === 'team-battle') {
        const others = Object.values(result.players ?? {}).filter(p => p.id !== playerId)
        const countA = others.filter(p => p.team === 'A').length
        const countB = others.filter(p => p.team === 'B').length
        const team: Team = countA <= countB ? 'A' : 'B'
        await adapter.updatePlayer(roomCode, playerId, { team })
      }
      setCode(roomCode)
      await subscribe(roomCode)
      return true
    },
    [playerId, subscribe]
  )

  const startGame = useCallback(async () => {
    if (!code) return
    const adapter = await getAdapter()
    await adapter.setStatus(code, 'playing')
  }, [code])

  const endGame = useCallback(async () => {
    if (!code) return
    const adapter = await getAdapter()
    await adapter.setStatus(code, 'ended')
  }, [code])

  const leaveRoom = useCallback(async () => {
    if (!code) return
    const adapter = await getAdapter()
    await adapter.leaveRoom(code, playerId)
    unsubRef.current?.()
    baseScoreRef.current = 0
    setCode(null)
    setRoom(null)
  }, [code, playerId])

  const reportLevelComplete = useCallback(
    async (levelIndex: number, deltaScore: number, badges: string[]) => {
      if (!code || !room) return
      // The level's own final score was already mirrored to the room live,
      // question by question (see the onLevelScore effect below) — folding
      // it into the running base here (rather than adding it to the room's
      // current score again) is what keeps the NEXT level's live pushes
      // offset correctly, without double-counting this one.
      baseScoreRef.current += deltaScore
      const adapter = await getAdapter()
      const me = room.players?.[playerId]
      await adapter.updatePlayer(code, playerId, {
        currentLevelIndex: levelIndex + 1,
        badges: [...new Set([...(me?.badges ?? []), ...badges])]
      })
    },
    [code, room, playerId]
  )

  // forward every answered question from the shared gameplay bus into the
  // room's live stats — drives the teacher dashboard's progress grid,
  // per-player accuracy, and the most-missed-question heatmap.
  useEffect(() => {
    if (!code) return
    const unsub = onAnswer(async evt => {
      const adapter = await getAdapter()
      const me = room?.players?.[playerId]
      const wasWrong = !evt.correct
      await adapter.updatePlayer(code, playerId, {
        questionsAnswered: (me?.questionsAnswered ?? 0) + 1,
        questionsWrong: (me?.questionsWrong ?? 0) + (wasWrong ? 1 : 0),
        consecutiveWrong: wasWrong ? (me?.consecutiveWrong ?? 0) + 1 : 0
      })
      if (wasWrong) await adapter.recordMiss(code, evt.questionId)
    })
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, playerId, room?.players])

  // mirror the currently-playing level's running score to the room live,
  // question by question and hint by hint — without this the teacher's
  // leaderboard only ever moved once per *completed* level, which for a
  // multi-minute level looked completely dead while a room full of
  // students was actively playing.
  useEffect(() => {
    if (!code) return
    const unsub = onLevelScore(liveScore => {
      void (async () => {
        const adapter = await getAdapter()
        await adapter.updatePlayer(code, playerId, { score: baseScoreRef.current + liveScore })
      })()
    })
    return unsub
  }, [code, playerId])

  return { room, code, playerId, joinError, createRoom, joinRoom, startGame, endGame, leaveRoom, reportLevelComplete }
}
