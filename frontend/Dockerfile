# 경량화된 React frontend
FROM node:18-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사 (캐시 최적화)
COPY package*.json ./

# 빌드에 필요한 모든 의존성 설치 (빌드 단계에서는 devDependencies 필요)
RUN npm ci --silent --no-audit --no-fund

# 소스 코드 복사
COPY . .

# React 앱 빌드 (최적화)
ENV NODE_ENV=production
RUN npm run build

# 경량화된 nginx alpine
FROM nginx:1.25-alpine

# 최소한의 패키지만 설치
RUN apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

# nginx 설정 파일 복사
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf

# 빌드된 앱만 복사 (최소한의 파일)
COPY --from=builder /app/dist /usr/share/nginx/html

# 권한 최소화
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# 포트 설정
EXPOSE 3000

# 간단한 헬스체크
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=2 \
    CMD curl -f http://localhost:3000/health || exit 1

# nginx 사용자로 실행
USER nginx

# nginx 실행
CMD ["nginx", "-g", "daemon off;"]