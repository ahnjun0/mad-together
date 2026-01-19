# UI 마이그레이션 분석 보고서
## Figma 디자인 → React 구현 전략

---

## 1. Logic & UI Gap Analysis (핵심)

### 1.1 Start Screen (HomeView.jsx)

#### ✅ 현재 구현된 기능
- `Team A Name` 입력 필드 (state: `teamAName`)
- `Team B Name` 입력 필드 (state: `teamBName`)
- `Max Players` 입력 필드 (state: `maxPlayers`, 기본값: 10)
- `createRoom` API 호출 함수 존재
- 기본적인 폼 제출 로직

#### ❌ **Missing Logic (필수 구현 필요)**

1. **Room Name 필드 누락**
   - **현재 상태:** `HomeView.jsx`에 `roomName` state가 없음
   - **디자인 요구사항:** Figma 디자인에 "Room Name" 입력 필드가 명시되어 있음
   - **API 상태:** `createRoom` 함수(`apps/web-pc/src/api/room.js:95`)는 `roomName` 파라미터를 받지 않음
   - **필요한 작업:**
     - `HomeView.jsx`에 `roomName` state 추가
     - `createRoom` API 함수에 `roomName` 파라미터 추가
     - 백엔드 API 엔드포인트 수정 필요 (확인 필요)

2. **Max Players 드롭다운 UI**
   - **현재 상태:** `<input type="number">`로 구현됨
   - **디자인 요구사항:** 드롭다운 메뉴 (예: "10 Players")
   - **필요한 작업:** `<select>` 요소로 변경 또는 커스텀 드롭다운 컴포넌트 구현

#### 🎨 UI 스타일 Gap
- 현재: 기본적인 흰색 배경 패널 (`bg-white/90`)
- 디자인: 글래스모피즘 효과 (`backdrop-blur-md bg-white/30 rounded-[30px] border-[4px]`)
- 버튼: 현재는 기본 그린 버튼, 디자인은 3D 글로시 버튼 스타일 필요
- 배경: 현재는 단색 (`bg-cyan-200`), 디자인은 바다/하늘 배경 이미지 필요

---

### 1.2 Waiting Screen (WaitingView.jsx)

#### ✅ 현재 구현된 기능
- `isLeader` 속성 지원 (코드: `player.isLeader`, UI: 👑 이모지)
- `isReady` 속성 지원 (코드: `player.isReady`, UI: "✓ Ready" 텍스트)
- `team` 속성 지원 (`player.team === 'A'` 또는 `'B'`)
- 팀별 플레이어 목록 분리 표시
- QR 코드 표시 (`roomInfo.qrCode`)
- 방 코드 표시 (`roomInfo.code`)
- 팀 이름 표시 (`roomInfo.teamAName`, `roomInfo.teamBName`)
- "Start Game" 버튼 (호스트 전용)

#### ❌ **Missing Logic (필수 구현 필요)**


2. **"WAITING..." 상태 표시 패널**
   - **현재 상태:** 상태 표시 UI가 없음
   - **디자인 요구사항:** 하단에 "WAITING..." 텍스트가 있는 글래스모피즘 패널
   - **필요한 작업:** 상태 표시 컴포넌트 추가

3. **Exit/나가기 버튼**
   - **현재 상태:** 방을 나가는 기능이 없음
   - **디자인 요구사항:** 명시적으로 없지만, 일반적인 UX 패턴으로 필요할 수 있음
   - **필요한 작업:** (선택사항) Exit 버튼 및 `leave_room` 소켓 이벤트 핸들러

#### 🎨 UI 스타일 Gap

1. **레이아웃 구조**
   - 현재: 3열 그리드 (QR 코드 중앙, 팀 A/B 좌우)
   - 디자인: 2열 레이아웃 (팀 A/B 좌우), QR 코드 중앙 상단, 하단에 버튼

2. **팀 패널 스타일**
   - 현재: 기본 흰색 배경 (`bg-white/90`)
   - 디자인: 글래스모피즘 + 팀별 테두리 색상
     - Team A: 주황색 테두리 (`#FF8C00`)
     - Team B: 청록색 테두리 (`#00BFFF`)

