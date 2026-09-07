import { Character } from './Character'
import hydrochicArt from '../../assets/characters/hydrochic.webp'

export function HydroChick({ line }: { line?: string }) {
  return (
    <Character
      svg={<img src={hydrochicArt} alt="Hydro-Chick" width="100%" height="100%" className="h-full w-full object-contain drop-shadow-md" />}
      name="Hydro-Chick"
      line={line}
      size={64}
    />
  )
}
