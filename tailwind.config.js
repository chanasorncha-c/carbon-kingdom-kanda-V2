/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Wood/parchment adventure reskin — the five semantic level/status
        // tokens keep their names (and hue family, so success/error/etc.
        // meaning stays intact) but are re-tuned to the fantasy palette.
        mint: '#7BE8B0',
        peach: '#E8B878',
        cream: '#ECDCB2',
        lavender: '#8FA8D6',
        coral: '#E2603F',
        'mint-ink': '#14351F',
        'peach-ink': '#5A3616',
        'cream-ink': '#2C1E12',
        'lavender-ink': '#20304F',
        'coral-ink': '#4A170C',

        // every bg-white/NN card across the app becomes a parchment panel —
        // a single high-leverage swap instead of touching each component.
        white: '#F6ECD3',

        // new chrome tokens for wood frames, gold accents, dark backdrop
        void: '#151009',
        'void-deep': '#0C0906',
        'wood-dark': '#3A2415',
        wood: '#6B4423',
        'wood-light': '#9C6B3D',
        'wood-grain': '#7D5730',
        parchment: '#ECDCB2',
        'parchment-dim': '#D8C393',
        gold: '#E3B34E',
        'gold-bright': '#FFD873',
        ink: '#2C1E12',
        ember: '#E2603F',
        'ember-dim': '#A63E28',
        forest: '#213A26',
        'forest-deep': '#152219'
      },
      fontFamily: {
        // Chonburi + Kanit both ship full Thai coverage, so no separate
        // Thai-fallback face is needed (see index.html for the Google
        // Fonts import).
        display: ['"Chonburi"', 'serif'],
        heading: ['"Kanit"', 'sans-serif'],
        body: ['"Kanit"', 'sans-serif']
      },
      borderRadius: {
        blob: '1.1rem'
      },
      boxShadow: {
        soft: '0 4px 0 rgba(58,36,21,0.4), 0 10px 22px rgba(0,0,0,0.45)'
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' }
        },
        pop: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '60%': { transform: 'scale(1.05)', opacity: '1' },
          '100%': { transform: 'scale(1)' }
        }
      },
      animation: {
        shake: 'shake 0.4s ease-in-out',
        pop: 'pop 0.35s ease-out'
      }
    }
  },
  plugins: []
}
