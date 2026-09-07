export type Element = 'C' | 'H' | 'O' | 'N' | 'F' | 'Cl' | 'Br' | 'I'

export interface AtomNode {
  id: string
  x: number
  y: number
  element: Element
}

export interface Bond {
  from: string
  to: string
  order: 1 | 2 | 3
}

export interface MoleculeStructure {
  atoms: AtomNode[]
  bonds: Bond[]
}
