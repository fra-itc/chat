/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Cyberpunk 2077 theme
        cyberpink: '#ff2a6d',
        cyberblue: {
          light: '#d1f7ff',
          DEFAULT: '#05d9e8',
          dark: '#005678',
        },
        cyberdark: '#01012b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon': '0 0 5px theme(colors.cyan.400), 0 0 20px theme(colors.cyan.600)',
        'neon-pink': '0 0 5px theme(colors.pink.400), 0 0 20px theme(colors.pink.600)',
      },
    },
  },
  plugins: [],
}
