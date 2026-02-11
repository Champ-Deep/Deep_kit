/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-core': '#000000',
        'cyber-teal': '#00F2FF',
        'phosphor-green': '#39FF14',
        'bright-amber': '#FFB000',
        'ghost-mono': '#A0A0A0',
        'error-red': '#FF3B3B',
        'card-bg': '#0a0a0a',
        'border-default': '#1a1a1a',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
