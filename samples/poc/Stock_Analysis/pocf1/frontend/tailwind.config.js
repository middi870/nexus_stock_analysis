/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base:    '#080b10',
          surface: '#0c1018',
          card:    '#101620',
          hover:   '#141c28',
          border:  '#1a2535',
          input:   '#0d1520',
        },
        accent: {
          cyan:   '#00d4ff',
          green:  '#00e676',
          red:    '#ff4757',
          amber:  '#ffa726',
          purple: '#a78bfa',
          blue:   '#60a5fa',
        },
        text: {
          primary:   '#e2e8f2',
          secondary: '#8899aa',
          muted:     '#475569',
          dim:       '#2a3a4e',
        },
      },
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
        body:    ['"DM Sans"', 'sans-serif'],
      },
      boxShadow: {
        'glow':        '0 0 24px rgba(0,212,255,0.12)',
        'glow-sm':     '0 0 12px rgba(0,212,255,0.10)',
        'glow-green':  '0 0 20px rgba(0,230,118,0.12)',
        'glow-red':    '0 0 20px rgba(255,71,87,0.10)',
        'panel':       '-8px 0 40px rgba(0,0,0,0.4)',
        'card':        '0 2px 20px rgba(0,0,0,0.25)',
      },
      screens: {
        'xs': '480px',
      },
    },
  },
  plugins: [],
}