3. **플레이어 아이템 스타일**
   - 현재: 기본 카드 스타일
   - 디자인: 
     - 흰색 둥근 직사각형 배경
     - 원형 'P' 아이콘 (팀 색상)
     - READY 태그 (초록색)
     - 왕관 아이콘 (금색, SVG/PNG 필요)

4. **제목 스타일**
   - 현재: 기본 텍스트
   - 디자인: "KAHOOK!" 큰 제목, 텍스트 아웃라인 효과 (`textShadow`)

5. **배경**
   - 현재: 단색 (`bg-cyan-200`)
   - 디자인: 바다/하늘/부두 배경 이미지 필요

---

## 2. Component Refactoring Strategy

### 2.1 재사용 가능한 컴포넌트 제안

#### 1. `GlossyButton` 컴포넌트
**위치:** `apps/web-pc/src/components/GlossyButton.jsx`

**Props:**
- `children`: 버튼 텍스트
- `onClick`: 클릭 핸들러
- `disabled`: 비활성화 상태
- `variant`: `'primary'` (초록색) | `'secondary'` (주황색) | `'cyan'` (청록색)
- `size`: `'lg'` | `'md'` | `'sm'`

**Tailwind 클래스:**
```jsx
// Primary (초록색)
className="w-full py-6 rounded-[25px] font-black text-3xl text-white border-[5px] border-white transition-all duration-200 bg-gradient-to-b from-[#10b981] to-[#059669] shadow-[0_8px_0_0_#047857] hover:shadow-[0_6px_0_0_#047857] hover:translate-y-[2px] active:shadow-[0_2px_0_0_#047857] active:translate-y-[6px]"
```

#### 2. `GlassPanel` 컴포넌트
**위치:** `apps/web-pc/src/components/GlassPanel.jsx`

**Props:**
- `children`: 패널 내용
- `borderColor`: 테두리 색상 (`'orange'` | `'cyan'` | `'blue'` | `'white'`)
- `className`: 추가 클래스

**Tailwind 클래스:**
```jsx
className="backdrop-blur-md bg-white/30 rounded-[30px] p-6 border-[4px] border-{color}"
```

#### 3. `PlayerCard` 컴포넌트
**위치:** `apps/web-pc/src/components/PlayerCard.jsx`

**Props:**
- `player`: 플레이어 객체 (`{ id, nickname, isLeader, isReady, team }`)
- `teamColor`: 팀 색상 (`'orange'` | `'cyan'`)

**기능:**
- 원형 'P' 아이콘 렌더링
- READY 태그 표시
- 왕관 아이콘 표시 (리더인 경우)

#### 4. `TeamPanel` 컴포넌트
**위치:** `apps/web-pc/src/components/TeamPanel.jsx`

**Props:**
- `team`: `'A'` | `'B'`
- `teamName`: 팀 이름
- `players`: 플레이어 배열
- `maxPlayers`: 최대 플레이어 수

**기능:**
- 팀별 색상 테두리 적용
- 플레이어 목록 렌더링
- "Waiting for players..." 메시지 표시

#### 5. `QRCodePanel` 컴포넌트
**위치:** `apps/web-pc/src/components/QRCodePanel.jsx`

**Props:**
- `qrCode`: QR 코드 이미지 URL
- `code`: 방 코드 (예: "739 231")

---

### 2.2 Tailwind Config 확장

**파일:** `apps/web-pc/tailwind.config.js`

**추가 필요:**
```js
theme: {
  extend: {
    colors: {
      'team-a': '#FF8C00',
      'team-b': '#00BFFF',
    },
    fontFamily: {
      'fredoka': ['Fredoka One', 'cursive'],
    },
  },
}
```

---

### 2.3 Global CSS 업데이트

**파일:** `apps/web-pc/src/index.css`

**추가 필요:**
- 텍스트 아웃라인 유틸리티 클래스 (이미 존재하지만 디자인에 맞게 조정 필요)
- 배경 이미지 설정 (선택사항)

---

## 3. Asset Checklist

### 3.1 필수 에셋 (Static Assets)

#### 배경 이미지
- [ ] **배경 이미지 (바다/하늘/부두)** 
  - 파일명: `background-ocean.png` 또는 `background-ocean.jpg`
  - 위치: `apps/web-pc/src/assets/images/`
  - 용도: HomeView, WaitingView 배경

