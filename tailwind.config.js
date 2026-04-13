/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        hebrew: ['"FbTreeOfKnowledge"', 'serif'],
        display: ['"LiaReponzel"', 'sans-serif'],
        sans: ['"LiaReponzel"', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
