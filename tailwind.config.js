/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: '#070809',
        panel: '#0D0F11',
        // Clinical teal->cyan accent (medical, not the portfolio's orange — its own identity)
        vital: {
          DEFAULT: '#2DD4BF',
          50: '#ECFDF9', 100: '#CFFAF0', 200: '#9DF3E1', 300: '#5EE9CF',
          400: '#2DD4BF', 500: '#14B8A6', 600: '#0D9488', 700: '#0F766E',
        },
        // Risk gradient anchors
        risk: { low: '#34D399', mid: '#FBBF24', high: '#F43F5E' },
      },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(12px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'pulse-ring': { '0%': { transform: 'scale(0.9)', opacity: 0.7 }, '100%': { transform: 'scale(1.8)', opacity: 0 } },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
};
