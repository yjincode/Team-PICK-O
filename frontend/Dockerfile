# Multi-stage build for React frontend
FROM node:18-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사 (캐시 최적화)
COPY package*.json ./

# Node.js 의존성 설치 (모든 의존성 포함 - 빌드용)
RUN npm ci --silent

# 소스 코드 복사
COPY . .

# React 앱 빌드
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# curl 설치 (헬스체크용)
RUN apk add --no-cache curl

# non-root 사용자는 생성하지만 nginx 사용자 사용

# nginx 설정 파일 복사
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf

# 빌드된 React 앱을 nginx 웹 루트로 복사 (Vite 기본값: dist)
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx 사용자 권한 설정
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# 포트 설정
EXPOSE 3000

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# nginx 사용자로 실행
USER nginx

# nginx 실행
CMD ["nginx", "-g", "daemon off;"]