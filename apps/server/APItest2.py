import socketio
import requests
import json
import time
import threading
import random
import sys

# --- [설정] ---
BASE_URL = "https://madcamp.cloud"
API_URL = f"{BASE_URL}/api"
SOCKET_URL = BASE_URL
NAMESPACE = "/game"
room_code = "8GC9GU"  # 테스트용 방 코드

# 봇 정보
BOT_NAME = f"Extra_Bot_{random.randint(100, 999)}"
TEAM = random.choice(['A', 'B'])

sio = socketio.Client()
is_game_started = False

def log(msg):
    print(f"[{BOT_NAME}] {msg}")

@sio.on('connect', namespace=NAMESPACE)
def on_connect():
    log("Socket Connected")

@sio.on('game_started', namespace=NAMESPACE)
def on_game_start():
    global is_game_started
    is_game_started = True
    log("🌊 GAME STARTED! Starting shake loop...")

@sio.on('game_ended', namespace=NAMESPACE)
def on_end(data):
    global is_game_started
    is_game_started = False
    log(f"🏁 Game Over! Winner: Team {data.get('winnerTeam')}")
    sio.disconnect()
    sys.exit(0)

@sio.on('score_update', namespace=NAMESPACE)
def on_score(data):
    # 점수 업데이트 로그 (선택 사항)
    pass

def bot_shake_loop():
    while True:
        if is_game_started and sio.connected:
            time.sleep(random.uniform(0.5, 1.5))
            sio.emit('shake', {'count': 1}, namespace=NAMESPACE)
        elif not sio.connected and not is_game_started:
            break
        else:
            time.sleep(0.5)

def main():
    # if len(sys.argv) < 2:
    #     print("Usage: python APItest2.py <ROOM_CODE>")
    #     return

    # room_code = sys.argv[1].upper()
    bot_token = f"dev-token-{BOT_NAME}"

    try:
        # 1. 방 정보 확인 및 입장 (API)
        log(f"Step 1: Joining Room {room_code}...")
        res = requests.post(
            f"{API_URL}/rooms/{room_code}/join",
            headers={"Authorization": f"Bearer {bot_token}"}
        )
        res.raise_for_status()
        data = res.json()

        room_id = data['roomId']
        player_id = data['playerId']
        log(f"Joined! Player ID: {player_id}")

        # 2. 소켓 연결
        sio.connect(SOCKET_URL, auth={'token': bot_token}, namespaces=[NAMESPACE])

        # 3. 방 입장 이벤트 전송
        sio.emit('join_room', {'roomId': room_id, 'playerId': player_id}, namespace=NAMESPACE)
        time.sleep(0.5)

        # 4. 팀 선택 및 준비
        log(f"Step 2: Selecting Team {TEAM} and toggling ready...")
        sio.emit('select_team', {'team': TEAM}, namespace=NAMESPACE)
        time.sleep(0.5)
        sio.emit('toggle_ready', {}, namespace=NAMESPACE)

        # 5. 흔들기 루프 시작
        threading.Thread(target=bot_shake_loop, daemon=True).start()

        # 메인 대기
        while sio.connected:
            time.sleep(1)

    except Exception as e:
        log(f"Error: {e}")
    finally:
        if sio.connected:
            sio.disconnect()

if __name__ == "__main__":
    main()
