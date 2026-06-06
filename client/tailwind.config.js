/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        heading: ['Montserrat', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#f6f2fb',
          100: '#e8d9ff',
          200: '#d1b3ff',
          300: '#b579ff',
          400: '#9900ff',
          500: '#7300ff',
          600: '#5c00cc',
          700: '#341c63',
          800: '#281351',
          900: '#262138',
          950: '#1a0f38',
        },
        accent: '#0066ff',
        card: 'rgba(52,28,99,0.6)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #7300ff 0%, #0066ff 100%)',
        'gradient-dark':  'linear-gradient(180deg, #262138 0%, #1a0f38 100%)',
        'gradient-card':  'linear-gradient(135deg, rgba(52,28,99,0.8) 0%, rgba(38,33,56,0.6) 100%)',
      },
      boxShadow: {
        'brand': '0 4px 24px rgba(115, 0, 255, 0.3)',
        'brand-lg': '0 8px 40px rgba(115, 0, 255, 0.4)',
        'card': '0 4px 20px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
};
