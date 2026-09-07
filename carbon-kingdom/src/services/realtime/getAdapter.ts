import type { RealtimeAdapter } from '../../types/multiplayer'
import { createLocalAdapter } from './LocalAdapter'
import { tryCreateFirebaseAdapter } from './FirebaseAdapter'

let cached: RealtimeAdapter | null = null

/** Firebase if configured + installed, otherwise the always-available local (same-device) adapter. */
export async function getAdapter(): Promise<RealtimeAdapter> {
  if (cached) return cached
  cached = (await tryCreateFirebaseAdapter()) ?? createLocalAdapter()
  return cached
}
