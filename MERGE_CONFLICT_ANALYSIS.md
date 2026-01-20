# Merge 충돌 위험 파일 상세 분석 보고서

## 1. 충돌 위험 파일 라인별 상세 분석

### 📱 apps/web-mobile/src/views/LobbyView.jsx
**병합 전략: origin/main 따라가기**

#### 주요 차이점:

**1. 컨테이너 스타일 (라인 37)**
- **origin/main**: `h-[100dvh] flex flex-col items-center justify-center bg-gray-900 overflow-y-auto`
- **현재 브랜치**: `h-full flex items-center justify-center p-4 bg-gray-900`
- **위험도**: 낮음 (UI 스타일 차이)
- **예상 위험**: 모바일 뷰포트 높이 처리 방식 차이

**2. 타이틀 영역 (라인 39-41)**
- **origin/main**: 
  ```jsx
  <h1 className="text-4xl font-black text-white tracking-tight">TEAM SELECT</h1>
  <p className="text-gray-400 text-sm font-medium">Choose your side to begin</p>
  ```
- **현재 브랜치**: 
  ```jsx
  <h1 className="text-3xl font-bold text-white text-center mb-8">팀 선택</h1>
  ```
- **위험도**: 낮음 (텍스트/스타일 차이)
- **예상 위험**: 언어 차이 (영어 vs 한국어)

**3. 팀 선택 버튼 (라인 44-64)**
- **origin/main**: 
  - 그라데이션 배경 (`from-orange-500 to-red-500`, `from-cyan-500 to-blue-500`)
  - 큰 버튼 (`py-8`, `text-2xl`)
  - 애니메이션 효과 (`animate-pulse`, `scale-105`)
  - 이모지 포함 (`TEAM A 🔥`, `TEAM B 🌊`)
- **현재 브랜치**: 
  - 단색 배경 (`bg-orange-500`, `bg-cyan-500`)
  - 작은 버튼 (`py-6`, `text-xl`)
  - 기본 애니메이션
  - 텍스트만 (`Team A`, `Team B`)
- **위험도**: 중간 (UI 구조는 동일, 스타일만 다름)
- **예상 위험**: 사용자 경험 차이

**4. 준비 버튼 영역 (라인 68-88)**
- **origin/main**: 
  - 복잡한 레이아웃 (`bg-gray-800/50 p-6 rounded-3xl border`)
  - 팀장 표시 강조 (`👑 You are the Leader!`)
  - 큰 버튼 (`py-5`, `text-xl`)
  - 영어 텍스트 (`READY! 🚀`, `READY TO START`)
- **현재 브랜치**: 
  - 간단한 레이아웃 (`mt-8 text-center`)
  - 한국어 텍스트 (`준비 완료!`, `준비 하기`)
  - 작은 버튼 (`py-4`, `text-xl`)
- **위험도**: 낮음 (기능 동일)
- **예상 위험**: 언어/스타일 차이

---

### 📱 apps/web-mobile/src/views/InGameView.jsx
**병합 전략: origin/main 따라가기**

#### 주요 차이점:

**1. 권한 요청 화면 (라인 100-113)**
- **origin/main**: 
  - `h-[100dvh]` 사용
  - 이모지 애니메이션 (`<div className="text-6xl animate-bounce">👋</div>`)
  - 상세 설명 (`(아이폰의 경우 팝업에서 '허용'을 눌러주세요)`)
  - 큰 버튼 (`rounded-2xl`, `shadow-lg shadow-blue-600/30`)
- **현재 브랜치**: 
  - `h-full` 사용
  - 이모지 없음
  - 간단한 설명
  - 작은 버튼 (`rounded-xl`)
- **위험도**: 낮음 (기능 동일)
- **예상 위험**: 사용자 안내 수준 차이

**2. 메인 컨테이너 (라인 121)**
- **origin/main**: `h-[100dvh]`, `touchAction: 'none'`, `safe-area-top`, `safe-area-bottom`
- **현재 브랜치**: `h-full`만 사용
- **위험도**: 중간 (모바일 최적화 차이)
- **예상 위험**: iOS safe area 처리 누락 가능성

