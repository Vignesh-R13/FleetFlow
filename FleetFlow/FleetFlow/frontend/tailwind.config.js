/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060D17',
          900: '#0B1524',
          850: '#0F1D30',
          800: '#14263E',
          700: '#1E3A5C',
          600: '#2B4E78',
          500: '#3D6899',
        },
        sea: {
          600: '#156575',
          500: '#1B7A8C',
          400: '#2C97AB',
          300: '#52B3C5',
          200: '#8AD0DE',
        },
        ocean: {
          900: '#071626',
          800: '#0D2742',
          700: '#143C66',
          600: '#1C548E',
          500: '#0284C7',
          400: '#38BDF8',
        },
        signal: {
          500: '#D9A441',
          600: '#BD8A2C',
        },
        status: {
          active: '#1B8A5A',
          idle: '#7A8699',
          maintenance: '#D9A441',
          offline: '#C0453A',
          critical: '#C0453A',
          warning: '#D9A441',
          info: '#2C97AB',
        },
      },
      fontFamily: {
        sans: ['"Public Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 3px rgba(6, 13, 23, 0.08), 0 1px 2px rgba(6, 13, 23, 0.04)',
        'panel-hover': '0 4px 12px -2px rgba(6, 13, 23, 0.12), 0 2px 6px -1px rgba(6, 13, 23, 0.08)',
        'glow-teal': '0 0 15px rgba(44, 151, 171, 0.35)',
        'glow-critical': '0 0 15px rgba(192, 69, 58, 0.4)',
        'glow-amber': '0 0 15px rgba(217, 164, 65, 0.35)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
};
