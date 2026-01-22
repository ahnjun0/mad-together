# Stress Test Bot

20명의 플레이어(팀당 10명)를 시뮬레이션하여 게임 서버를 스트레스 테스트하는 봇 시스템입니다.

## 설치

```bash
cd apps/server/scripts
pip install -r requirements.txt
```

## 사용법

### 기본 실행 (로컬 서버)

```bash
# 1. 먼저 PC 웹에서 방을 생성하고 방 코드를 확인
# 2. 봇 실행
python stress-test.py --room-code ABC123
```

### 프로덕션 서버 테스트

```bash
python stress-test.py --room-code ABC123 --server https://madcamp.cloud
```

### 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--room-code` | 방 코드 (필수) | - |
| `--server` | 서버 URL | `http://localhost:3000` |
| `--bots-per-team` | 팀당 봇 수 | `10` |
| `--shake-interval` | Shake 신호 간격 (초) | `0.5` |
| `--shake-duration` | Shake 지속 시간 (초) | `60` |

### 예시

```bash
# 팀당 5명씩 총 10명 봇
python stress-test.py --room-code ABC123 --bots-per-team 5

# 빠른 Shake (0.2초 간격)
python stress-test.py --room-code ABC123 --shake-interval 0.2

# 30초간만 Shake
python stress-test.py --room-code ABC123 --shake-duration 30
```

## 게임 플로우

봇은 다음 순서로 게임에 참여합니다:

1. **방 입장** - HTTP API로 방에 참가
2. **소켓 연결** - WebSocket 연결 및 join_room
3. **팀 선택** - A팀/B팀 자동 배정
4. **준비 완료** - toggle_ready 전송
5. **센서 체크** - sensor_checked 전송
6. **캐스팅** - cast_complete 전송
7. **게임 플레이** - 지정된 간격으로 shake 신호 전송
8. **게임 종료** - 결과 대기

## 출력 예시

```
============================================================
                    STRESS TEST BOT
============================================================
Server: http://localhost:3000
Room Code: ABC123
Bots per team: 10 (Total: 20)
Shake interval: 0.5s
------------------------------------------------------------

[14:30:01] Bot-A-01 joined room successfully
[14:30:01] Bot-A-02 joined room successfully
...
[14:30:05] All 20 bots connected and ready!

[14:30:10] Game state changed to: CINEMATIC
[14:30:20] Game state changed to: TUTORIAL
[14:30:30] Game state changed to: CASTING
[14:30:35] Game state changed to: PLAYING
[14:30:35] Starting shake signals...

============================================================
                    FINAL STATS
============================================================
Total shakes sent: 2400
  Team A: 1200
  Team B: 1200
Connected bots: 20/20
Errors: 0
Duration: 60.0s
============================================================
```

## 주의사항

1. **방 생성 필요**: 봇을 실행하기 전에 PC 웹에서 방을 먼저 생성해야 합니다.
2. **maxPlayers 설정**: 방 생성 시 maxPlayers를 10 이상으로 설정하세요 (팀당 10명).
3. **호스트 필요**: 게임 시작은 PC 호스트에서 수동으로 해야 합니다.
4. **네트워크 부하**: 20개의 동시 WebSocket 연결이 생성되므로 로컬 테스트 시 주의하세요.

## 트러블슈팅

### "Room is full" 에러
- 방의 maxPlayers 설정을 확인하세요 (기본값: 10명 → 팀당 5명만 가능)
- `--bots-per-team` 옵션으로 봇 수를 줄이세요

### 소켓 연결 실패
- 서버가 실행 중인지 확인하세요
- 방 코드가 올바른지 확인하세요
- 서버 URL이 정확한지 확인하세요

### Shake 신호가 전송되지 않음
- 게임이 PLAYING 상태인지 확인하세요
- PC 호스트에서 게임을 시작했는지 확인하세요
