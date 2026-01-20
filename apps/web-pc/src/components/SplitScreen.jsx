// components/SplitScreen.jsx
export default function SplitScreen({ leftContent, rightContent }) {
    return (
      <div className="absolute inset-0 flex flex-row">
        {/* Team A 영역 (왼쪽) */}
        <div className="w-1/2 h-full relative p-8 flex flex-col items-center">
          {leftContent}
        </div>
  
        {/* 중앙 분리선: 확대/축소에 영향받지 않고 완전 중앙 고정, 굵고 진하게 (3배 굵기) */}
        <div className="fixed left-1/2 top-0 bottom-0 w-[12px] bg-white/80 -translate-x-1/2 z-10 shadow-lg" />
  
        {/* Team B 영역 (오른쪽) */}
        <div className="w-1/2 h-full relative p-8 flex flex-col items-center">
          {rightContent}
        </div>
      </div>
    );
  }