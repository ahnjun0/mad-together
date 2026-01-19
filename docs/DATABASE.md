# Database Specification

## Overview

본 프로젝트는 두 가지 데이터 저장소를 사용합니다:

| 저장소 | 용도 | 데이터 특성 |
|--------|------|-------------|
| **PostgreSQL** | 영구 데이터 저장 | 사용자 정보, 게임 결과 |
| **Redis** | 실시간 임시 데이터 | 게임 상태, 점수, 준비 상태 |

---

## PostgreSQL Schema

### ERD (Entity Relationship Diagram)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │       │    Room     │       │    Game     │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◄──┐   │ id (PK)     │◄──────│ id (PK)     │
│ googleId    │   │   │ code        │       │ roomId (FK) │
│ nickname    │   │   │ hostId (FK) │───┐   │ winnerTeam  │
│ profileImage│   │   │ status      │   │   │ teamAScore  │
│ refreshToken│   │   │ teamAName   │   │   │ teamBScore  │
│ createdAt   │   │   │ teamBName   │   │   │ startedAt   │
└─────────────┘   │   │ maxPlayers  │   │   │ endedAt     │
                  │   │ createdAt   │   │   └─────────────┘
                  │   │ expiresAt   │   │
                  │   └─────────────┘   │
                  │          ▲          │
                  │          │          │
                  │   ┌─────────────┐   │
                  │   │   Player    │   │
                  │   ├─────────────┤   │
                  └───│ userId (FK) │   │
                      │ roomId (FK) │───┘
                      │ team        │
                      │ isHost      │
                      │ isLeader    │
                      │ createdAt   │
                      └─────────────┘
