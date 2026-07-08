/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mipos: {
          bg: '#07070E',
          bg2: '#0D0D1C',
          bg3: '#111126',
          green: '#00E87A',
          greenDim: 'rgba(0,232,122,.12)',
          orange: '#FF6B35',
          purple: '#7C3AED',
          txt: '#EEEEFF',
          txt2: '#8888AA',
          txt3: '#44445A',
          border: 'rgba(255,255,255,.07)',
        }
      },
      fontFamily: {
        head: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
