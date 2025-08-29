#!/usr/bin/env python3
"""
VGG16 모델의 정규화 방식 테스트 스크립트
다양한 정규화 방식으로 동일한 이미지를 테스트하여 어떤 방식이 올바른지 확인
"""

import os
import sys
import numpy as np
from PIL import Image
import json

# 현재 디렉토리를 Python path에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def create_test_image():
    """테스트용 이미지 생성"""
    # 112x112 RGB 이미지 생성
    test_image = Image.fromarray(
        np.random.randint(50, 200, (112, 112, 3), dtype=np.uint8)
    )
    return test_image

def test_simple_normalization(image):
    """단순 0-1 정규화 테스트"""
    print("🔍 단순 0-1 정규화 테스트")
    
    # RGB 변환
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # numpy 배열로 변환
    img_array = np.array(image)
    
    # 배치 차원 추가
    img_array = np.expand_dims(img_array, axis=0)
    
    # 0-1 정규화
    processed = img_array.astype(np.float32) / 255.0
    
    print(f"  - 입력 형태: {processed.shape}")
    print(f"  - 값 범위: [{processed.min():.3f}, {processed.max():.3f}]")
    print(f"  - 평균: {processed.mean():.3f}")
    print(f"  - 표준편차: {processed.std():.3f}")
    
    return processed

def test_imagenet_normalization(image):
    """ImageNet 표준 정규화 테스트"""
    print("🔍 ImageNet 표준 정규화 테스트")
    
    # RGB 변환
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # numpy 배열로 변환 후 0-1 정규화
    img_array = np.array(image).astype(np.float32) / 255.0
    
    # ImageNet 정규화
    mean = np.array([0.485, 0.456, 0.406])
    std = np.array([0.229, 0.224, 0.225])
    processed = (img_array - mean) / std
    
    # 배치 차원 추가
    processed = np.expand_dims(processed, axis=0)
    
    print(f"  - 입력 형태: {processed.shape}")
    print(f"  - 값 범위: [{processed.min():.3f}, {processed.max():.3f}]")
    print(f"  - 평균: {processed.mean():.3f}")
    print(f"  - 표준편차: {processed.std():.3f}")
    
    return processed

def test_vgg16_preprocess_input(image):
    """VGG16 preprocess_input 테스트"""
    print("🔍 VGG16 preprocess_input 테스트")
    
    try:
        import tensorflow as tf
        from tensorflow.keras.applications.vgg16 import preprocess_input
        
        # RGB 변환
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # numpy 배열로 변환
        img_array = np.array(image)
        
        # 배치 차원 추가
        img_array = np.expand_dims(img_array, axis=0)
        
        # VGG16 전처리 적용
        processed = preprocess_input(img_array.copy())
        
        print(f"  - 입력 형태: {processed.shape}")
        print(f"  - 값 범위: [{processed.min():.3f}, {processed.max():.3f}]")
        print(f"  - 평균: {processed.mean():.3f}")
        print(f"  - 표준편차: {processed.std():.3f}")
        
        return processed
        
    except ImportError:
        print("  - TensorFlow가 설치되지 않았습니다.")
        return None

def test_with_model_prediction(image, model_path="./app/models/vgg16/best_model.h5"):
    """실제 모델로 예측하여 정규화 방식 확인"""
    print("🔍 실제 모델 예측 테스트")
    
    if not os.path.exists(model_path):
        print(f"  - 모델 파일이 없습니다: {model_path}")
        return
    
    try:
        import tensorflow as tf
        from tensorflow.keras.models import load_model
        
        # 모델 로드
        model = load_model(model_path, compile=False)
        print(f"  - 모델 로드 성공: {model.input_shape}")
        
        # 각 정규화 방식으로 예측
        normalizations = {
            "단순 0-1": test_simple_normalization(image),
            "ImageNet": test_imagenet_normalization(image),
            "VGG16 preprocess": test_vgg16_preprocess_input(image)
        }
        
        for name, processed in normalizations.items():
            if processed is not None:
                try:
                    pred = model.predict(processed, verbose=0)
                    confidence = float(np.max(pred))
                    predicted_class = int(np.argmax(pred))
                    
                    print(f"  - {name:15}: 클래스={predicted_class}, 신뢰도={confidence:.4f}")
                    
                    # 예측 분포 확인 (상위 3개)
                    top_3_idx = np.argsort(pred[0])[-3:][::-1]
                    print(f"    상위 3개: {[(int(idx), float(pred[0][idx])) for idx in top_3_idx]}")
                    
                except Exception as e:
                    print(f"  - {name:15}: 예측 실패 - {e}")
        
    except ImportError:
        print("  - TensorFlow가 설치되지 않았습니다.")
    except Exception as e:
        print(f"  - 모델 로드 실패: {e}")

def main():
    print("=" * 60)
    print("🧪 VGG16 모델 정규화 방식 테스트")
    print("=" * 60)
    
    # 테스트 이미지 생성
    test_image = create_test_image()
    print(f"📸 테스트 이미지 생성: {test_image.size}, {test_image.mode}")
    
    # 각 정규화 방식 테스트
    print("\n" + "─" * 40)
    test_simple_normalization(test_image)
    
    print("\n" + "─" * 40)
    test_imagenet_normalization(test_image)
    
    print("\n" + "─" * 40)
    test_vgg16_preprocess_input(test_image)
    
    print("\n" + "─" * 40)
    test_with_model_prediction(test_image)
    
    print("\n" + "=" * 60)
    print("💡 결론:")
    print("   - 가장 높은 신뢰도를 보이는 정규화 방식이 올바른 방식입니다")
    print("   - 신뢰도가 0에 가깝거나 무작위라면 잘못된 정규화입니다")
    print("=" * 60)

if __name__ == "__main__":
    main()
