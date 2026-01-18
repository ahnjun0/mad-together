import socketio
import requests
import json
import time
import threading

# --- [설정] ---
# BASE_URL = "http://localhost:3000"
BASE_URL = "https://madcamp.cloud"
API_URL = f"{BASE_URL}/api"
SOCKET_URL = BASE_URL
NAMESPACE = "/game"

HOST_NAME = "Host_PC_Console"
BOT_NAME = "Bot_Player_B"

# 소켓 클라이언트
sio_host = socketio.Client()
sio_bot = socketio.Client()

# 상태 플래그
is_game_started = False
host_ready_to_start_tutorial = False

def log(role, msg):
    print(f"[{role}] {msg}")

# --------------------------------------------------------------------------------
# HOST (PC View) 이벤트 핸들러
# --------------------------------------------------------------------------------
@sio_host.on('connect', namespace=NAMESPACE)
def on_host_connect():
    log("HOST", "Socket Connected to Room")

@sio_host.on('player_joined', namespace=NAMESPACE)
def on_host_player_joined(data):
    log("HOST", f"➡️ Player Joined: {data.get('nickname')} (ID: {data.get('playerId')})")

@sio_host.on('player_updated', namespace=NAMESPACE)
def on_player_updated(data):
    if 'isReady' in data:
        status = "READY" if data['isReady'] else "NOT READY"
        # log("HOST", f"Player {data.get('playerId')} is now {status}")

@sio_host.on('all_ready', namespace=NAMESPACE)
def on_all_ready():
    global host_ready_to_start_tutorial
    log("HOST", "\n📢 ALL PLAYERS READY! (Host can now start tutorial)")
    host_ready_to_start_tutorial = True

@sio_host.on('tutorial_started', namespace=NAMESPACE)
def on_tutorial_started():
    log("HOST", "🎬 Tutorial Started. Waiting for sensor checks...")

@sio_host.on('all_sensor_checked', namespace=NAMESPACE)
def on_sensors_ok():
    log("HOST", "✅ All Sensors Checked. Automatically selecting leaders in 2s...")
    time.sleep(2)
    sio_host.emit('select_leaders', namespace=NAMESPACE)

@sio_host.on('leaders_selected', namespace=NAMESPACE)
def on_leaders(data):
    log("HOST", f"👑 Leaders Selected: {data}")
    time.sleep(1)
    log("HOST", "Starting Casting Phase...")
    sio_host.emit('start_casting', namespace=NAMESPACE)

@sio_host.on('casting_phase', namespace=NAMESPACE)
def on_casting_phase():
    log("HOST", "🎣 Casting Phase Started. Waiting for team leaders to cast...")
    # 여기서 Bot은 B팀이면 자동으로 캐스팅 할 것임.
    # 사용자가 A팀 리더면 직접 폰에서 캐스팅해야 함.

@sio_host.on('team_casted', namespace=NAMESPACE)
def on_team_casted(data):
    log("HOST", f"🎣 Team {data.get('team')} Casted!")

# 호스트는 양팀 캐스팅 완료를 감지해서 카운트다운을 시작해야 함.
# 서버가 별도 이벤트를 주지 않는다면 클라가 추적해야 하지만,
# 여기서는 편의상 캐스팅 이벤트가 2번(A, B) 오면 카운트다운 하거나,
# 리더가 봇이 아닌 경우 수동으로 기다릴 수도 있음.
# 간단히 하기 위해 'team_casted'가 오면 잠시 후 카운트다운 시도 (중복 호출 방지는 서버나 로직에서 처리)
# 실제로는 양팀 다 되었는지 확인 필요. 여기서는 Bot 로직에서 처리하거나, Host가 무조건 시도.
casted_teams = set()
@sio_host.on('team_casted', namespace=NAMESPACE)
def check_casting_complete(data):
    casted_teams.add(data.get('team'))
    if 'A' in casted_teams and 'B' in casted_teams:
        log("HOST", "⚔️ Both Teams Ready! Starting Countdown in 2s...")
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
    print("🌊 GAME STARTED! SHAKE YOUR PHONE NOW!")
    print("="*50 + "\n")

@sio_host.on('score_update', namespace=NAMESPACE)
def on_score(data):
    # 누가 흔들었는지 출력
    event = data.get('event')
    teams = data.get('teams')
    if event:
        who = event.get('nickname')
        score = event.get('amount')
        team = event.get('team')
        print(f"⚡ [SHAKE] {who} ({team}) +{score} | Score: A {teams.get('A')} : {teams.get('B')} B")

@sio_host.on('game_ended', namespace=NAMESPACE)
def on_end(data):
    global is_game_started
    is_game_started = False
    print("\n" + "="*50)
    log("HOST", f"🏆 Game Over! Winner: {data.get('winnerTeam')}")
    print("MVP:", data.get('mvp'))
    print("="*50 + "\n")
    # 종료
    sio_host.disconnect()
    sio_bot.disconnect()
    exit(0)

# --------------------------------------------------------------------------------
# BOT (Team B Player) 이벤트 핸들러
# --------------------------------------------------------------------------------
@sio_bot.on('connect', namespace=NAMESPACE)
def on_bot_connect():
    log("BOT", "Socket Connected")

@sio_bot.on('tutorial_started', namespace=NAMESPACE)
def on_bot_tut():
    log("BOT", "Doing sensor check...")
    time.sleep(1)
    sio_bot.emit('sensor_checked', namespace=NAMESPACE)

