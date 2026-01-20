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
        // 커스텀 폰트 이름 'game' 정의
        // 1순위: Lilita One (영어), 2순위: Jua (한글), 3순위: 시스템 폰트
        game: ['"Lilita One"', '"Jua"', 'sans-serif'],
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