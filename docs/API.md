# API Specification

## Overview

| Protocol  | Base URL                 | Description                |
| --------- | ------------------------ | -------------------------- |
| REST API  | `https://{domain}/api` | 방 생성, 입장, 사용자 관리 |
| WebSocket | `wss://{domain}/game`  | 실시간 게임 통신           |

---

## Client Types

### web-pc (호스트용 PC 웹)

| 기능             | 설명                                 |
| ---------------- | ------------------------------------ |
| 방 생성          | 게임 방 개설, 팀 이름 설정           |
| QR 코드 표시     | 플레이어 입장용 QR 코드              |
| 대기실 화면      | 팀원 목록, 팀 배정 현황, 준비 상태   |
| 게임 진행 제어   | 튜토리얼 시작, 팀장 선정, 카운트다운 |
| 실시간 점수 표시 | 팀별 점수, 물고기 그래픽 애니메이션  |
| 게임 결과        | 승리 팀, MVP, 개인별 점수            |

### web-mobile (플레이어용 모바일 웹)

| 기능        | 설명                                       |
| ----------- | ------------------------------------------ |
| 입장        | QR 스캔 또는 코드 입력                     |
| 프로필      | 닉네임 설정/수정                           |
| 팀 선택     | A팀/B팀 선택                               |
| 준비 완료   | 준비 상태 토글                             |
| 센서 확인   | 가속도계 연결 테스트                       |
| 게임 플레이 | 흔들기 감지 (Schmitt Trigger), 진동 피드백 |
| 게임 결과   | 본인 점수, 팀 결과, MVP 확인               |

---

## Authentication

모든 API는 JWT Authentication을 사용합니다. Google Login을 통해 Access/Refresh Token을 발급받습니다.

### Header

```
Authorization: Bearer {Access Token}
```

---

# REST API

## Auth (인증)

### POST /api/auth/login/google

구글 로그인 및 토큰 발급

**Request:**

```json
{
  "token": "Google ID Token"
}
```

**Response (200 OK):**

```json
{
  "accessToken": "ey...",
  "refreshToken": "ey...",
  "user": {
    "id": "clxxx...",
    "nickname": "홍길동",
    "googleName": "홍길동(구글)",
    "profileImage": "https://..."
  }
}
```

---

### POST /api/auth/refresh

토큰 갱신

**Request:**

```json
{
  "userId": "clxxx...",
  "refreshToken": "ey..."
}
```

**Response (200 OK):**

```json
{
  "accessToken": "ey...",
  "refreshToken": "ey..."
}
```

---

### POST /api/auth/profile

프로필 수정 (닉네임, 이미지) - `multipart/form-data`

**Request:**

- `nickname`: 새로운 닉네임
- `file`: 이미지 파일 (Optional)

**Response (200 OK):**

```json
{
  "userId": "clxxx...",
  "nickname": "새닉네임",
  "profileImage": "/uploads/..."
}
```

---

## Rooms (게임 방)

### POST /api/rooms

새 게임 방 생성 (인증 필요) - **PC 전용**

**Request:**

```json
{
  "teamAName": "불꽃팀",
  "teamBName": "파도팀",
  "maxPlayers": 10,
  "goalScore": 1000  // Optional (기본값 1000)
}
```

**Response (201 Created):**

```json
{
  "roomId": "clxxx...",
  "code": "ABC123",
  "qrCode": "data:image/png;base64,...",
  "teamAName": "불꽃팀",
  "teamBName": "파도팀",
  "maxPlayers": 10
}
```

**Notes:**

- `code`: 6자리 입장 코드 (QR에 포함)
- `qrCode`: Base64 인코딩된 QR 이미지
- `goalScore`: 게임 승리를 위한 목표 점수
- 방은 생성 후 1시간 뒤 만료됩니다

---

### GET /api/rooms/:code

방 정보 조회 (입장 코드로)

**Path Parameters:**

- `code`: 6자리 입장 코드

**Response (200 OK):**

```json
{
  "roomId": "clxxx...",
  "code": "ABC123",
  "status": "WAITING",
  "teamAName": "불꽃팀",
  "teamBName": "파도팀",
  "host": {
    "id": "clyyy...",
    "nickname": "방장닉네임"
  },
  "players": [
    {
      "id": "plxxx...",
      "nickname": "플레이어1",
      "team": "A",
      "isHost": true
    },
    {
      "id": "plyyy...",
      "nickname": "플레이어2",
      "team": null,
      "isHost": false
    }
  ]
}
```