@sio_bot.on('casting_phase', namespace=NAMESPACE)
def on_bot_cast_phase():
    # 봇이 B팀 리더일 수도 있으므로 일단 시도
    log("BOT", "Attempting to cast (if leader)...")
    time.sleep(1.5)
    sio_bot.emit('cast_action', {'power': 30}, namespace=NAMESPACE)
    sio_bot.emit('cast_complete', {'team': 'B'}, namespace=NAMESPACE)

@sio_bot.on('game_started', namespace=NAMESPACE)
def on_bot_game_start():
    log("BOT", "Game Started! I will shake occasionally.")
    # 봇 흔들기 로직은 별도 스레드에서 수행

# --------------------------------------------------------------------------------
# MAIN
# --------------------------------------------------------------------------------
def bot_shake_loop():
    """게임 중일 때 봇이 가끔 흔드는 로직"""
    while True:
        if is_game_started:
            # 1~3초 간격으로 흔들기
            time.sleep(2)
            if sio_bot.connected:
                sio_bot.emit('shake', {'count': 1}, namespace=NAMESPACE)
        else:
            time.sleep(0.5)

def main():
    global host_ready_to_start_tutorial
    try:
        # 1. 호스트 로그인 & 방 생성
        host_token = f"dev-token-{HOST_NAME}"

        log("MAIN", "Creating Room...")
        try:
            res = requests.post(
                f"{API_URL}/rooms",
                headers={"Authorization": f"Bearer {host_token}"},
                json={"teamAName": "Team A", "teamBName": "Team B", "maxPlayers": 10}
            )
            res.raise_for_status()
        except Exception as e:
            log("ERROR", f"Failed to create room: {e}")
            log("HINT", "Make sure the NestJS server is running (npm run start:dev)")
            return

        room_data = res.json()
        room_code = room_data['code']
        room_id = room_data['roomId']
        qr_code = room_data.get('qrCode', '')

        print("\n" + "="*60)
        print(f"🏠 ROOM CREATED")
        print(f"   Room Code: {room_code}")
        print(f"   Room ID  : {room_id}")
        print("-" * 60)
        print("📷 QR CODE (Base64) - Copy and use in QR generator if needed:")
        # 너무 길 수 있으니 앞부분만 보여줄지, 전체 보여줄지 고민.
        # 사용자가 확인해야 하므로 전체 출력.
        print(qr_code)
        print("-" * 60)
        print(f"👉 MOBILE URL: {BASE_URL}/mobile (Simulated)")
        print(f"   Use Room Code [{room_code}] to join manually.")
        print("="*60 + "\n")

        # 2. 호스트 소켓 연결 (PC View 역할)
        # 호스트 플레이어 ID 찾기
        res_info = requests.get(f"{API_URL}/rooms/{room_code}", headers={"Authorization": f"Bearer {host_token}"})
        players_info = res_info.json()['players']
        print(f"DEBUG: Players in room: {players_info}")
        
        # 닉네임 매칭 대신 isHost=True인 플레이어를 찾습니다.
        try:
            host_pid = next(p['id'] for p in players_info if p.get('isHost'))
        except StopIteration:
            log("ERROR", "Could not find Host player in the room info.")
            return

        sio_host.connect(SOCKET_URL, auth={'token': host_token}, namespaces=[NAMESPACE])
        sio_host.emit('join_room', {'roomId': room_id, 'playerId': host_pid}, namespace=NAMESPACE)
        # 호스트는 이제 관전만 하므로 팀 선택이나 준비 안함

        # 3. 봇 입장 (Team B)
        bot_token = f"dev-token-{BOT_NAME}"
        res_join = requests.post(
            f"{API_URL}/rooms/{room_code}/join",
            headers={"Authorization": f"Bearer {bot_token}"},
            json={"nickname": BOT_NAME}
        )
        bot_pid = res_join.json()['playerId']

        sio_bot.connect(SOCKET_URL, auth={'token': bot_token}, namespaces=[NAMESPACE])
        sio_bot.emit('join_room', {'roomId': room_id, 'playerId': bot_pid}, namespace=NAMESPACE)
        time.sleep(0.5)

        # 봇: B팀 선택 & 준비
        sio_bot.emit('select_team', {'team': 'B'}, namespace=NAMESPACE)
        time.sleep(0.2)
        sio_bot.emit('toggle_ready', {}, namespace=NAMESPACE)
        log("BOT", f"Joined Room {room_code}, Selected Team B, and is READY.")

        # 봇 스레드 시작
        t = threading.Thread(target=bot_shake_loop, daemon=True)
        t.start()

        print("\n" + "*"*60)
        print(f"⚠️  WAITING FOR YOU TO JOIN (Room: {room_code})")
        print("   1. Join Team A")
        print("   2. Press 'Ready'")
        print("*"*60 + "\n")

        # 메인 루프: 호스트가 준비되면 자동으로 튜토리얼 시작
        while True:
            if host_ready_to_start_tutorial:
                log("HOST", "All players ready! Starting Tutorial in 2s...")
                time.sleep(2) # 2초 대기
                sio_host.emit('start_tutorial', namespace=NAMESPACE)
                host_ready_to_start_tutorial = False # Reset

            time.sleep(0.1)

    except KeyboardInterrupt:
        log("MAIN", "Stopping...")
    finally:
        if sio_host.connected: sio_host.disconnect()
        if sio_bot.connected: sio_bot.disconnect()

if __name__ == "__main__":
    main()
