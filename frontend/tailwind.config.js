/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F5F6F8',
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F8FAFC',
          hover: '#F1F3F6',
          active: '#E8ECF1',
          card: '#FFFFFF',
        },
        foreground: '#1F2933',
        navy: {
          DEFAULT: '#17324D',
          dark: '#0E2135',
          light: '#24476B',
          subtle: '#E8EEF5',
          border: '#D0DCE8',
        },
        railway: {
          red: '#D32F2F',
          dark: '#B71C1C',
          light: '#FFEBEE',
          border: '#FFCDD2',
        },
        transit: {
          green: '#2E7D32',
          'green-light': '#E8F5E9',
          'green-border': '#C8E6C9',
          orange: '#ED8B00',
          'orange-light': '#FFF3E0',
          'orange-border': '#FFE0B2',
          red: '#C62828',
          'red-light': '#FFEBEE',
          'red-border': '#FFCDD2',
        },
        muted: {
          DEFAULT: '#667085',
          dark: '#1F2933',
          light: '#9AA5B1',
        },
        border: {
          DEFAULT: '#D9DEE5',
          light: '#E4E7EB',
          strong: '#CBD2D9',
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(16, 24, 40, 0.08), 0 1px 2px 0 rgba(16, 24, 40, 0.04)',
        'card-hover': '0 4px 12px 0 rgba(16, 24, 40, 0.1), 0 2px 4px 0 rgba(16, 24, 40, 0.06)',
        'dropdown': '0 10px 15px -3px rgba(16, 24, 40, 0.1), 0 4px 6px -2px rgba(16, 24, 40, 0.05)',
        'nav': '0 1px 2px 0 rgba(16, 24, 40, 0.06)',
      },
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        sora: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'monospace'],
      },
      borderRadius: {
        'card': '8px',
        'badge': '4px',
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
}

