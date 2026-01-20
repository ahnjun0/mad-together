# API Specification

## Overview

| Protocol  | Base URL                 | Description                |
| --------- | ------------------------ | -------------------------- |
| REST API  | `https://{domain}/api` | 방 생성, 입장, 사용자 관리 |
| WebSocket | `wss://{domain}/game`  | 실시간 게임 통신           |

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

### POST /api/auth/refresh

토큰 갱신

**Request:**

```json
{
  "userId": "clxxx...",
  "refreshToken": "ey..."
}
```

### POST /api/auth/logout

로그아웃

**Response (200 OK):**

```json
{
  "message": "Logged out successfully"
}
```

### POST /api/auth/profile

프로필 수정 (닉네임, 이미지) - `multipart/form-data`

**Request:**

- `nickname`: 새로운 닉네임 (필수)
- `file`: 이미지 파일 (Optional, JPG/PNG/HEIC 등)

**Response (200 OK):**

```json
{
  "userId": "clxxx...",
  "nickname": "새닉네임",
  "profileImage": "/uploads/filename.jpg"
}
```

### POST /api/auth/nickname

닉네임만 수정

**Request:**

```json
{
  "nickname": "새닉네임"
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
  "goalScore": 1000  // Optional
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

### GET /api/rooms/active/me

자신이 호스트인 활성화된 방 조회 - **PC 전용**

**Response (200 OK):**

```json
{
  "hasActiveRoom": true,
  "room": {
    "roomId": "clxxx...",
    "code": "ABC123",
    "status": "WAITING",
    "players": [...]
  }
}
```

### GET /api/rooms/:code

방 정보 조회

**Response (200 OK):**

```json
{
  "roomId": "clxxx...",
  "code": "ABC123",
  "status": "WAITING",
  "host": { "id": "...", "nickname": "..." },
  "players": [...]
}
```

### POST /api/rooms/:code/join

방 입장 (인증 필요) - **Mobile 전용**

**Request:**

```json
{
  "nickname": "게임용닉네임",
  "profileImage": "..." // Optional
}
```

**Response (200 OK):**

```json
{
  "roomId": "clxxx...",
  "playerId": "plxxx...",
  "code": "ABC123",
  "nickname": "게임용닉네임",
  "isExisting": false
}
```

### PATCH /api/rooms/:roomId/players/:playerId/team

팀 선택 (인증 필요)

**Request:**

```json
{
  "team": "A" // or "B" or null
}
```

---

# WebSocket API

## Connection

### Endpoint
`wss://{domain}/game`

### Authentication
`socket.handshake.auth.token`에 Access Token 전달.

---

## Client → Server Events

### `join_room`
방 입장.

```javascript
socket.emit('join_room', {
  roomId: "clxxx...",
  playerId: "plxxx..." // Host인 경우 생략 가능하거나 Host용 ID 처리
});
```

### `leave_room`
방 퇴장.

### `select_team`
팀 선택.

```javascript
socket.emit('select_team', {
  team: "A" // or null
});
```

### `toggle_ready`
준비 상태 변경.

### `sensor_checked`
센서 확인 완료.

### `start_tutorial` (Host)
튜토리얼 단계 시작.

### `start_cinematic` (Host)
시네마틱 단계 시작.

### `select_leaders` (Host)
팀장 랜덤 선정.

### `start_casting` (Host)
캐스팅 단계 시작.

### `cast_action` (Mobile Leader)
캐스팅 파워 전송.

```javascript
socket.emit('cast_action', { power: 45 });
```

### `cast_complete` (Mobile Leader)
캐스팅 동작 완료 알림.

### `start_countdown` (Host)
게임 시작 카운트다운(10초) 시작.

### `shake` (Mobile)
휴대폰 흔들기. (Schmitt Trigger 적용됨)

```javascript
socket.emit('shake', { count: 1 });
```

### `delegate_leader` (Mobile Leader)
팀장 위임.

```javascript
socket.emit('delegate_leader', { newLeaderId: "..." });
```

---

## Server → Client Events

### `room_state`
방 입장 시 전체 상태 동기화.

```javascript
{
  "room": { ... },
  "teamScores": { "A": 0, "B": 0 },
  "players": [
    {
      "id": "...",
      "nickname": "...",
      "team": "A",
      "score": 10,
      "isReady": true,
      "sensorChecked": true
    }
  ]
}
```

### `player_joined` / `player_left`
플레이어 입장/퇴장 알림.

### `player_updated`
플레이어 상태 변경 (팀, 준비, 센서, 리더 여부 등).

```javascript
{
  "playerId": "...",
  "team": "A",
  "isLeader": true,
  "isReady": true
}
```

### `leader_updated`
팀장 변경 알림.

```javascript
{
  "team": "A",
  "newLeaderId": "...",
  "nickname": "..."
}
```

### `all_ready` / `all_sensor_checked`
모든 플레이어 준비/센서확인 완료 알림.

### `tutorial_started` / `cinematic_started` / `casting_phase` / `game_started` / `game_ended`
게임 단계 변경 알림.

### `cast_result`
팀장의 캐스팅 파워 브로드캐스트 (연출용).

### `team_casted`
팀 캐스팅 완료 알림.

### `countdown`
카운트다운 숫자 (10 -> 0).

### `score_update`
실시간 점수 업데이트 (Host에게만 전송됨).

```javascript
{
  "event": {
    "playerId": "...",
    "amount": 1,
    "playerScore": 15
  },
  "teams": { "A": 100, "B": 95 }
}
```
