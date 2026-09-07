import { Character } from './Character'
import methylArt from '../../assets/characters/methyl.webp'

export function ProfessorMethyl({ line }: { line?: string }) {
  return (
    <Character
      svg={<img src={methylArt} alt="Professor Methyl" width="100%" height="100%" className="h-full w-full object-contain drop-shadow-md" />}
      name="Professor Methyl"
      line={line}
    />
  )
}
