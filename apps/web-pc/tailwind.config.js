/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design Spec 1. Primary Colors
        'team-a': '#FF8C00', // Vivid Orange
        'team-b': '#00BFFF', // Cyan Blue
        // 버튼 그림자용 어두운 컬러 (Start 버튼 스타일 참고하여 생성)
        'team-a-dark': '#CC7000', 
        'team-b-dark': '#0099CC',
      },
      fontFamily: {
        // Design Spec 1. Global Styles
        // 'font-fredoka' 클래스로 사용 가능
        fredoka: ['"Fredoka One"', 'cursive'], 
      },
      boxShadow: {
        // Design Spec 2. Button Styles (커스텀 그림자 유틸리티)
        'glossy': '0 8px 0 0 #047857',
        'glossy-hover': '0 6px 0 0 #047857',
        'glossy-active': '0 2px 0 0 #047857',
      }
    },
  },
  plugins: [],
}