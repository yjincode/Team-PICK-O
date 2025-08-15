#!/bin/sh

# SSL 인증서 확인 및 nginx 설정 업데이트
if [ -f "/etc/letsencrypt/live/badaejangbu.store/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/badaejangbu.store/privkey.pem" ]; then
    echo "✅ SSL 인증서 발견! HTTPS 활성화"
    
    # SSL 설정을 nginx.conf에 추가
    sed -i '/server_name.*localhost;/a\
    # SSL 설정\
    ssl_certificate /etc/letsencrypt/live/badaejangbu.store/fullchain.pem;\
    ssl_certificate_key /etc/letsencrypt/live/badaejangbu.store/privkey.pem;\
    ssl_protocols TLSv1.2 TLSv1.3;\
    ssl_ciphers HIGH:!aNULL:!MD5;\
    \
    # HTTP to HTTPS redirect\
    if ($scheme != "https") {\
        return 301 https://$host$request_uri;\
    }' /etc/nginx/conf.d/default.conf
else
    echo "⚠️ SSL 인증서 없음 - HTTP만 사용"
fi

# nginx 시작
exec nginx -g "daemon off;"