**3. 상단 정보 바 (라인 123-133)**
- **origin/main**: 
  - 큰 텍스트 (`text-2xl`, `font-black`)
  - 배경 효과 (`bg-black/30`, `backdrop-blur-md`, `border`)
  - `safe-area-top` 클래스
- **현재 브랜치**: 
  - 작은 텍스트 (`text-xl`, `font-bold`)
  - 단순 배경 (`bg-black/40`, `backdrop-blur-sm`)
- **위험도**: 낮음 (스타일 차이)
- **예상 위험**: 가독성 차이

**4. CINEMATIC 상태 (라인 138-149)**
- **origin/main**: `text-4xl`, `font-black`, `READY?`, `꽉 잡으세요!`
- **현재 브랜치**: `text-3xl`, `font-bold`, `출항 준비!`, `휴대폰을 꼭 쥐어주세요`
- **위험도**: 낮음 (텍스트 차이)
- **예상 위험**: 언어 차이

**5. TUTORIAL 상태 (라인 151-183)**
- **origin/main**: 
  - 큰 원형 (`w-48 h-48`)
  - 큰 이모지 (`text-7xl`)
  - 상세한 UI (`bg-gradient-to-tr`, `border-4`)
  - 조건부 렌더링 (`isSensorVerified ? ... : <div>Waiting for shake...</div>`)
- **현재 브랜치**: 
  - 작은 원형 (`w-40 h-40`)
  - 작은 이모지 (`text-6xl`)
  - 단순 UI
  - 조건부 렌더링 없음 (isSensorVerified만 표시)
- **위험도**: 낮음 (UI 차이)
- **예상 위험**: 사용자 피드백 수준 차이

**6. CASTING 상태 (라인 185-220)**
- **origin/main**: 
  - 큰 이모지 (`text-8xl`)
  - 큰 텍스트 (`text-4xl`, `font-black`)
  - 영어 텍스트 (`NICE CAST!`, `CAST NOW!`, `🚀 던지는 시늉을 하세요!`)
  - 큰 게이지 (`h-6`, `border-2`)
- **현재 브랜치**: 
  - 작은 이모지 (`text-6xl`)
  - 작은 텍스트 (`text-3xl`, `font-bold`)
  - 한국어 텍스트 (`Casting 완료!`, `낚싯대를\n던지세요!`, `앞으로 강하게 스윙!`)
  - 작은 게이지 (`h-4`, `border`)
- **위험도**: 낮음 (스타일/언어 차이)
- **예상 위험**: 사용자 경험 차이

**7. PLAYING 상태 (라인 222-237)**
- **origin/main**: 
  - 큰 이모지 (`text-9xl`)
  - 회전 애니메이션 (`rotate: [0, -10, 10, 0]`)
  - 큰 텍스트 (`text-5xl`, `SHAKE!!`)
  - 추가 안내 (`더 빠르게 흔드세요!`)
- **현재 브랜치**: 
  - 작은 이모지 (`text-8xl`)
  - 스케일 애니메이션만 (`scale`)
  - 작은 텍스트 (`text-4xl`, `SHAKE IT!`)
  - 안내 없음
- **위험도**: 낮음 (애니메이션/스타일 차이)
- **예상 위험**: 시각적 피드백 차이

**8. FINISHED 상태 (라인 239-247)**
- **origin/main**: 이모지 (`🏁`), 큰 텍스트 (`text-4xl`), 영어 (`GAME OVER`)
- **현재 브랜치**: 이모지 없음, 작은 텍스트 (`text-3xl`), 한국어 (`게임 종료`)
- **위험도**: 낮음 (스타일 차이)
- **예상 위험**: 언어 차이

---

### 💾 apps/web-pc/src/store/useGameStore.js
**병합 전략: origin/main 따라가기**

#### 주요 차이점:

**1. updatePlayer 함수 (라인 174-205)**
- **origin/main**: 
  - 팀별로 플레이어 찾기 (Team A → Team B → Unassigned 순서)
  - 복잡한 로직 (각 팀별로 인덱스 찾기)
  - 팀 변경 시 기존 위치에서 제거 후 새 위치에 추가
  - 주석 처리된 console.warn
