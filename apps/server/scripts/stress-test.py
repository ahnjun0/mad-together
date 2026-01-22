#!/usr/bin/env python3
"""
=======================================================================
MAD TOGETHER - Stress Test Bot System
=======================================================================
팀당 10명씩 총 20명의 봇이 게임에 참여하여 실제 사용자처럼 동작합니다.

사용법:
  python stress-test.py [옵션]

옵션:
  --url URL           서버 URL (기본: https://madcamp.cloud)
  --bots N            총 봇 수 (기본: 20, 짝수여야 함)
  --shake-interval N  흔들기 간격 (초, 기본: 0.3)
  --room-code CODE    기존 방 코드 (없으면 새로 생성)
  --host-only         호스트만 실행 (봇 없이 모니터링)

예시:
  python stress-test.py                          # 20명 봇으로 새 게임
  python stress-test.py --bots 10                # 10명 봇으로 새 게임
  python stress-test.py --room-code ABC123       # 기존 방에 봇 입장
  python stress-test.py --shake-interval 0.1    # 빠른 흔들기
=======================================================================
"""

import socketio
import requests
import json
import time
import threading
import random
import argparse
import sys
from dataclasses import dataclass
from typing import Optional, Dict, List
from datetime import datetime

# ============================================================================
# 설정
# ============================================================================
@dataclass
class Config:
    base_url: str = "https://madcamp.cloud"
    total_bots: int = 20
    shake_interval: float = 0.3  # 초
    room_code: Optional[str] = None
    host_only: bool = False
    nickname_prefix: str = "Bot"

# ============================================================================
# 통계 추적
# ============================================================================
class Stats:
    def __init__(self):
        self.lock = threading.Lock()
        self.shake_counts: Dict[str, int] = {}  # player_id -> count
        self.connected_bots: int = 0
        self.ready_bots: int = 0
        self.game_started: bool = False
        self.game_ended: bool = False
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.errors: List[str] = []

    def add_shake(self, player_id: str):
        with self.lock:
            self.shake_counts[player_id] = self.shake_counts.get(player_id, 0) + 1

    def total_shakes(self) -> int:
        with self.lock:
            return sum(self.shake_counts.values())

    def add_error(self, msg: str):
        with self.lock:
            self.errors.append(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

    def print_summary(self):
        print("\n" + "=" * 60)
        print("📊 STRESS TEST SUMMARY")
        print("=" * 60)
        print(f"  Connected Bots: {self.connected_bots}")
        print(f"  Ready Bots: {self.ready_bots}")
        print(f"  Total Shakes: {self.total_shakes()}")
        if self.start_time and self.end_time:
            duration = (self.end_time - self.start_time).total_seconds()
            print(f"  Game Duration: {duration:.1f}s")
            print(f"  Shakes/Second: {self.total_shakes() / duration:.1f}")
        if self.errors:
            print(f"\n  ⚠️ Errors ({len(self.errors)}):")
            for err in self.errors[-5:]:  # 최근 5개만
                print(f"    - {err}")
        print("=" * 60 + "\n")

stats = Stats()

# ============================================================================
# 유틸리티
# ============================================================================
def log(role: str, msg: str, color: str = ""):
    colors = {
        "red": "\033[91m",
        "green": "\033[92m",
        "yellow": "\033[93m",
        "blue": "\033[94m",
        "purple": "\033[95m",
        "cyan": "\033[96m",
        "reset": "\033[0m"
    }
    c = colors.get(color, "")
    r = colors["reset"] if color else ""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"{c}[{timestamp}] [{role}] {msg}{r}")

