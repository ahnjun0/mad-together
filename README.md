# KaHook! 🎣

**KaHoot!**은 스마트폰을 낚시대 컨트롤러로 사용하여, 대형 스크린(PC)을 보며 즐기는 **인터랙티브 멀티 스크린 파티 게임**입니다.

가속도 센서(Accelerometer)를 이용한 캐스팅과 흔들기(Shaking) 인식을 통해, 실제 낚시를 하는 듯한 손맛과 몰입감을 제공합니다. 웹 기술만으로 구현되어 앱 설치 없이 QR 코드 스캔만으로 즉시 참여할 수 있습니다.

🔗 **Play Live:** [https://madcamp.cloud](https://madcamp.cloud)

---

## 🎮 게임 컨셉 & 플레이 방법

**"당신의 폰이 낚시대가 됩니다!"**

1.  **호스트 (PC 화면):** 드넓은 3D 바다와 배가 펼쳐지는 메인 게임 화면입니다. QR 코드를 띄워 플레이어를 모집하고 게임 상황을 중계합니다.
2.  **플레이어 (모바일):** QR 코드로 접속하면 스마트폰이 낚시 컨트롤러로 변신합니다.
3.  **액션 (Action):**
    *   **Casting (던지기):** 팀장이 스마트폰을 실제 낚시대처럼 휘둘러 찌를 멀리 던집니다. (가속도 센서 Peak 감지)
    *   **Reeling (감기):** 물고기가 잡히면 스마트폰을 빠르게 흔들어 낚아 올립니다. (Shake 모션 감지)
    *   **Haptic (손맛):** 배가 움직이거나 입질이 올 때 스마트폰 진동을 통해 현장감을 전달합니다.

---

## 🚀 핵심 기능

*   **멀티 디바이스 실시간 동기화:** WebSocket(Socket.io)을 활용하여 PC(호스트)와 다수의 모바일(클라이언트) 간의 상태를 ms 단위로 동기화합니다.
*   **실시간 모션 인식 (Sensor Fusion):** 모바일의 `DeviceMotion` API를 활용하여 사용자의 제스처(던지기 강도, 흔들기 속도)를 정밀하게 분석하고 게임에 반영합니다.
*   **몰입형 3D 그래픽:** React Three Fiber(R3F)를 사용하여 웹상에서 가볍지만 화려한 3D 낚시 환경을 렌더링합니다.
*   **팀 배틀 시스템:** A팀 vs B팀 대항전 모드를 지원하며, Redis를 통해 실시간 스코어링 및 리더보드를 관리합니다.
*   **반응형 UX/UI:** 접속 기기에 따라 자동으로 최적화된 화면(PC는 3D 뷰, 모바일은 컨트롤러 UI)을 제공합니다.

---

## 🛠 기술 스택 (Tech Stack)

### Frontend (Monorepo)
*   **Web PC (`apps/web-pc`)**:
    *   **Core:** React, Vite
    *   **3D Engine:** React Three Fiber (Three.js), Drei
    *   **Styling:** TailwindCSS
    *   **State:** Zustand (클라이언트 상태), Socket.io Client (서버 통신)
*   **Web Mobile (`apps/web-mobile`)**:
    *   **Core:** React, Vite
    *   **Sensors:** DeviceMotion API (Accelerometer, Gyroscope), Vibration API
    *   **UI/UX:** Framer Motion (애니메이션), TailwindCSS

### Backend (`apps/server`)
*   **Framework:** NestJS (Node.js)
*   **Database:**
    *   **PostgreSQL:** 사용자 정보, 전적 등 영구 데이터 저장
    *   **Redis:** 실시간 게임 세션, 초고속 점수 집계, 룸 상태 관리
*   **Communication:** Socket.io Gateway (WebSocket), REST API
*   **ORM:** Prisma

### Infrastructure & DevOps
*   **Cloud:** Amazon AWS EC2
*   **Container:** Docker, Docker Compose
*   **Web Server:** Nginx (Reverse Proxy, SSL Termination)
*   **Security:** Let's Encrypt (Certbot) SSL 인증서 적용

---

## 🏗 시스템 아키텍처

```mermaid
graph TD
    UserPC[PC Host (Browser)] <-->|WebSocket / HTTP| Nginx
    UserMobile[Mobile Player (Browser)] <-->|WebSocket / HTTP| Nginx
    
    subgraph "AWS EC2 (Dockerized Environment)"
        Nginx[Nginx Proxy]
        
        subgraph "Backend"
            NestJS[NestJS API & Gateway]
            Redis[(Redis - Realtime State)]
            Postgres[(PostgreSQL - DB)]
        end
        
        subgraph "Frontend Serving"
            WebPC[Web PC Build Files]
            WebMobile[Web Mobile Build Files]
        end
        
        Nginx --> NestJS
        Nginx --> WebPC
        Nginx --> WebMobile
        
        NestJS <--> Redis
        NestJS <--> Postgres
    end
```

---

## 📂 프로젝트 구조

```bash
mad-together/
├── apps/
│   ├── server/           # NestJS 백엔드 서버
│   │   ├── src/games/    # 게임 로직 및 소켓 게이트웨이
│   │   ├── src/rooms/    # 방 생성 및 관리 API
│   │   └── prisma/       # DB 스키마 및 마이그레이션
│   ├── web-mobile/       # 모바일 컨트롤러 웹앱
│   │   ├── src/hooks/    # 센서 처리 훅 (useShake, useAccel)
│   │   └── src/views/    # 모바일 게임 뷰
│   └── web-pc/           # PC 호스트 디스플레이 웹앱
│       ├── src/components/# 3D 컴포넌트 (FishingRod3D 등)
│       └── src/views/    # PC 게임 뷰
├── infra/                # Nginx 설정 등 인프라 파일
├── docker-compose.yml    # 전체 서비스 오케스트레이션
└── docs/                 # 상세 문서 (API, DB, GameFlow)
```

---

## ⚡️ 설치 및 실행 방법

이 프로젝트는 Docker 환경에 최적화되어 있습니다.

### 사전 요구 사항
*   Docker & Docker Compose

### 실행 단계

1.  **레포지토리 클론:**
    ```bash
    git clone https://github.com/your-repo/mad-together.git
    cd mad-together
    ```

2.  **환경 변수 설정:**
    *   `apps/server/.env` (DB 접속 정보 등)
    *   `apps/web-mobile/.env` (API URL 등)
    *   `apps/web-pc/.env` (API URL 등)

3.  **서비스 실행:**
    ```bash
    docker-compose up --build -d
    ```

4.  **접속:**
    *   **PC 호스트:** `https://localhost` (또는 설정된 도메인)
    *   **모바일:** PC 화면에 표시된 QR 코드를 스캔

---

## 📜 라이선스 및 저작권 (Attribution)

이 프로젝트는 MIT 라이선스를 따릅니다. 단, 프로젝트에 포함된 일부 3D 자산은 별도의 라이선스를 따릅니다.

### 3D Assets Attribution
본 프로젝트에 사용된 낚시대 3D 모델(`.glb`)은 **Sketchfab**의 **Francesco Coldesina**님이 제작하였으며, **CC-BY 4.0** 라이선스 하에 사용되었습니다.

*   **Asset Name:** Fishing Rod
*   **Author:** Francesco Coldesina
*   **Source:** [Sketchfab Link](https://sketchfab.com/3d-models/canna-da-pesca-f8031fbbea9a4a9fbd3ab23ee6334c00)
*   **License:** CC-BY 4.0 (Creative Commons Attribution)

---

## 👥 만든 사람들

*   **안준영 (Junyeong Ahn)** - *Full Stack Developer*
