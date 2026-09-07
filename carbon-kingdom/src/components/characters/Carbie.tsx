import { Character } from './Character'
import carbyArt from '../../assets/characters/carby.webp'

export function Carbie({ line }: { line?: string }) {
  return (
    <Character
      svg={<img src={carbyArt} alt="Carbie" width="100%" height="100%" className="h-full w-full object-contain drop-shadow-md" />}
      name="Carbie"
      line={line}
    />
  )
}
