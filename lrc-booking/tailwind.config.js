/** @type {import('tailwindcss').Config} */
// كل ألوان الهوية في مكان واحد لسهولة مطابقتها مع التصميم المعتمد
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Cairo', 'Tahoma', 'sans-serif'] },
      colors: {
        navy: {
          50: '#EEF3FA',
          100: '#DCE6F4',
          200: '#B6C8E3',
          300: '#86A2CC',
          400: '#5677AE',
          500: '#365993',
          600: '#26467A',
          700: '#1D3863',
          800: '#162C4F',
          900: '#0F1F3A',
        },
        sky: { page: '#F2F6FC', soft: '#E6EEF9' },
        slot: {
          free: '#16A34A', freeBg: '#E8F7EE', freeBd: '#A7E3BD',
          pend: '#B7791F', pendBg: '#FEF6DD', pendBd: '#F5D77A',
          busy: '#C53030', busyBg: '#FDECEC', busyBd: '#F4B4B4',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,31,58,.04), 0 8px 24px -8px rgba(15,31,58,.10)',
        lift: '0 12px 32px -10px rgba(15,31,58,.25)',
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
};
