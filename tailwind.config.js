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
        // Risk anchors: blue → amber → rose (separable under red-green colour deficiency)
        risk: { low: '#38BDF8', mid: '#FBBF24', high: '#F43F5E' },
      },
    },
  },
  plugins: [],
};
