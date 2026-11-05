export default {
  content: ['./public/**/*.{html,js}'],
  theme: {
    extend: {
      colors: { brand: { DEFAULT: '#c8102e', dark: '#a50d26' }, crema: '#f8f4f1', tinta: '#2f2f33' },
      fontFamily: { sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'] },
      boxShadow: { tarjeta: '0 1px 3px rgba(40,30,25,.10), 0 0 0 1px rgba(40,30,25,.04)' }
    }
  },
  plugins: []
}
