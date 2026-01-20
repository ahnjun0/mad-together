const HOST = import.meta.env.VITE_API_URL || 'https://madcamp.cloud';
export const API_BASE_URL = `${HOST.replace(/\/$/, '')}/api`;

// 개발 모드 토큰 생성 헬퍼
export function generateDevToken(prefix = 'host') {
  return `dev-token-${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Get room by code (to get playerId for host)
 */
export async function getRoomByCode(code, devToken = null) {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (devToken) {
      headers['Authorization'] = `Bearer ${devToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/rooms/${code}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to get room' }));
      throw new Error(error.message || 'Failed to get room');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting room:', error);
    throw error;
  }
}

/**
 * Join room as bot (for DevTools)
 */
export async function joinRoomAsBot(code, devToken, nickname = null) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${devToken}`,
    };

    console.log('[API] 📡 POST /rooms/' + code + '/join', {
      headers: { ...headers, Authorization: 'Bearer ***' },
      body: nickname ? { nickname } : null,
    });

    // body가 undefined이면 Content-Type 헤더 제거
    if (!nickname) {
      delete headers['Content-Type'];
    }

    const response = await fetch(`${API_BASE_URL}/rooms/${code}/join`, {
      method: 'POST',
      headers,
      ...(nickname && { body: JSON.stringify({ nickname }) }),
    });

    console.log('[API] 📥 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] ❌ Error response:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || 'Failed to join room' };
      }
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to join room`);
    }

    const data = await response.json();
    console.log('[API] ✅ Success response:', data);
    return data;
  } catch (error) {
    console.error('[API] ❌ Error joining room as bot:', error);
    throw error;
  }
}

/**
 * Create a new game room (Host only)
 * Host는 Player로 등록되지 않음 (Observer 역할)
 * @param {string} teamAName - Name for Team A
 * @param {string} teamBName - Name for Team B
 * @param {number} maxPlayers - Maximum players per team (optional)
 * @param {string} accessToken - JWT access token
 * @returns {Promise<{roomId: string, code: string, qrCode: string, teamAName: string, teamBName: string}>}
 */
export async function createRoom(roomName, teamAName, teamBName, maxPlayers = 10, accessToken = null) {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/rooms`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        roomName,
        teamAName,
        teamBName,
        maxPlayers,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create room' }));
      throw new Error(error.message || 'Failed to create room');
    }

    const roomData = await response.json();
    // Host는 더 이상 Player로 등록되지 않으므로 hostPlayerId 조회 불필요
    return roomData;
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
}
