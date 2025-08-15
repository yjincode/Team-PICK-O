# 경량화된 React frontend
FROM node:18-alpine AS builder

# 빌드 인수 받기
ARG REACT_APP_API_URL=https://badaejangbu.store/api
ARG VITE_API_URL=https://badaejangbu.store/api
ARG NODE_ENV=production

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사 (캐시 최적화)
COPY package*.json ./

# 빌드에 필요한 모든 의존성 설치 (빌드 단계에서는 devDependencies 필요)
RUN NODE_ENV=development npm ci --silent --no-audit --no-fund

# 소스 코드 복사
COPY . .

# 환경변수 설정
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV VITE_API_URL=$VITE_API_URL
ENV NODE_ENV=$NODE_ENV

# React 앱 빌드 (최적화)
RUN npm run build

# 경량화된 nginx alpine
FROM nginx:1.25-alpine

# 최소한의 패키지만 설치
RUN apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

# nginx 설정 파일 및 entrypoint 복사
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/entrypoint.sh /entrypoint.sh

# 빌드된 앱만 복사 (최소한의 파일)
COPY --from=builder /app/dist /usr/share/nginx/html

# 권한 설정
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chmod +x /entrypoint.sh

# 포트 설정
EXPOSE 80 443

# 간단한 헬스체크
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=2 \
    CMD curl -f http://localhost/health || exit 1

# root로 실행 (권한 문제 해결)
# USER nginx

# entrypoint 스크립트 실행
CMD ["/entrypoint.sh"]