```

---

### User (사용자)

Google Auth와 연동되는 사용자 정보를 저장합니다.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `String` | PK, CUID | 고유 식별자 |
| `googleId` | `String` | UNIQUE, NOT NULL | Google 사용자 UID |
| `nickname` | `String` | NOT NULL | 닉네임 (사용자 설정) |
| `profileImage` | `String?` | NULLABLE | 프로필 이미지 URL |
| `currentRefreshToken` | `String?` | NULLABLE | JWT Refresh Token (Hashed) |
| `createdAt` | `DateTime` | NOT NULL, DEFAULT NOW | 가입 일시 |

**Relations:**
- `players`: 참여한 게임 방 목록 (1:N)
- `hostedRooms`: 호스트한 방 목록 (1:N)

---

### Room (게임 방)

게임 방 정보를 저장합니다. QR 코드 입장에 사용되는 `code`는 6자리 영숫자입니다.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `String` | PK, CUID | 고유 식별자 |
| `code` | `String` | UNIQUE, NOT NULL | 6자리 입장 코드 (QR용) |
| `hostId` | `String` | FK → User.id | 방장 사용자 ID |
| `status` | `RoomStatus` | NOT NULL, DEFAULT 'WAITING' | 방 상태 |
| `teamAName` | `String` | NOT NULL, DEFAULT 'A팀' | A팀 이름 (호스트 지정) |
| `teamBName` | `String` | NOT NULL, DEFAULT 'B팀' | B팀 이름 (호스트 지정) |
| `maxPlayers` | `Int` | NOT NULL, DEFAULT 10 | 방 최대 인원수 |
| `createdAt` | `DateTime` | NOT NULL, DEFAULT NOW | 생성 일시 |
| `expiresAt` | `DateTime` | NOT NULL | 만료 일시 (생성 후 1시간) |

**RoomStatus Enum:**

게임의 진행 단계에 따라 방의 상태가 변경됩니다.

| Status | Name | 상세 설명 |
|--------|------|-----------|
| `WAITING` | **대기실** | 초기 상태. 플레이어들이 입장하여 팀을 선택하고 준비(`Ready`)를 완료하는 단계입니다. 모든 인원이 준비되면 호스트가 게임을 시작할 수 있습니다. |
| `CINEMATIC` | **시네마틱** | 게임의 몰입감을 높이는 인트로 영상 재생 단계입니다. PC 화면에서는 영상을 보여주고, 모바일에서는 출항 느낌의 진동(Haptic) 피드백을 제공합니다. |
| `TUTORIAL` | **튜토리얼** | 게임 조작법 안내 및 센서 확인 단계입니다. 모든 플레이어가 휴대폰을 흔들어 가속도 센서의 작동 여부를 서버에 증명(`sensor_checked`)해야 다음으로 넘어갑니다. |
| `CASTING` | **캐스팅** | 팀별 팀장이 낚싯줄을 던지는 단계입니다. 팀장은 폰을 크게 휘둘러 가속도 피크값(`power`)을 전송하며, 양 팀의 투척이 완료되면 경기가 시작됩니다. |
| `PLAYING` | **경기 진행** | 메인 게임 단계입니다. 모든 팀원이 휴대폰을 흔들어 점수를 올리며, 서버는 실시간으로 점수를 집계하여 팀별 물고기 거리를 업데이트합니다. |
| `FINISHED` | **게임 종료** | 목표 점수에 도달하거나 경기가 끝난 상태입니다. 최종 승리 팀과 MVP, 개인별 기여도를 리더보드 형태로 보여주고 게임 로그를 DB에 영구 저장합니다. |


**Relations:**
- `host`: 방장 User (N:1)
- `players`: 참가자 목록 (1:N)
- `games`: 게임 결과 목록 (1:N)

---

### Player (방 참가자)

방에 참여한 플레이어 정보입니다. 같은 유저가 같은 방에 중복 참가할 수 없습니다.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `String` | PK, CUID | 고유 식별자 |
| `userId` | `String` | FK → User.id | 사용자 ID |
| `roomId` | `String` | FK → Room.id, CASCADE DELETE | 방 ID |
| `team` | `Team?` | NULLABLE | 소속 팀 (null = 미배정) |
| `isHost` | `Boolean` | NOT NULL, DEFAULT false | 방장 여부 |
| `isLeader` | `Boolean` | NOT NULL, DEFAULT false | 팀장 여부 |
| `createdAt` | `DateTime` | NOT NULL, DEFAULT NOW | 입장 일시 |

**Team Enum:**
```typescript
enum Team {
  A = 'A'
  B = 'B'
}
```

**Unique Constraint:**
- `@@unique([userId, roomId])` - 한 방에 같은 유저 중복 참가 방지

---

### Game (게임 결과)

완료된 게임의 결과만 저장합니다. 진행 중인 점수는 Redis에서 관리합니다.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `String` | PK, CUID | 고유 식별자 |
| `roomId` | `String` | FK → Room.id, CASCADE DELETE | 방 ID |
| `winnerTeam` | `Team?` | NULLABLE | 승리 팀 (null = 무승부) |
| `teamAScore` | `Int` | NOT NULL, DEFAULT 0 | A팀 최종 점수 |
| `teamBScore` | `Int` | NOT NULL, DEFAULT 0 | B팀 최종 점수 |
| `startedAt` | `DateTime` | NOT NULL | 게임 시작 일시 |
| `endedAt` | `DateTime` | NOT NULL | 게임 종료 일시 |

**Index:**
- `@@index([roomId])` - 방별 게임 조회 최적화

---

## Redis Data Structure

Redis는 게임 중 실시간으로 변하는 데이터를 저장합니다. 게임 종료 시 PostgreSQL에 최종 결과만 저장됩니다.

### Key Naming Convention

```
room:{roomId}                    → 방 전체 상태 (Hash)
room:{roomId}:player:{playerId}  → 플레이어별 상태 (Hash)
```

---

### Room State (`room:{roomId}`)

| Field | Type | Description |
|-------|------|-------------|
| `score:A` | `Int` | A팀 현재 점수 |
| `score:B` | `Int` | B팀 현재 점수 |
| `goalScore` | `Int` | 게임 목표 점수 (기본값 1000) |

**예시:**
```redis
HSET room:abc123 score:A 450 score:B 380 goalScore 100
HGET room:abc123 score:A  → "450"
HINCRBY room:abc123 score:A 5  → 455
```

---

### Player State (`room:{roomId}:player:{playerId}`)

| Field | Type | Description |
|-------|------|-------------|
| `isReady` | `0` \| `1` | 준비 완료 여부 |
| `sensorChecked` | `0` \| `1` | 센서 확인 완료 여부 |
| `isLeader` | `0` \| `1` | 팀장 여부 |
| `score` | `Int` | 개인 기여 점수 |

**예시:**
```redis
HSET room:abc123:player:xyz789 isReady 1 sensorChecked 0 isLeader 0 score 0
HGET room:abc123:player:xyz789 isReady  → "1"
HINCRBY room:abc123:player:xyz789 score 5  → 5
```

---

### Data Lifecycle

```
[방 생성]
  └─→ PostgreSQL: Room 생성
  └─→ Redis: room:{roomId} 초기화 (score:A=0, score:B=0, goalScore=1000)

[플레이어 입장]
  └─→ PostgreSQL: Player 생성
  └─→ Redis: room:{roomId}:player:{playerId} 생성

[준비/센서 확인]
  └─→ Redis: isReady, sensorChecked 업데이트

[게임 시작]
  └─→ PostgreSQL: Room.status = PLAYING
  └─→ Redis: 모든 플레이어 score = 0 초기화

[게임 중 (흔들기)]
  └─→ Redis: score:A/B 증가, 개인 score 증가

[게임 종료]
  └─→ PostgreSQL: Game 생성 (최종 점수 저장)
  └─→ PostgreSQL: Room.status = FINISHED

[방 만료/삭제]
  └─→ Redis: room:{roomId}* 키 삭제
  └─→ PostgreSQL: Room CASCADE DELETE
```

---

## Connection Info (Development)

### PostgreSQL
```
Host: localhost
Port: 5432
Database: fish_db
Username: user
Password: password

Connection URL:
postgresql://user:password@localhost:5432/fish_db?schema=public
```

### Redis
```
Host: localhost
Port: 6379
```

### Docker Compose
```bash
# 실행
docker-compose up -d db redis

# 접속 (PostgreSQL)
docker exec -it fish-db psql -U user -d fish_db

# 접속 (Redis)
docker exec -it fish-redis redis-cli
```