**Status Values:**

| Status       | Description         |
| ------------ | ------------------- |
| `WAITING`  | 대기 중 (입장 가능) |
| `CINEMATIC`| 시네마틱 영상 재생  |
| `TUTORIAL` | 튜토리얼/센서 확인  |
| `CASTING`  | 팀장 캐스팅 중      |
| `PLAYING`  | 게임 진행 중        |
| `FINISHED` | 게임 종료           |

**Errors:**

- `404 Not Found`: 방을 찾을 수 없음
- `400 Bad Request`: 방이 만료됨

---

### POST /api/rooms/:code/join

방 입장 (인증 필요) - **Mobile 전용**

**Path Parameters:**

- `code`: 6자리 입장 코드

**Response (200 OK):**

```json
{
  "roomId": "clxxx...",
  "playerId": "plxxx...",
  "code": "ABC123",
  "status": "WAITING",
  "teamAName": "불꽃팀",
  "teamBName": "파도팀"
}
```

**Errors:**

- `400 Bad Request`: 방이 WAITING 상태가 아님

---

### PATCH /api/rooms/:roomId/players/:playerId/team

팀 선택 (인증 필요) - **Mobile 전용**

**Path Parameters:**

- `roomId`: 방 ID
- `playerId`: 플레이어 ID

**Request:**

```json
{
  "team": "A"
}
```

또는 팀 선택 해제:

```json
{
  "team": null
}
```

**Response (200 OK):**

```json
{
  "playerId": "plxxx...",
  "team": "A"
}
```

---

# WebSocket API

## Connection

### Endpoint

```
wss://{domain}/game
```

### Authentication

```typescript
const socket = io('wss://domain/game', {
  auth: {
    token: accessToken // JWT Access Token
  }
});
```

---

## Client → Server Events

### `join_room`

방에 입장 (WebSocket 연결 후 필수)

```typescript
socket.emit('join_room', {
  roomId: "clxxx...",
  playerId: "plxxx..."
});
```

---

### `leave_room`

방 퇴장

```typescript
socket.emit('leave_room');
```

---

### `select_team`

팀 선택 - **Mobile**

```typescript
socket.emit('select_team', {
  team: "A"  // "A" | "B" | null
});
```

---

### `toggle_ready`

준비 상태 토글 - **Mobile**

```typescript
socket.emit('toggle_ready');
```

---

### `sensor_checked`

센서 확인 완료 - **Mobile**

```typescript
socket.emit('sensor_checked');
```

---

### `start_tutorial`

튜토리얼 시작 - **PC (호스트 전용)**

```typescript
socket.emit('start_tutorial');
```

---

### `start_cinematic`

시네마틱 영상 시작 - **PC (호스트 전용)**

```typescript
socket.emit('start_cinematic');
```

---

### `select_leaders`

팀장 랜덤 선정 - **PC (호스트 전용)**

```typescript
socket.emit('select_leaders');
```

---

### `start_casting`

캐스팅 단계 시작 - **PC (호스트 전용)**

```typescript
socket.emit('start_casting');
```

---

### `cast_action`

캐스팅 액션 (파워 전송) - **Mobile (팀장 전용)**

```typescript
socket.emit('cast_action', {
  power: 45 // 가속도 센서 값
});
```

---

### `cast_complete`

캐스팅 완료 - **Mobile (팀장 전용)**

```typescript
socket.emit('cast_complete', {
  team: "A"  // 본인 팀
});
```

---

### `start_countdown`

10초 카운트다운 시작 - **PC (호스트 전용)**

```typescript
socket.emit('start_countdown');
```

---

### `shake`

흔들기 이벤트 (게임 중) - **Mobile**

```typescript
// Schmitt Trigger 방식: 흔들기 1회 감지 시 count=1 전송
socket.emit('shake', {
  count: 1  // 기본값 1 (1회 흔들기)
});
```

---

## Server → Client Events

### `room_state`

방 입장 시 현재 상태 전송

