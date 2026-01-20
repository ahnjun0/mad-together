// components/SplitScreen.jsx
export default function SplitScreen({ leftContent, rightContent }) {
    return (
      <div className="absolute inset-0 flex flex-row">
        {/* Team A 영역 (왼쪽) */}
        <div className="w-1/2 h-full relative p-8 flex flex-col items-center">
          {leftContent}
        </div>
  
        {/* 중앙 분리선 (선택 사항: 디자인에 따라 추가) */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white/20 -translate-x-1/2 z-10" />
  
        {/* Team B 영역 (오른쪽) */}
        <div className="w-1/2 h-full relative p-8 flex flex-col items-center">
          {rightContent}
        </div>
      </div>
    );
  }