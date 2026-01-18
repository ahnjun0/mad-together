FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# 빌드 시점에 API URL 필요
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# 실행 시 dist 폴더의 내용을 볼륨 마운트 경로(/output)로 복사하고 종료
CMD ["sh", "-c", "rm -rf /output/* && cp -r dist/* /output/"]
