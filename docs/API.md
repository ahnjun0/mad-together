# API Specification

## Overview

| Protocol | Base URL | Description |
|----------|----------|-------------|
| REST API | `https://{domain}/api` | 방 생성, 입장, 사용자 관리 |
| WebSocket | `wss://{domain}/game` | 실시간 게임 통신 |

---

## Authentication

모든 API는 Firebase Authentication을 사용합니다.

### Header
```
Authorization: Bearer {Firebase ID Token}
```

### Token 획득 (Frontend)
```typescript
const user = firebase.auth().currentUser;
const idToken = await user.getIdToken();
```

---

# REST API

## Auth (인증)

### POST /api/auth/register

신규 사용자 등록 또는 기존 사용자 조회

**Request:**
```json
{
  "idToken": "Firebase ID Token",
  "nickname": "홍길동"
}
```

**Response (200 OK):**
```json
{
  "userId": "clxxx...",
  "nickname": "홍길동"
}
```

---

### POST /api/auth/nickname

닉네임 변경 (인증 필요)

**Request:**
```json
{
  "nickname": "새닉네임"
}
```

**Response (200 OK):**
```json
{
  "userId": "clxxx...",
  "nickname": "새닉네임"
}
```

---

## Rooms (게임 방)

### POST /api/rooms

새 게임 방 생성 (인증 필요)

**Request:**
```json
{
  "teamAName": "불꽃팀",
  "teamBName": "파도팀"
}
```

**Response (201 Created):**
```json
{
  "roomId": "clxxx...",
  "code": "ABC123",
  "qrCode": "data:image/png;base64,...",
  "teamAName": "불꽃팀",
  "teamBName": "파도팀"
}
```

**Notes:**
- `code`: 6자리 입장 코드 (QR에 포함)
- `qrCode`: Base64 인코딩된 QR 이미지
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
| Status | Description |
|--------|-------------|
| `WAITING` | 대기 중 (입장 가능) |
| `TUTORIAL` | 튜토리얼/센서 확인 |
| `CASTING` | 팀장 캐스팅 중 |
| `PLAYING` | 게임 진행 중 |
| `FINISHED` | 게임 종료 |

**Errors:**
- `404 Not Found`: 방을 찾을 수 없음
- `400 Bad Request`: 방이 만료됨

---

### POST /api/rooms/:code/join

방 입장 (인증 필요)

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

팀 선택 (인증 필요)

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
    token: firebaseIdToken
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

팀 선택

```typescript
socket.emit('select_team', {
  team: "A"  // "A" | "B" | null
});
```

---

### `toggle_ready`

준비 상태 토글

```typescript
socket.emit('toggle_ready');
```

---

### `sensor_checked`

센서 확인 완료

```typescript
socket.emit('sensor_checked');
```

---

### `start_tutorial`

튜토리얼 시작 (호스트 전용)

```typescript
socket.emit('start_tutorial');
```

---

### `select_leaders`

팀장 랜덤 선정 (호스트 전용)

```typescript
socket.emit('select_leaders');
```

---

### `start_casting`

캐스팅 단계 시작 (호스트 전용)

```typescript
socket.emit('start_casting');
```

---

### `cast_complete`

캐스팅 완료 (팀장 전용)

```typescript
socket.emit('cast_complete', {
  team: "A"  // 본인 팀
});
```

---

### `start_countdown`

10초 카운트다운 시작 (호스트 전용)

```typescript
socket.emit('start_countdown');
```

---

### `shake`

흔들기 이벤트 (게임 중)

```typescript
socket.emit('shake', {
  intensity: 50  // 흔들기 강도 (0-100)
});
```