#### 아이콘
- [ ] **왕관 아이콘 (Crown Icon)**
  - 파일명: `crown-icon.svg` 또는 `crown-icon.png`
  - 위치: `apps/web-pc/src/assets/icons/`
  - 용도: 리더 플레이어 표시
  - 스타일: 금색 (#FFD700 또는 유사)

- [ ] **플레이어 아이콘 (원형 'P')**
  - 파일명: `player-icon.svg` 또는 컴포넌트로 생성 가능
  - 위치: `apps/web-pc/src/assets/icons/` 또는 인라인 SVG
  - 용도: 플레이어 카드 아이콘
  - 색상: 팀별 (주황색/청록색)

- [ ] **READY 태그 아이콘/배지**
  - 파일명: `ready-badge.svg` 또는 컴포넌트로 생성 가능
  - 위치: `apps/web-pc/src/assets/icons/`
  - 용도: 준비 완료 상태 표시
  - 색상: 초록색

- [ ] **물음표 아이콘 (Help Icon)**
  - 파일명: `help-icon.svg` 또는 `?` 텍스트로 대체 가능
  - 위치: `apps/web-pc/src/assets/icons/`
  - 용도: 우측 하단 도움말 버튼 (선택사항)

#### 기타
- [ ] **보트 이미지 (선택사항)**
  - 파일명: `boat-red.png`, `boat-blue.png`
  - 위치: `apps/web-pc/src/assets/images/`
  - 용도: 배경 장식 (디자인에 포함되어 있으나 필수는 아님)

---

### 3.2 동적 에셋 (이미 구현됨)

- ✅ **QR 코드**: `roomInfo.qrCode` (백엔드에서 생성)
- ✅ **방 코드**: `roomInfo.code` (백엔드에서 생성)

---

## 4. Implementation Checklist & Questions

### 4.1 Phase 1: UI Polish (우선순위 순)

#### Step 1: 공통 컴포넌트 생성
- [ ] `GlossyButton` 컴포넌트 생성
- [ ] `GlassPanel` 컴포넌트 생성
- [ ] `PlayerCard` 컴포넌트 생성
- [ ] `TeamPanel` 컴포넌트 생성
- [ ] `QRCodePanel` 컴포넌트 생성

#### Step 2: Tailwind Config 업데이트
- [ ] `tailwind.config.js`에 커스텀 색상 추가
- [ ] `tailwind.config.js`에 폰트 설정 확인

#### Step 3: Global CSS 업데이트
- [ ] 텍스트 아웃라인 스타일 조정 (디자인에 맞게)
- [ ] 배경 이미지 import 및 설정 (선택사항)

#### Step 4: HomeView 리팩토링
- [ ] `roomName` state 추가
- [ ] 글래스모피즘 패널 스타일 적용
- [ ] 입력 필드 스타일 업데이트 (팀별 테두리 색상)
- [ ] Max Players를 드롭다운으로 변경
- [ ] `GlossyButton`으로 "CREATE ROOM" 버튼 교체
- [ ] 배경 이미지 적용
- [ ] **백엔드 API 확인:** `createRoom`에 `roomName` 파라미터 추가 가능한지 확인

#### Step 5: WaitingView 리팩토링
- [ ] 레이아웃 구조 변경 (2열 + 중앙 QR 코드)
- [ ] "KAHOOK!" 제목 추가 (텍스트 아웃라인 효과)
- [ ] `TeamPanel` 컴포넌트로 팀 패널 교체
- [ ] `QRCodePanel` 컴포넌트로 QR 코드 패널 교체
- [ ] `PlayerCard` 컴포넌트로 플레이어 아이템 교체
- [ ] "Set to Ready" 버튼 추가 (`usePcSocket`에 `toggleReady` 함수 추가 필요)
- [ ] "WAITING..." 상태 패널 추가
- [ ] 배경 이미지 적용

#### Step 6: 소켓 로직 추가
- [ ] `usePcSocket.js`에 `toggleReady` emit 함수 추가
- [ ] `WaitingView.jsx`에서 `toggleReady` 호출 연결

---

### 4.2 Phase 2: Missing Logic Implementation

#### 백엔드 API 수정 (필요 시)
- [ ] **질문 1:** `POST /api/rooms` 엔드포인트에 `roomName` 필드를 추가할 수 있나요?
  - 현재: `{ teamAName, teamBName, maxPlayers }`
  - 요구: `{ roomName, teamAName, teamBName, maxPlayers }`

#### 소켓 이벤트 확인
- [ ] **질문 2:** `toggle_ready` 소켓 이벤트가 이미 백엔드에 구현되어 있나요?
  - 모바일에서는 `toggleReady()` 함수가 있으므로, 백엔드 지원 여부 확인 필요

---

### 4.3 Phase 3: Asset Integration

- [ ] 배경 이미지 추가 및 적용
- [ ] 왕관 아이콘 추가 및 적용
- [ ] 플레이어 아이콘 생성/추가
- [ ] READY 배지 생성/추가
- [ ] (선택사항) 보트 이미지 추가

---

### 4.4 Phase 4: Testing & Polish

- [ ] 반응형 디자인 테스트 (다양한 화면 크기)
- [ ] 글래스모피즘 효과 브라우저 호환성 테스트
- [ ] 애니메이션/트랜지션 테스트
- [ ] 접근성 검토 (색상 대비, 키보드 네비게이션)

---

## 5. Critical Questions (백엔드 팀 확인 필요)

### ❓ 질문 1: Room Name 필드
**현재 상태:** `createRoom` API에 `roomName` 파라미터가 없음  
**질문:** 백엔드에서 `roomName` 필드를 지원할 수 있나요?  
**영향:** HomeView에 Room Name 입력 필드를 추가하려면 백엔드 수정이 필요합니다.

### ❓ 질문 2: PC에서 Ready 토글
**현재 상태:** 모바일에는 `toggleReady()` 함수가 있지만, PC용 `usePcSocket`에는 없음  
**질문:** 백엔드에서 `toggle_ready` 소켓 이벤트를 지원하나요? (모바일에서 사용 중이므로 가능성 높음)  
**영향:** PC에서도 "Set to Ready" 버튼을 구현하려면 소켓 이벤트가 필요합니다.

### ❓ 질문 3: Max Players 제한
**현재 상태:** `maxPlayers`는 팀당 최대 인원수로 해석됨  
**질문:** `maxPlayers`가 "팀당"인지 "전체"인지 명확히 해주세요. (현재 코드는 팀당으로 보임)  
**영향:** UI 표시 및 검증 로직에 영향을 줍니다.

---

## 6. 우선순위 요약

### 🔴 High Priority (필수)
1. **Room Name 필드 추가** (백엔드 협의 필요)
2. **PC에서 "Set to Ready" 기능 추가**
3. **글래스모피즘 UI 스타일 적용**
4. **팀별 색상 테두리 적용**

### 🟡 Medium Priority (권장)
1. **재사용 가능한 컴포넌트 생성**
2. **배경 이미지 적용**
3. **왕관 아이콘 추가**
4. **플레이어 카드 스타일 개선**

### 🟢 Low Priority (선택사항)
1. **보트 이미지 추가**
2. **Exit 버튼 추가**
3. **애니메이션 효과 강화**

---

## 7. 참고 파일 목록

### 현재 코드
- `apps/web-pc/src/views/HomeView.jsx` - 시작 화면
- `apps/web-pc/src/views/WaitingView.jsx` - 대기 화면
- `apps/web-pc/src/hooks/usePcSocket.js` - PC 소켓 훅
- `apps/web-pc/src/api/room.js` - 방 생성 API
- `apps/web-pc/src/store/useGameStore.js` - 상태 관리
- `apps/web-pc/tailwind.config.js` - Tailwind 설정
- `apps/web-pc/src/index.css` - 글로벌 CSS

### 참고 코드 (모바일)
- `apps/web-mobile/src/hooks/useMobileSocket.js` - 모바일 소켓 훅 (toggleReady 참고)
- `apps/web-mobile/src/views/LobbyView.jsx` - 모바일 대기 화면 (Ready 버튼 참고)

---

**작성일:** 2024년  
**작성자:** AI Assistant  
**버전:** 1.0
