const API_BASE_URL = 'https://madcamp.cloud/api';

/**
 * Create a new game room (Host only)
 * @param {string} teamAName - Name for Team A
 * @param {string} teamBName - Name for Team B
 * @param {number} maxPlayers - Maximum players per team (optional)
 * @returns {Promise<{roomId: string, code: string, qrCode: string, teamAName: string, teamBName: string}>}
 */
export async function createRoom(teamAName, teamBName, maxPlayers = 10) {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In production, add Authorization header with Firebase token
        // 'Authorization': `Bearer ${firebaseToken}`
      },
      body: JSON.stringify({
        teamAName,
        teamBName,
        maxPlayers,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create room' }));
      throw new Error(error.message || 'Failed to create room');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
}
