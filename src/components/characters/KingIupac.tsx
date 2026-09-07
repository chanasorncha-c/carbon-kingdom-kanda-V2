import { Character } from './Character'
import kingArt from '../../assets/characters/king.webp'

export function KingIupac({ line }: { line?: string }) {
  return (
    <Character
      svg={<img src={kingArt} alt="King IUPAC" width="100%" height="100%" className="h-full w-full object-contain drop-shadow-md" />}
      name="King IUPAC"
      line={line}
    />
  )
}
