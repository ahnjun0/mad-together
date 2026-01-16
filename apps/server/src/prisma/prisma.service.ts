import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // 1. PostgreSQL 연결 풀(Pool) 생성
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL 
    });

    // 2. Prisma용 어댑터 생성
    const adapter = new PrismaPg(pool);

    // 3. 어댑터를 PrismaClient 생성자에 전달
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