# ============================================================================
# 호스트 클래스 (게임 진행 제어)
# ============================================================================
class GameHost:
    def __init__(self, config: Config):
        self.config = config
        self.sio = socketio.Client(logger=False, engineio_logger=False)
        self.room_id: Optional[str] = None
        self.room_code: Optional[str] = None
        self.token = f"dev-token-StressTestHost-{int(time.time())}"
        self.all_ready = False
        self.all_sensors_checked = False
        self.casted_teams = set()
        self.setup_handlers()

    def setup_handlers(self):
        ns = "/game"

        @self.sio.on('connect', namespace=ns)
        def on_connect():
            log("HOST", "✅ Socket Connected", "green")

        @self.sio.on('disconnect', namespace=ns)
        def on_disconnect():
            log("HOST", "❌ Socket Disconnected", "red")

        @self.sio.on('room_state', namespace=ns)
        def on_room_state(data):
            players = data.get('players', [])
            team_a = [p for p in players if p.get('team') == 'A']
            team_b = [p for p in players if p.get('team') == 'B']
            log("HOST", f"📊 Room State: {len(players)} players (A:{len(team_a)}, B:{len(team_b)})")

        @self.sio.on('player_joined', namespace=ns)
        def on_player_joined(data):
            log("HOST", f"➡️ Player Joined: {data.get('nickname')}", "cyan")

        @self.sio.on('all_ready', namespace=ns)
        def on_all_ready():
            self.all_ready = True
            log("HOST", "🎉 ALL PLAYERS READY!", "green")

        @self.sio.on('team_imbalance', namespace=ns)
        def on_team_imbalance(data):
            log("HOST", f"⚠️ Team Imbalance: A={data.get('teamACount')}, B={data.get('teamBCount')}", "yellow")

        @self.sio.on('all_sensor_checked', namespace=ns)
        def on_sensors_checked():
            self.all_sensors_checked = True
            log("HOST", "📱 All Sensors Checked!", "green")

        @self.sio.on('leaders_selected', namespace=ns)
        def on_leaders(data):
            log("HOST", f"👑 Leaders Selected: A={data.get('teamA', {}).get('nickname')}, B={data.get('teamB', {}).get('nickname')}")

        @self.sio.on('casting_phase', namespace=ns)
        def on_casting():
            log("HOST", "🎣 Casting Phase Started")

        @self.sio.on('team_casted', namespace=ns)
        def on_team_casted(data):
            team = data.get('team')
            self.casted_teams.add(team)
            log("HOST", f"🪝 Team {team} Casted! ({len(self.casted_teams)}/2)")

        @self.sio.on('game_started', namespace=ns)
        def on_game_started(data):
            stats.game_started = True
            stats.start_time = datetime.now()
            log("HOST", "🌊 GAME STARTED!", "green")
            print("\n" + "🎮" * 25)
            print("  GAME IN PROGRESS - MONITORING SCORES")
            print("🎮" * 25 + "\n")

        @self.sio.on('score_update', namespace=ns)
        def on_score_update(data):
            teams = data.get('teams', {})
            event = data.get('event', {})
            if event:
                nickname = event.get('nickname', 'Unknown')
                team = event.get('team', '?')
                sys.stdout.write(f"\r⚡ A:{teams.get('A', 0):4d} | B:{teams.get('B', 0):4d} | Last: {nickname}({team})")
                sys.stdout.flush()

        @self.sio.on('game_ended', namespace=ns)
        def on_game_ended(data):
            stats.game_ended = True
            stats.end_time = datetime.now()
            print("\n\n" + "🏁" * 25)
            log("HOST", f"🏆 GAME OVER! Winner: Team {data.get('winnerTeam')}", "green")
            mvp = data.get('mvp', {})
            if mvp:
                log("HOST", f"⭐ MVP: {mvp.get('nickname')} ({mvp.get('score')} pts)")
            scores = data.get('teamScores', {})
            log("HOST", f"📊 Final Score: A={scores.get('A', 0)}, B={scores.get('B', 0)}")
            print("🏁" * 25 + "\n")

    def create_room(self) -> tuple:
        """방 생성 또는 기존 방 정보 조회"""
        api_url = f"{self.config.base_url}/api"
        headers = {"Authorization": f"Bearer {self.token}"}

        if self.config.room_code:
            # 기존 방 정보 조회
            log("HOST", f"Fetching room info: {self.config.room_code}")
            res = requests.get(f"{api_url}/rooms/{self.config.room_code}", headers=headers)
            res.raise_for_status()
            data = res.json()
            self.room_id = data['roomId']
            self.room_code = data['code']
        else:
            # 새 방 생성
            log("HOST", "Creating new room...")
            bots_per_team = self.config.total_bots // 2
            res = requests.post(
                f"{api_url}/rooms",
                headers=headers,
                json={
                    "teamAName": "🔥 Fire Team",
                    "teamBName": "🌊 Wave Team",
                    "maxPlayers": bots_per_team + 5,  # 여유분
                    "goalScore": bots_per_team * 100  # 인당 100점
                }
            )
            res.raise_for_status()
            data = res.json()
            self.room_id = data['roomId']
            self.room_code = data['code']

        log("HOST", f"📍 Room: {self.room_code} (ID: {self.room_id})", "green")
        return self.room_id, self.room_code

    def connect(self):
        """소켓 연결"""
        self.sio.connect(
            self.config.base_url,
            auth={'token': self.token},
            namespaces=['/game']
        )
        self.sio.emit('join_room', {'roomId': self.room_id}, namespace='/game')

    def wait_for_ready(self, timeout: int = 120):
        """모든 플레이어 준비 대기"""
        log("HOST", f"Waiting for all players to be ready (timeout: {timeout}s)...")
        start = time.time()
        while not self.all_ready and time.time() - start < timeout:
            time.sleep(0.5)
        return self.all_ready

    def start_tutorial(self):
        log("HOST", "Starting Tutorial...")
        self.sio.emit('start_tutorial', namespace='/game')

    def wait_for_sensors(self, timeout: int = 30):
        """센서 체크 대기"""
        start = time.time()
        while not self.all_sensors_checked and time.time() - start < timeout:
            time.sleep(0.5)
        return self.all_sensors_checked

    def select_leaders(self):
        log("HOST", "Selecting Leaders...")
        self.sio.emit('select_leaders', namespace='/game')

    def start_cinematic(self):
        log("HOST", "Starting Cinematic...")
        self.sio.emit('start_cinematic', namespace='/game')

    def start_casting(self):
        log("HOST", "Starting Casting Phase...")
        self.sio.emit('start_casting', namespace='/game')

    def start_casting_timer(self):
        log("HOST", "Starting Casting Timer...")
        self.sio.emit('start_casting_timer', namespace='/game')

    def wait_for_casts(self, timeout: int = 30):
        """양 팀 캐스팅 완료 대기"""
        start = time.time()
        while len(self.casted_teams) < 2 and time.time() - start < timeout:
            time.sleep(0.5)
        return len(self.casted_teams) >= 2

    def start_countdown(self):
        log("HOST", "Starting Countdown...")
        self.sio.emit('start_countdown', namespace='/game')

    def disconnect(self):
        if self.sio.connected:
            self.sio.disconnect()

