import { Character } from './Character'
import chloroArt from '../../assets/characters/chloro.webp'

export function Chloro({ line }: { line?: string }) {
  return (
    <Character
      svg={<img src={chloroArt} alt="Chloro the Trickster" width="100%" height="100%" className="h-full w-full object-contain drop-shadow-md" />}
      name="Chloro the Trickster"
      line={line}
    />
  )
}