- **현재 브랜치**: 
  - 전체 배열에서 플레이어 찾기 (한 번에)
  - 간단한 로직 (allPlayers 배열 생성 후 findIndex)
  - 동일한 로직 (기존 위치 제거 후 새 위치 추가)
  - console.warn 활성화
- **위험도**: 낮음 (기능 동일, 성능 차이만)
- **예상 위험**: 
  - 성능: origin/main이 더 효율적일 수 있음 (팀별로 찾으면 조기 종료 가능)
  - 가독성: 현재 브랜치가 더 간단함
  - **결론**: origin/main 버전이 더 최적화됨

---

### 🖥️ apps/web-pc/src/views/WaitingView.jsx
**병합 전략: 현재 브랜치 기준 유지**

#### 주요 차이점:

**1. Import 문 (라인 1-8)**
- **origin/main**: 인라인 렌더링 (컴포넌트 없음)
- **현재 브랜치**: 컴포넌트 기반 (`TeamPanel`, `QRCodePanel`, `GlassPanel`, `GlossyButton`, `bgShip`)
- **위험도**: 높음 (구조적 차이)
- **예상 위험**: 컴포넌트 의존성 필요

**2. 플레이어 필터링 (라인 30-35)**
- **origin/main**: 
  ```jsx
  const teamA_players = Array.isArray(players) 
    ? players.filter(p => p.team === 'A')
    : (players.A || []);
  ```
- **현재 브랜치**: 
  ```jsx
  const filterNonHost = (list = []) => list.filter((p) => !p.isHost);
  const teamA_players = filterNonHost(players.A || []);
  ```
- **위험도**: 낮음 (기능 동일, 호스트 필터링 추가)
- **예상 위험**: 호스트 필터링 로직 차이

**3. UI 구조 (라인 46-146)**
- **origin/main**: 
  - 인라인 렌더링 (243줄)
  - 복잡한 레이아웃 (3열 그리드, 스크롤 가능한 리스트)
  - 개별 플레이어 카드 직접 렌더링
  - 상세한 상태 표시 (READY, WAITING, Sensor OK)
- **현재 브랜치**: 
  - 컴포넌트 기반 (148줄)
  - 간단한 레이아웃 (3열 그리드, 컴포넌트 사용)
  - 컴포넌트로 플레이어 카드 렌더링
  - 배경 이미지 사용 (`bgShip`)
- **위험도**: 높음 (완전히 다른 구조)
- **예상 위험**: 
  - 컴포넌트 의존성 (TeamPanel, QRCodePanel 등)
  - 스타일 차이 (배경 이미지 vs 단색)
  - 기능 차이 (상세 상태 표시 vs 간단한 표시)

**4. 게임 시작 버튼 (라인 117-128)**
- **origin/main**: 인라인 버튼, 상세한 비활성화 메시지
- **현재 브랜치**: `GlossyButton` 컴포넌트 사용
- **위험도**: 낮음 (기능 동일)
- **예상 위험**: 컴포넌트 의존성

---

## 2. 병합 전략 요약

### ✅ origin/main 따라갈 파일
1. **LobbyView.jsx**: 더 화려한 UI, 영어 텍스트, 모바일 최적화
2. **InGameView.jsx**: 더 상세한 UI, safe-area 처리, 애니메이션 강화
3. **useGameStore.js**: 더 최적화된 updatePlayer 로직

### ✅ 현재 브랜치 기준 유지
1. **WaitingView.jsx**: 컴포넌트 기반 구조, 배경 이미지, 간결한 UI

### ✅ origin/main 수정사항 반영
1. **LoginView.jsx**: API URL 수정 (`/api` 추가), 서비스명 변경 (`KaHook!`)
2. **TutorialView.jsx**: `leaders_selected` 이벤트 핸들러 추가, 자동 시네마틱 시작
3. **rooms.service.ts**: `leaveRoom`에서 플레이어 삭제 로직 제거 (프로필 유지)

### ⚠️ 검토 필요
1. **migration.sql**: origin/main에만 존재하는 마이그레이션 파일
   - `isHost` 컬럼 삭제
   - `nickname`, `profileImage` 컬럼 추가
   - **검토 필요**: 현재 브랜치에서 삭제된 이유 확인
