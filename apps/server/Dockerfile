FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY prisma ./prisma/

# 의존성 설치
RUN npm install

# Prisma Client 생성
RUN npx prisma generate

COPY . .

# 빌드
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
# [중요] runtime에 prisma schema 파일이 필요합니다.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

EXPOSE 3000

CMD ["sh", "-c", "echo 'DATABASE_URL is: ' $DATABASE_URL && npx prisma migrate deploy && node dist/src/main.js"]