**Notes:**
- `intensity`에 따라 1~5점이 추가됩니다
- 계산식: `Math.max(1, Math.min(Math.floor(intensity / 10), 5))`

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
  // 팀 변경: { playerId: "plxxx...", team: "A" }
  // 준비 상태: { playerId: "plxxx...", isReady: true }
  // 센서 확인: { playerId: "plxxx...", sensorChecked: true }
});
```

---

### `all_ready`

모든 플레이어 준비 완료

```typescript
socket.on('all_ready', () => {
  // 호스트가 게임 시작 가능
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
  // 튜토리얼 UI 표시
});
```

---

### `leaders_selected`

팀장 선정 완료

```typescript
socket.on('leaders_selected', (data) => {
  // { teamA: "plxxx...", teamB: "plyyy..." }
});
```

---

### `casting_phase`

캐스팅 단계 시작

```typescript
socket.on('casting_phase', () => {
  // 팀장에게 캐스팅 UI 표시
});
```

---

### `team_casted`

팀 캐스팅 완료

```typescript
socket.on('team_casted', (data) => {
  // { team: "A" }
});
```

---

### `countdown`

카운트다운 (10초 → 0초)

```typescript
socket.on('countdown', (data) => {
  // { count: 10 } → { count: 9 } → ... → { count: 0 }
});
```

---

### `game_started`

게임 시작

```typescript
socket.on('game_started', () => {
  // 게임 UI로 전환, 흔들기 감지 시작
});
```

---

### `player_shook`

누군가 흔들었을 때 (실시간)

```typescript
socket.on('player_shook', (data) => {
  // {
  //   playerId: "plxxx...",
  //   nickname: "홍길동",
  //   team: "A",
  //   amount: 5,           // 이번에 획득한 점수
  //   playerScore: 127,    // 개인 누적 점수
  //   teamScore: 450       // 팀 누적 점수
  // }

  // UI 예시: 닉네임 옆에 "+5" 애니메이션 표시
});
```

---

### `score_update`

주기적 점수 업데이트 (200ms 간격)

```typescript
socket.on('score_update', (data) => {
  // {
  //   teams: { A: 450, B: 380 },
  //   players: {
  //     "plxxx...": 127,
  //     "plyyy...": 98
  //   }
  // }
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
     │              select_team                   │
     │◄─────────────────────────────────────────────
     │                                            │
     │              player_updated (broadcast)    │
     │◄────────────────────────────────────────────►
     │                                            │
     │              toggle_ready                  │
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
     │              sensor_checked                │
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
     │  start_casting (호스트)                     │
     │─────────────────────────────────────────────►
     │                                            │
     │              casting_phase                 │
     │◄────────────────────────────────────────────►
     │                                            │
     │              cast_complete (팀장)           │
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
     │              shake (반복)                   │
     │◄─────────────────────────────────────────────
     │                                            │
     │              player_shook (broadcast)      │
     │◄────────────────────────────────────────────►
     │                                            │
     │              score_update (200ms)          │
     │◄────────────────────────────────────────────►
     │                                            │
     │              game_ended                    │
     │◄────────────────────────────────────────────►
     │                                            │
```

---

## Error Handling

### HTTP Errors

| Status | Description |
|--------|-------------|
| `400 Bad Request` | 잘못된 요청 (만료된 방, 잘못된 상태) |
| `401 Unauthorized` | 인증 실패 (토큰 없음/만료) |
| `404 Not Found` | 리소스를 찾을 수 없음 |
| `500 Internal Server Error` | 서버 오류 |

### WebSocket Errors

연결 실패 시 자동 disconnect됩니다.
```typescript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.log('Connection failed:', error.message);
});
```

---

## Frontend Integration Example

### React + Socket.io

```typescript
import { io, Socket } from 'socket.io-client';
import { useEffect, useState } from 'react';

function useGameSocket(token: string, roomId: string, playerId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({ A: 0, B: 0 });

  useEffect(() => {
    const newSocket = io('wss://your-domain.com/game', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      newSocket.emit('join_room', { roomId, playerId });
    });

    newSocket.on('room_state', (data) => {
      setPlayers(data.players);
    });

    newSocket.on('player_shook', (data) => {
      // 닉네임 표시 애니메이션
      showFloatingText(`${data.nickname} +${data.amount}`);
    });

    newSocket.on('score_update', (data) => {
      setScores(data.teams);
    });

    newSocket.on('game_ended', (data) => {
      // 결과 화면 표시
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, roomId, playerId]);

  const shake = (intensity: number) => {
    socket?.emit('shake', { intensity });
  };

  return { socket, players, scores, shake };
}
```
