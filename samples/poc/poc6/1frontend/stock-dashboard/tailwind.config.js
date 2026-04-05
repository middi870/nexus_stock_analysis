/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base:    '#090c12',
          surface: '#0d1117',
          card:    '#111820',
          hover:   '#161e2a',
          border:  '#1e2d3d',
        },
        accent: {
          cyan:   '#00d4ff',
          green:  '#00e676',
          red:    '#ff4757',
          amber:  '#ffa726',
          purple: '#7c4dff',
        },
        text: {
          primary:   '#e8edf5',
          secondary: '#8899aa',
          muted:     '#4a5568',
        },
      },
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
        body:    ['"DM Sans"', 'sans-serif'],
      },
      boxShadow: {
        glow:       '0 0 20px rgba(0, 212, 255, 0.15)',
        'glow-green': '0 0 20px rgba(0, 230, 118, 0.15)',
        'glow-red':   '0 0 20px rgba(255, 71, 87, 0.12)',
      },
      animation: {
        'fade-in':     'fadeIn 0.3s ease-out',
        'slide-up':    'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-slow':  'pulse 3s ease-in-out infinite',
        'shimmer':     'shimmer 1.6s linear infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
    },
  },
  plugins: [],
}