# ============================================================================
# 봇 클래스 (플레이어 시뮬레이션)
# ============================================================================
class PlayerBot:
    def __init__(self, bot_id: int, team: str, config: Config):
        self.bot_id = bot_id
        self.team = team  # 'A' or 'B'
        self.config = config
        self.sio = socketio.Client(logger=False, engineio_logger=False)
        self.token = f"dev-token-Bot{bot_id}-{int(time.time())}"
        self.nickname = f"{config.nickname_prefix}_{team}{bot_id:02d}"
        self.player_id: Optional[str] = None
        self.room_id: Optional[str] = None
        self.is_leader = False
        self.game_state = "WAITING"
        self.connected = False
        self.shake_thread: Optional[threading.Thread] = None
        self.stop_shaking = False
        self.setup_handlers()

    def setup_handlers(self):
        ns = "/game"

        @self.sio.on('connect', namespace=ns)
        def on_connect():
            self.connected = True
            stats.connected_bots += 1

        @self.sio.on('disconnect', namespace=ns)
        def on_disconnect():
            self.connected = False
            stats.connected_bots -= 1

        @self.sio.on('room_state', namespace=ns)
        def on_room_state(data):
            if data.get('room', {}).get('status'):
                self.game_state = data['room']['status']
            # 리더 확인
            for p in data.get('players', []):
                if p.get('id') == self.player_id or p.get('playerId') == self.player_id:
                    self.is_leader = p.get('isLeader', False)
                    break

        @self.sio.on('tutorial_started', namespace=ns)
        def on_tutorial():
            self.game_state = 'TUTORIAL'
            # 센서 체크
            time.sleep(random.uniform(0.5, 2.0))
            self.sio.emit('sensor_checked', namespace=ns)

        @self.sio.on('casting_phase', namespace=ns)
        def on_casting():
            self.game_state = 'CASTING'

        @self.sio.on('casting_start', namespace=ns)
        def on_casting_start():
            # 리더만 캐스팅
            if self.is_leader:
                time.sleep(random.uniform(0.5, 1.5))
                power = random.randint(50, 90)
                self.sio.emit('cast_action', {'power': power}, namespace=ns)
                time.sleep(0.5)
                self.sio.emit('cast_complete', {'team': self.team}, namespace=ns)

        @self.sio.on('game_started', namespace=ns)
        def on_game_started(data):
            self.game_state = 'PLAYING'
            # 흔들기 시작
            self.start_shaking()

        @self.sio.on('game_ended', namespace=ns)
        def on_game_ended(data):
            self.game_state = 'FINISHED'
            self.stop_shaking = True

        @self.sio.on('player_kicked', namespace=ns)
        def on_kicked(data):
            log(self.nickname, f"Kicked: {data.get('message')}", "red")
            stats.add_error(f"{self.nickname} kicked")

    def join_room(self, room_code: str, room_id: str):
        """방 입장"""
        self.room_id = room_id
        api_url = f"{self.config.base_url}/api"

        try:
            # HTTP로 방 입장
            res = requests.post(
                f"{api_url}/rooms/{room_code}/join",
                headers={"Authorization": f"Bearer {self.token}"},
                json={"nickname": self.nickname}
            )
            res.raise_for_status()
            data = res.json()
            self.player_id = data['playerId']

            # 소켓 연결
            self.sio.connect(
                self.config.base_url,
                auth={'token': self.token},
                namespaces=['/game']
            )
            self.sio.emit('join_room', {
                'roomId': room_id,
                'playerId': self.player_id
            }, namespace='/game')

            return True
        except Exception as e:
            stats.add_error(f"{self.nickname} join failed: {str(e)}")
            return False

    def select_team(self):
        """팀 선택"""
        time.sleep(random.uniform(0.1, 0.3))
        self.sio.emit('select_team', {'team': self.team}, namespace='/game')

    def toggle_ready(self):
        """준비 완료"""
        time.sleep(random.uniform(0.2, 0.5))
        self.sio.emit('toggle_ready', namespace='/game')
        stats.ready_bots += 1

    def start_shaking(self):
        """흔들기 스레드 시작"""
        def shake_loop():
            while not self.stop_shaking and self.connected and stats.game_started and not stats.game_ended:
                try:
                    # 랜덤 간격으로 흔들기
                    interval = self.config.shake_interval * random.uniform(0.5, 1.5)
                    time.sleep(interval)
                    if self.sio.connected:
                        self.sio.emit('shake', {'count': 1}, namespace='/game')
                        stats.add_shake(self.player_id)
                except Exception as e:
                    pass

        self.shake_thread = threading.Thread(target=shake_loop, daemon=True)
        self.shake_thread.start()

    def disconnect(self):
        self.stop_shaking = True
        if self.sio.connected:
            self.sio.disconnect()