```typescript
socket.on('room_state', (data) => {
  // data 구조:
  {
    room: {
      id: "clxxx...",
      code: "ABC123",
      status: "WAITING",
      teamAName: "불꽃팀",
      teamBName: "파도팀"
    },
    players: [
      {
        id: "plxxx...",
        nickname: "플레이어1",
        team: "A",
        isHost: true,
        isLeader: true, // 팀장 여부
        isReady: true,
        sensorChecked: false,
        score: 0
      }
    ]
  }
});
```

---

### `player_joined`

새 플레이어 입장

```typescript
socket.on('player_joined', (data) => {
  // { playerId: "plxxx...", nickname: "새플레이어" }
});
```

---

### `player_left`

플레이어 퇴장

```typescript
socket.on('player_left', (data) => {
  // { playerId: "plxxx..." }
});
```

---

### `player_disconnected`

플레이어 연결 끊김

```typescript
socket.on('player_disconnected', (data) => {
  // { playerId: "plxxx..." }
});
```

---

### `player_updated`

플레이어 상태 변경

```typescript
socket.on('player_updated', (data) => {
  // 팀 변경: { playerId: "plxxx...", team: "A", isLeader: true }
  // 준비 상태: { playerId: "plxxx...", isReady: true }
  // 센서 확인: { playerId: "plxxx...", sensorChecked: true }
});
```

---

### `all_ready`

모든 플레이어 준비 완료

```typescript
socket.on('all_ready', () => {
  // PC: 호스트가 게임 시작 버튼 활성화
});
```

---

### `all_sensor_checked`

모든 플레이어 센서 확인 완료

```typescript
socket.on('all_sensor_checked', () => {
  // 다음 단계 진행 가능
});
```

---

### `tutorial_started`

튜토리얼 시작됨

```typescript
socket.on('tutorial_started', () => {
  // PC: 튜토리얼 안내 화면 표시
  // Mobile: 센서 테스트 UI 표시
});
```

---

### `cinematic_started`

시네마틱 시작됨

```typescript
socket.on('cinematic_started', () => {
  // PC: 영상 재생
  // Mobile: 진동 피드백
});
```

---

### `leaders_selected`

팀장 선정 완료

```typescript
socket.on('leaders_selected', (data) => {
  // { teamA: "plxxx...", teamB: "plyyy..." }
  // Mobile: 본인이 팀장인지 확인하여 UI 변경
});
```

---

### `casting_phase`

캐스팅 단계 시작

```typescript
socket.on('casting_phase', () => {
  // PC: 캐스팅 대기 화면
  // Mobile (팀장): 캐스팅 버튼 표시
});
```

---

### `team_casted`

팀 캐스팅 완료

```typescript
socket.on('team_casted', (data) => {
  // { team: "A" }
  // 캐스팅 애니메이션 재생
});
```

---

### `countdown`

카운트다운 (10초 → 0초)

```typescript
socket.on('countdown', (data) => {
  // { count: 10 } → { count: 9 } → ... → { count: 0 }
  // PC: 카운트다운 숫자 표시
  // Mobile: 카운트다운 + 준비 안내
});
```

---

### `game_started`

게임 시작

```typescript
socket.on('game_started', () => {
  // PC: 물고기 애니메이션 시작
  // Mobile: 흔들기 감지 시작
});
```

---

### `score_update`

**실시간 점수 업데이트 (매 흔들기마다 발생)**

```typescript
socket.on('score_update', (data) => {
  // {
  //   event: {
  //     playerId: "plxxx...",
  //     nickname: "홍길동",
  //     team: "A",
  //     amount: 1,           // 이번에 획득한 점수
  //     playerScore: 127     // 해당 플레이어 누적 점수
  //   },
  //   teams: {
  //     A: 450,
  //     B: 380
  //   }
  // }

  // PC: 물고기 위치 업데이트, 닉네임 표시 애니메이션
  // Mobile: 팀 점수 표시 업데이트
});
```

---

### `game_ended`

게임 종료

