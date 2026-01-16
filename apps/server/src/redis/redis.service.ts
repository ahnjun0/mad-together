import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly subscriber: Redis;

  constructor(private configService: ConfigService) {
    const redisConfig = {
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
    };

    this.client = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);
  }

  onModuleDestroy() {
    this.client.disconnect();
    this.subscriber.disconnect();
  }

  getClient(): Redis {
    return this.client;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }

  // ============ 게임 상태 관리 (Redis) ============

  // 방의 실시간 상태 키
  private roomKey(roomId: string) {
    return `room:${roomId}`;
  }

  private playerKey(roomId: string, oderId: string) {
    return `room:${roomId}:player:${oderId}`;
  }

  // 플레이어 준비 상태
  async setPlayerReady(roomId: string, playerId: string, isReady: boolean) {
    await this.client.hset(this.playerKey(roomId, playerId), 'isReady', isReady ? '1' : '0');
  }

  async getPlayerReady(roomId: string, playerId: string): Promise<boolean> {
    const value = await this.client.hget(this.playerKey(roomId, playerId), 'isReady');
    return value === '1';
  }

  // 센서 확인 상태
  async setSensorChecked(roomId: string, playerId: string, checked: boolean) {
    await this.client.hset(this.playerKey(roomId, playerId), 'sensorChecked', checked ? '1' : '0');
  }

  async getSensorChecked(roomId: string, playerId: string): Promise<boolean> {
    const value = await this.client.hget(this.playerKey(roomId, playerId), 'sensorChecked');
    return value === '1';
  }

  // 팀장 여부
  async setTeamLeader(roomId: string, playerId: string, isLeader: boolean) {
    await this.client.hset(this.playerKey(roomId, playerId), 'isLeader', isLeader ? '1' : '0');
  }

  async getTeamLeader(roomId: string, playerId: string): Promise<boolean> {
    const value = await this.client.hget(this.playerKey(roomId, playerId), 'isLeader');
    return value === '1';
  }

  // 방의 모든 플레이어 상태 가져오기
  async getRoomPlayers(roomId: string): Promise<string[]> {
    const keys = await this.client.keys(`room:${roomId}:player:*`);
    return keys.map(k => k.split(':').pop()).filter((k): k is string => k !== undefined);
  }

  // 팀 점수 관리
  async incrementTeamScore(roomId: string, team: 'A' | 'B', amount: number = 1): Promise<number> {
    return this.client.hincrby(this.roomKey(roomId), `score:${team}`, amount);
  }

  async getTeamScores(roomId: string): Promise<{ A: number; B: number }> {
    const [scoreA, scoreB] = await Promise.all([
      this.client.hget(this.roomKey(roomId), 'score:A'),
      this.client.hget(this.roomKey(roomId), 'score:B'),
    ]);
    return {
      A: parseInt(scoreA || '0', 10),
      B: parseInt(scoreB || '0', 10),
    };
  }

  async resetTeamScores(roomId: string) {
    await this.client.hset(this.roomKey(roomId), 'score:A', '0', 'score:B', '0');
  }

  // ============ 개인 점수 관리 ============

  // 개인 점수 증가
  async incrementPlayerScore(roomId: string, playerId: string, amount: number = 1): Promise<number> {
    return this.client.hincrby(this.playerKey(roomId, playerId), 'score', amount);
  }

  // 개인 점수 조회
  async getPlayerScore(roomId: string, playerId: string): Promise<number> {
    const score = await this.client.hget(this.playerKey(roomId, playerId), 'score');
    return parseInt(score || '0', 10);
  }

  // 방의 모든 플레이어 점수 조회
  async getAllPlayerScores(roomId: string, playerIds: string[]): Promise<Map<string, number>> {
    const scores = new Map<string, number>();
    const results = await Promise.all(
      playerIds.map(id => this.getPlayerScore(roomId, id))
    );
    playerIds.forEach((id, index) => {
      scores.set(id, results[index]);
    });
    return scores;
  }

  // 개인 점수 초기화
  async resetPlayerScore(roomId: string, playerId: string) {
    await this.client.hset(this.playerKey(roomId, playerId), 'score', '0');
  }

  // 방의 모든 플레이어 점수 초기화
  async resetAllPlayerScores(roomId: string, playerIds: string[]) {
    await Promise.all(
      playerIds.map(id => this.resetPlayerScore(roomId, id))
    );
  }

  // 방 데이터 초기화
  async initRoom(roomId: string) {
    await this.client.hset(this.roomKey(roomId), 'score:A', '0', 'score:B', '0');
  }

  // 방 데이터 삭제
  async cleanupRoom(roomId: string) {
    const playerKeys = await this.client.keys(`room:${roomId}:player:*`);
    if (playerKeys.length > 0) {
      await this.client.del(...playerKeys);
    }
    await this.client.del(this.roomKey(roomId));
  }

  // 모든 플레이어가 준비되었는지 확인
  async areAllPlayersReady(roomId: string, playerIds: string[]): Promise<boolean> {
    const results = await Promise.all(
      playerIds.map(id => this.getPlayerReady(roomId, id))
    );
    return results.every(ready => ready === true);
  }

  // 모든 플레이어가 센서 확인했는지
  async areAllSensorChecked(roomId: string, playerIds: string[]): Promise<boolean> {
    const results = await Promise.all(
      playerIds.map(id => this.getSensorChecked(roomId, id))
    );
    return results.every(checked => checked === true);
  }
}
