#!/bin/bash

echo "🔍 AI 모델 다운로드 시작..."

# 모델 디렉토리 생성
mkdir -p /app/models/yolo
mkdir -p /app/models/vgg16

# YOLO 모델 S3에서 다운로드. 모델 파일이 없으면 공식 YOLO11 모델로 대체.
echo "📥 YOLO 모델 다운로드 중..."
if [ ! -f "/app/models/yolo/best.pt" ]; then
    if [ ! -z "$AWS_S3_BUCKET_NAME" ] && [ ! -z "$AWS_ACCESS_KEY_ID" ]; then
        echo "🔍 S3에서 YOLO 모델 다운로드 시도..."
        aws s3 cp s3://${AWS_S3_BUCKET_NAME}/models/yolo/best.pt /app/models/yolo/best.pt
        if [ $? -eq 0 ]; then
            echo "✅ YOLO 모델 S3 다운로드 완료"
        else
            echo "⚠️ S3에서 YOLO 모델 다운로드 실패"
            # 공식 YOLO11 모델로 대체
            wget -O /app/models/yolo/best.pt https://github.com/ultralytics/assets/releases/download/v0.0.0/yolo11n.pt
        fi
    else
        echo "⚠️ AWS 설정 없음, 공식 YOLO11 모델 다운로드..."
        wget -O /app/models/yolo/best.pt https://github.com/ultralytics/assets/releases/download/v0.0.0/yolo11n.pt
    fi
else
    echo "✅ YOLO 모델이 이미 존재합니다"
fi

# VGG16 모델 다운로드
echo "📥 VGG16 모델 다운로드 중..."
if [ ! -f "/app/models/vgg16/best_model.h5" ]; then
    # 방법 1: S3에서 다운로드 (권장)
    if [ ! -z "$AWS_S3_BUCKET_NAME" ] && [ ! -z "$AWS_ACCESS_KEY_ID" ]; then
        echo "🔍 S3에서 VGG16 모델 다운로드 시도..."
        aws s3 cp s3://${AWS_S3_BUCKET_NAME}/models/vgg16/best_model.h5 /app/models/vgg16/best_model.h5
        if [ $? -eq 0 ]; then
            echo "✅ VGG16 모델 S3 다운로드 완료"
        else
            echo "⚠️ S3에서 VGG16 모델 다운로드 실패"
        fi
    fi
    
    # 방법 2: GitHub Release에서 다운로드 (대안)
    if [ ! -f "/app/models/vgg16/best_model.h5" ] && [ ! -z "$VGG_MODEL_DOWNLOAD_URL" ]; then
        echo "🔍 GitHub Release에서 VGG16 모델 다운로드 시도..."
        wget -O /app/models/vgg16/best_model.h5 "$VGG_MODEL_DOWNLOAD_URL"
        if [ $? -eq 0 ]; then
            echo "✅ VGG16 모델 다운로드 완료"
        else
            echo "⚠️ VGG16 모델 다운로드 실패"
        fi
    fi
    
    # 최종적으로 모델이 없으면 플레이스홀더 생성
    if [ ! -f "/app/models/vgg16/best_model.h5" ]; then
        echo "⚠️ VGG16 모델을 다운로드할 수 없습니다. 플레이스홀더 생성 중..."
        touch /app/models/vgg16/best_model.h5
    fi
else
    echo "✅ VGG16 모델이 이미 존재합니다"
fi

# 모델 파일 권한 설정
chmod -R 755 /app/models/

echo "✅ 모델 다운로드/설정 완료"
ls -la /app/models/yolo/
ls -la /app/models/vgg16/