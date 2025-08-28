#!/usr/bin/env python3
"""
VGG 모델 로드 간단 테스트
"""
import os
import sys
from pathlib import Path

# AI 서버 경로를 sys.path에 추가
current_dir = Path(__file__).parent
app_dir = current_dir / "app"
sys.path.insert(0, str(current_dir))
sys.path.insert(0, str(app_dir))

print("=== VGG 서비스 간단 테스트 ===")

try:
    from app.services.vgg_service import VGG16Service
    
    print("VGG16Service 임포트 성공")
    
    vgg = VGG16Service()
    print(f"인스턴스 생성 성공")
    print(f"모델 경로: {vgg.model_path}")
    print(f"클래스 경로: {vgg.classes_path}")
    
    # 모델 상태 확인
    print("\n모델 상태 확인:")
    status = vgg.check_model_status()
    for key, value in status.items():
        print(f"  {key}: {value}")
    
    # 모델 로드 시도
    print("\n모델 로드 시도:")
    result = vgg.load_model()
    print(f"로드 결과: {result}")
    
    if result:
        print("✓ VGG 모델 로드 성공!")
        print(f"모델 객체: {type(vgg.model)}")
        print(f"클래스 수: {len(vgg.disease_classes)}")
        
        # 간단한 테스트 예측
        print("\n테스트 예측 시도:")
        import numpy as np
        from PIL import Image
        
        # 더미 이미지 생성 (224x224x3)
        dummy_image = Image.fromarray(np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8))
        
        # 전처리
        processed = vgg._preprocess_image(dummy_image)
        print(f"전처리된 이미지 shape: {processed.shape}")
        
        # 예측
        predictions = vgg.model.predict(processed, verbose=0)
        predicted_class = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_class])
        
        print(f"예측 클래스: {predicted_class}")
        print(f"신뢰도: {confidence:.4f}")
        print(f"질병명: {vgg.disease_classes.get(str(predicted_class), {}).get('disease_name_ko', 'Unknown')}")
        
    else:
        print("✗ VGG 모델 로드 실패")

except Exception as e:
    print(f"✗ 오류 발생: {e}")
    import traceback
    traceback.print_exc()

print("\n=== 테스트 완료 ===")