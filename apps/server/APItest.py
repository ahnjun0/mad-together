import socketio
import requests
import json
import time
import threading
import random

# --- [설정] ---
# BASE_URL = "http://localhost:3000"
BASE_URL = "https://madcamp.cloud"
API_URL = f"{BASE_URL}/api"
SOCKET_URL = BASE_URL
NAMESPACE = "/game"

HOST_NAME = "Host_PC_Console"
BOT_A_NAME = "Bot_Player_A"
BOT_B_NAME = "Bot_Player_B"

# 소켓 클라이언트
sio_host = socketio.Client()
sio_bot_a = socketio.Client()
sio_bot_b = socketio.Client()

# 상태 플래그 및 공유 변수
is_game_started = False
host_ready_to_start_tutorial = False
casted_teams = set()
bot_a_player_id = None
bot_b_player_id = None
host_player_id = None

def log(role, msg):
    print(f"[{role}] {msg}")

# --------------------------------------------------------------------------------
# HOST (PC View) 이벤트 핸들러 - 게임 진행 제어 및 모니터링
# --------------------------------------------------------------------------------
@sio_host.on('connect', namespace=NAMESPACE)
def on_host_connect():
    log("HOST", "Socket Connected to Room")

@sio_host.on('player_joined', namespace=NAMESPACE)
def on_host_player_joined(data):
    log("HOST", f"➡️ Player Joined: {data.get('nickname')} (ID: {data.get('playerId')})")

@sio_host.on('all_ready', namespace=NAMESPACE)
def on_all_ready():
    global host_ready_to_start_tutorial
    log("HOST", "📢 ALL PLAYERS READY! Starting Tutorial in 3s...")
    host_ready_to_start_tutorial = True

@sio_host.on('tutorial_started', namespace=NAMESPACE)
def on_tutorial_started():
    log("HOST", "🎬 Tutorial Started.")

@sio_host.on('all_sensor_checked', namespace=NAMESPACE)
def on_sensors_ok():
    log("HOST", "✅ All Sensors Checked. Selecting Leaders in 2s...")
    time.sleep(2)
    sio_host.emit('select_leaders', namespace=NAMESPACE)

@sio_host.on('leaders_selected', namespace=NAMESPACE)
def on_leaders(data):
    log("HOST", f"👑 Leaders Selected: {data}")
    time.sleep(2)
    log("HOST", "Starting Cinematic Sequence...")
    sio_host.emit('start_cinematic', namespace=NAMESPACE)

    # 시네마틱 5초 후 캐스팅 단계로 전환 시뮬레이션
    time.sleep(5)
    log("HOST", "Cinematic Finished. Starting Casting Phase...")
    sio_host.emit('start_casting', namespace=NAMESPACE)

@sio_host.on('casting_phase', namespace=NAMESPACE)
def on_casting_phase():
    log("HOST", "🎣 Casting Phase Started. Waiting for Team Leaders to cast...")

@sio_host.on('team_casted', namespace=NAMESPACE)
def check_casting_complete(data):
    global casted_teams
    team = data.get('team')
    log("HOST", f"🎣 Team {team} Casted!")
    casted_teams.add(team)

    if 'A' in casted_teams and 'B' in casted_teams:
        log("HOST", "⚔️ Both Teams Casted! Starting Countdown in 2s...")
        time.sleep(2)
        sio_host.emit('start_countdown', namespace=NAMESPACE)

@sio_host.on('countdown', namespace=NAMESPACE)
def on_countdown(data):
    print(f"HOST: ⏲️ Countdown {data.get('count')}...")

@sio_host.on('game_started', namespace=NAMESPACE)
def on_host_game_start():
    global is_game_started
    is_game_started = True
    print("\n" + "="*50)
    print("🌊 GAME STARTED! MONITORING REAL-TIME SCORES")
    print("="*50 + "\n")

@sio_host.on('score_update', namespace=NAMESPACE)
def on_score(data):
    event = data.get('event')
    teams = data.get('teams')
    if event:
        who = event.get('nickname')
        team = event.get('team')
        print(f"⚡ [SHAKE] {who} ({team}) | Score: A {teams.get('A')} : {teams.get('B')} B")

@sio_host.on('game_ended', namespace=NAMESPACE)
def on_end(data):
    global is_game_started
    is_game_started = False
    print("\n" + "🏁" * 25)
    log("HOST", f"🏆 Game Over! Winner: Team {data.get('winnerTeam')}")
    print(f"MVP: {data.get('mvp', {}).get('nickname')} with {data.get('mvp', {}).get('score')} pts")
    print("-" * 50)
    print("Final Team Scores:")
    print(json.dumps(data.get('teamScores'), indent=2))
    print("🏁" * 25 + "\n")
    sio_host.disconnect()
    sio_bot_a.disconnect()
    sio_bot_b.disconnect()
    exit(0)