# ============================================================================
# 메인 실행
# ============================================================================
def run_stress_test(config: Config):
    host = GameHost(config)
    bots: List[PlayerBot] = []

    try:
        # 1. 방 생성/조회
        print("\n" + "=" * 60)
        print("🚀 MAD TOGETHER STRESS TEST")
        print("=" * 60)
        print(f"  Server: {config.base_url}")
        print(f"  Total Bots: {config.total_bots}")
        print(f"  Shake Interval: {config.shake_interval}s")
        print("=" * 60 + "\n")

        room_id, room_code = host.create_room()

        print("\n" + "🎯" * 20)
        print(f"  ROOM CODE: {room_code}")
        print("🎯" * 20 + "\n")

        # 2. 호스트 소켓 연결
        host.connect()
        time.sleep(1)

        if config.host_only:
            log("HOST", "Host-only mode. Waiting for players to join manually...")
            input("Press Enter when ready to start the game...")
        else:
            # 3. 봇 생성 및 입장
            log("MAIN", f"Creating {config.total_bots} bots...")
            bots_per_team = config.total_bots // 2

            for i in range(bots_per_team):
                # Team A 봇
                bot_a = PlayerBot(i + 1, 'A', config)
                if bot_a.join_room(room_code, room_id):
                    bots.append(bot_a)
                    log("BOT", f"✅ {bot_a.nickname} joined", "cyan")
                else:
                    log("BOT", f"❌ {bot_a.nickname} failed to join", "red")

                # Team B 봇
                bot_b = PlayerBot(i + 1, 'B', config)
                if bot_b.join_room(room_code, room_id):
                    bots.append(bot_b)
                    log("BOT", f"✅ {bot_b.nickname} joined", "cyan")
                else:
                    log("BOT", f"❌ {bot_b.nickname} failed to join", "red")

                # 서버 부하 분산
                time.sleep(0.2)

            log("MAIN", f"✅ {len(bots)}/{config.total_bots} bots connected")
            time.sleep(1)

            # 4. 팀 선택
            log("MAIN", "Bots selecting teams...")
            for bot in bots:
                bot.select_team()
            time.sleep(1)

            # 5. 준비 완료
            log("MAIN", "Bots getting ready...")
            for bot in bots:
                bot.toggle_ready()
            time.sleep(1)

        # 6. 모든 플레이어 준비 대기
        if not host.wait_for_ready():
            log("HOST", "⚠️ Timeout waiting for players", "yellow")

        # 7. 튜토리얼 시작
        time.sleep(2)
        host.start_tutorial()

        # 8. 센서 체크 대기
        if not host.wait_for_sensors():
            log("HOST", "⚠️ Timeout waiting for sensors", "yellow")

        # 9. 리더 선택
        time.sleep(1)
        host.select_leaders()
        time.sleep(2)

        # 10. 시네마틱
        host.start_cinematic()
        time.sleep(3)

        # 11. 캐스팅
        host.start_casting()
        time.sleep(1)
        host.start_casting_timer()

        # 12. 캐스팅 완료 대기
        if not host.wait_for_casts():
            log("HOST", "⚠️ Timeout waiting for casts", "yellow")

        # 13. 게임 시작 카운트다운
        time.sleep(2)
        host.start_countdown()

        # 14. 게임 종료 대기
        log("MAIN", "Game in progress... (Ctrl+C to stop)")
        while not stats.game_ended:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n")
        log("MAIN", "Stopping stress test...", "yellow")
    except Exception as e:
        log("MAIN", f"Error: {e}", "red")
        import traceback
        traceback.print_exc()
    finally:
        # 정리
        log("MAIN", "Cleaning up...")
        for bot in bots:
            bot.disconnect()
        host.disconnect()

        # 통계 출력
        stats.print_summary()

def main():
    parser = argparse.ArgumentParser(description="MAD TOGETHER Stress Test Bot")
    parser.add_argument('--url', default='https://madcamp.cloud', help='Server URL')
    parser.add_argument('--bots', type=int, default=20, help='Total number of bots (must be even)')
    parser.add_argument('--shake-interval', type=float, default=0.3, help='Shake interval in seconds')
    parser.add_argument('--room-code', help='Existing room code to join')
    parser.add_argument('--host-only', action='store_true', help='Run host only without bots')

    args = parser.parse_args()

    if args.bots % 2 != 0:
        print("Error: Number of bots must be even")
        sys.exit(1)

    config = Config(
        base_url=args.url,
        total_bots=args.bots,
        shake_interval=args.shake_interval,
        room_code=args.room_code,
        host_only=args.host_only
    )

    run_stress_test(config)

if __name__ == "__main__":
    main()
