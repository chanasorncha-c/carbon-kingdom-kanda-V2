import { Character } from './Character'
import hydroxyArt from '../../assets/characters/hydroxy.webp'

export function AuntieHydroxy({ line }: { line?: string }) {
  return (
    <Character
      svg={<img src={hydroxyArt} alt="Auntie Hydroxy" width="100%" height="100%" className="h-full w-full object-contain drop-shadow-md" />}
      name="Auntie Hydroxy"
      line={line}
    />
  )
}