# --------------------------------------------------------------------------------
# BOT 이벤트 핸들러
# --------------------------------------------------------------------------------
def setup_bot_handlers(sio, bot_name):
    @sio.on('connect', namespace=NAMESPACE)
    def on_bot_connect():
        log(bot_name, "Socket Connected")

    @sio.on('tutorial_started', namespace=NAMESPACE)
    def on_bot_tut():
        log(bot_name, "Entering Tutorial. Doing sensor check in 1s...")
        time.sleep(1)
        sio.emit('sensor_checked', namespace=NAMESPACE)

    @sio.on('leaders_selected', namespace=NAMESPACE)
    def on_bot_leader_check(data):
        # 내가 팀장인지 확인 로직은 생략하거나 간단히 출력
        pass

    @sio.on('casting_phase', namespace=NAMESPACE)
    def on_bot_cast_phase():
        # 임의로 한 명만 캐스팅하도록 하거나 둘 다 하도록 함
        log(bot_name, "Casting Phase. Casting...")
        time.sleep(random.uniform(2, 4))
        sio.emit('cast_action', {'power': random.randint(30, 80)}, namespace=NAMESPACE)
        sio.emit('cast_complete', {'team': 'A' if 'A' in bot_name else 'B'}, namespace=NAMESPACE)

# setup_bot_handlers(sio_bot_a, BOT_A_NAME)
setup_bot_handlers(sio_bot_b, BOT_B_NAME)

# --------------------------------------------------------------------------------
# 로직 실행 및 루프
# --------------------------------------------------------------------------------
def bot_shake_loop(sio):
    while True:
        if is_game_started:
            time.sleep(random.uniform(0.5, 2.0))
            if sio.connected:
                sio.emit('shake', {'count': 1}, namespace=NAMESPACE)
        else:
            time.sleep(0.5)
        if not sio.connected and not is_game_started: break

def main():
    global host_ready_to_start_tutorial, bot_a_player_id, bot_b_player_id, host_player_id
    try:
        # 1. 호스트 로그인 & 방 생성
        host_token = f"dev-token-{HOST_NAME}"
        log("MAIN", "Step 1: Creating Room...")
        res = requests.post(
            f"{API_URL}/rooms",
            headers={"Authorization": f"Bearer {host_token}"},
            json={"teamAName": "불꽃팀", "teamBName": "파도팀", "maxPlayers": 10, "goalScore": 50}
        )
        res.raise_for_status()
        room_data = res.json()
        room_code, room_id = room_data['code'], room_data['roomId']

        print("\n" + "="*60)
        print(f"🏠 ROOM CREATED: {room_code}")
        print("="*60 + "\n")

        # 2. 호스트 소켓 연결
        res_info = requests.get(f"{API_URL}/rooms/{room_code}", headers={"Authorization": f"Bearer {host_token}"})
        host_player_id = next(p['id'] for p in res_info.json()['players'] if p.get('isHost'))
        sio_host.connect(SOCKET_URL, auth={'token': host_token}, namespaces=[NAMESPACE])
        sio_host.emit('join_room', {'roomId': room_id, 'playerId': host_player_id}, namespace=NAMESPACE)

        # 3. 봇 A 입장 (Team A)
        # log("MAIN", "Step 2: Bot A joining Team A...")
        # bot_a_token = f"dev-token-{BOT_A_NAME}"
        # res_join_a = requests.post(f"{API_URL}/rooms/{room_code}/join", headers={"Authorization": f"Bearer {bot_a_token}"})
        # bot_a_player_id = res_join_a.json()['playerId']
        # sio_bot_a.connect(SOCKET_URL, auth={'token': bot_a_token}, namespaces=[NAMESPACE])
        # sio_bot_a.emit('join_room', {'roomId': room_id, 'playerId': bot_a_player_id}, namespace=NAMESPACE)
        # time.sleep(0.5)
        # sio_bot_a.emit('select_team', {'team': 'A'}, namespace=NAMESPACE)
        # time.sleep(0.2)
        # sio_bot_a.emit('toggle_ready', {}, namespace=NAMESPACE)

        # 4. 봇 B 입장 (Team B)
        log("MAIN", "Step 3: Bot B joining Team B...")
        bot_b_token = f"dev-token-{BOT_B_NAME}"
        res_join_b = requests.post(f"{API_URL}/rooms/{room_code}/join", headers={"Authorization": f"Bearer {bot_b_token}"})
        bot_b_player_id = res_join_b.json()['playerId']
        sio_bot_b.connect(SOCKET_URL, auth={'token': bot_b_token}, namespaces=[NAMESPACE])
        sio_bot_b.emit('join_room', {'roomId': room_id, 'playerId': bot_b_player_id}, namespace=NAMESPACE)
        time.sleep(0.5)
        sio_bot_b.emit('select_team', {'team': 'B'}, namespace=NAMESPACE)
        time.sleep(0.2)
        sio_bot_b.emit('toggle_ready', {}, namespace=NAMESPACE)

        # 봇 흔들기 스레드
        threading.Thread(target=bot_shake_loop, args=(sio_bot_a,), daemon=True).start()
        threading.Thread(target=bot_shake_loop, args=(sio_bot_b,), daemon=True).start()

        # 메인 루프
        while True:
            if host_ready_to_start_tutorial:
                time.sleep(1)
                sio_host.emit('start_tutorial', namespace=NAMESPACE)
                host_ready_to_start_tutorial = False
            time.sleep(0.1)

    except KeyboardInterrupt:
        log("MAIN", "Stopping...")
    finally:
        sio_host.disconnect()
        sio_bot_a.disconnect()
        sio_bot_b.disconnect()

if __name__ == "__main__":
    main()
