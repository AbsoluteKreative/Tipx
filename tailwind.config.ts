import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        surface: {
          DEFAULT: 'rgba(255, 255, 255, 0.03)',
          hover: 'rgba(255, 255, 255, 0.06)',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-hover': 'rgba(255, 255, 255, 0.15)',
        },
        aurora: {
          coral: '#ff6b6b',
          'coral-light': '#ff8787',
          amber: '#ffa94d',
          emerald: '#51cf66',
          'emerald-dark': '#40c057',
          purple: '#cc5de8',
          'purple-light': '#da77f2',
          blue: '#339af0',
          'blue-light': '#4dabf7',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'radial-gradient(at 20% 80%, rgba(255, 107, 107, 0.08) 0%, transparent 50%), radial-gradient(at 80% 20%, rgba(51, 154, 240, 0.08) 0%, transparent 50%), radial-gradient(at 50% 50%, rgba(204, 93, 232, 0.05) 0%, transparent 60%)',
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

export default config