```typescript
socket.on('game_ended', (data) => {
  // {
  //   winnerTeam: "A",
  //   teamScores: { A: 1000, B: 870 },
  //   playerScores: [
  //     { playerId: "plxxx...", nickname: "홍길동", team: "A", score: 342 },
  //     { playerId: "plyyy...", nickname: "김철수", team: "A", score: 298 },
  //     { playerId: "plzzz...", nickname: "이영희", team: "B", score: 450 }
  //   ],
  //   mvp: {
  //     playerId: "plzzz...",
  //     nickname: "이영희",
  //     score: 450
  //   }
  // }

  // PC: 승리 팀 발표, MVP 표시, 전체 순위
  // Mobile: 본인 점수 확인, 팀 결과
});
```

---

## Game Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         GAME FLOW                                │
└─────────────────────────────────────────────────────────────────┘

[PC - 호스트]                              [Mobile - 플레이어]
     │                                            │
     │  POST /api/rooms                           │
     │  (방 생성, QR 코드 생성)                     │
     │◄────────────────────────────────────────────
     │                                            │
     │    ┌──────────────────────┐                │
     │    │   QR 코드 표시        │                │
     │    │   입장 대기 화면      │                │
     │    └──────────────────────┘                │
     │                                            │
     │            QR 스캔                          │
     │─────────────────────────────────────────────►
     │                                            │
     │                                   POST /api/rooms/:code/join
     │                                            │
     │              WebSocket 연결                 │
     │◄─────────────────────────────────────────────
     │                                            │
     │              join_room                     │
     │◄─────────────────────────────────────────────
     │                                            │
     │              room_state                    │
     │─────────────────────────────────────────────►
     │                                            │
     │                                   select_team (팀 선택)
     │◄─────────────────────────────────────────────
     │                                            │
     │              player_updated (broadcast)    │
     │◄────────────────────────────────────────────►
     │                                            │
     │                                   toggle_ready (준비)
     │◄─────────────────────────────────────────────
     │                                            │
     │              all_ready                     │
     │◄────────────────────────────────────────────►
     │                                            │
     │  start_tutorial (호스트)                    │
     │─────────────────────────────────────────────►
     │                                            │
     │              tutorial_started              │
     │◄────────────────────────────────────────────►
     │                                            │
     │    ┌──────────────────────┐       ┌──────────────────────┐
     │    │   튜토리얼 안내       │       │   센서 테스트         │
     │    └──────────────────────┘       └──────────────────────┘
     │                                            │
     │                                   sensor_checked
     │◄─────────────────────────────────────────────
     │                                            │
     │              all_sensor_checked            │
     │◄────────────────────────────────────────────►
     │                                            │
     │  select_leaders (호스트)                    │
     │─────────────────────────────────────────────►
     │                                            │
     │              leaders_selected              │
     │◄────────────────────────────────────────────►
     │                                            │
     │  start_cinematic (호스트)                   │
     │─────────────────────────────────────────────►
     │                                            │
     │              cinematic_started             │
     │◄────────────────────────────────────────────►
     │                                            │
     │  start_casting (호스트)                     │
     │─────────────────────────────────────────────►
     │                                            │
     │              casting_phase                 │
     │◄────────────────────────────────────────────►
     │                                            │
     │                                   cast_action (파워)
     │◄─────────────────────────────────────────────
     │                                            │
     │                                   cast_complete (팀장)
     │◄─────────────────────────────────────────────
     │                                            │
     │  start_countdown (호스트)                   │
     │─────────────────────────────────────────────►
     │                                            │
     │              countdown (10→0)              │
     │◄────────────────────────────────────────────►
     │                                            │
     │              game_started                  │
     │◄────────────────────────────────────────────►
     │                                            │
     │    ┌──────────────────────┐       ┌──────────────────────┐
     │    │   물고기 애니메이션   │       │   흔들기 + 진동       │
     │    └──────────────────────┘       └──────────────────────┘
     │                                            │
     │                                   shake (반복)
     │◄─────────────────────────────────────────────
     │                                            │
     │         score_update (실시간)              │
     │◄────────────────────────────────────────────►
     │                                            │
     │              game_ended                    │
     │◄────────────────────────────────────────────►
     │                                            │
     │    ┌──────────────────────┐       ┌──────────────────────┐
     │    │   결과 화면 (전체)    │       │   결과 화면 (개인)    │
     │    │   - 승리 팀          │       │   - 내 점수           │
     │    │   - MVP              │       │   - 팀 결과           │
     │    │   - 전체 순위        │       │   - MVP               │
     │    └──────────────────────┘       └──────────────────────┘
```