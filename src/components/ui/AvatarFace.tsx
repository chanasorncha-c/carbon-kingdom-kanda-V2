export const AVATAR_COLORS = [
  '#A8E6CF', // mint
  '#FFD3B6', // peach
  '#FFF5BA', // cream
  '#C7CEEA', // lavender
  '#FFAAA5', // coral
  '#8FD3FE', // sky
  '#B5EAD7', // seafoam
  '#FFB7D5' // bubblegum
]

/** A generic chibi face used for the avatar picker — same style family as the characters, just recolored. */
export function AvatarFace({ color, size = 56 }: { color: string; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <circle cx="50" cy="50" r="42" fill={color} stroke="#00000022" strokeWidth="3" />
      <circle cx="36" cy="46" r="5" fill="#1F2937" />
      <circle cx="64" cy="46" r="5" fill="#1F2937" />
      <circle cx="28" cy="58" r="6" fill="#FFAAA5" opacity="0.55" />
      <circle cx="72" cy="58" r="6" fill="#FFAAA5" opacity="0.55" />
      <path d="M38 62 Q50 70 62 62" stroke="#1F2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}
