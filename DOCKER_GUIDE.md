# Docker 운영 가이드

이 문서는 이 프로젝트의 Dockerized 서비스를 관리하기 위한 필수 명령어를 제공합니다.

## 서비스 빌드 및 시작

이미지를 빌드하고 모든 서비스를 백그라운드(detached mode)에서 시작하려면:

```bash
docker-compose up --build -d
```

- `--build`: `backend` 서비스와 같이 `build` 컨텍스트가 있는 서비스의 이미지를 강제로 다시 빌드합니다.
- `-d`: 컨테이너를 백그라운드에서 실행합니다.

## 서비스 중지

실행 중인 모든 서비스를 중지하려면:

```bash
docker-compose down
```

## 서비스 재시작

모든 서비스를 재시작하려면:

```bash
docker-compose restart
```

특정 서비스(예: backend)를 재시작하려면:

```bash
docker-compose restart backend
```

## 로그 보기

모든 서비스의 로그를 실시간으로 보려면:

```bash
docker-compose logs -f
```

특정 서비스(예: backend)의 로그를 보려면:

```bash
docker-compose logs -f backend
```

이 명령어는 502 Bad Gateway 오류와 같은 문제를 디버깅하는 데 특히 유용합니다.
