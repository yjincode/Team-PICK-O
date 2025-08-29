#!/usr/bin/env python3
"""
백엔드와 AI 서버의 VGG16 전처리 일관성 테스트
"""

import sys
import os
import numpy as np
from PIL import Image

def test_aiserver_preprocessing():
    """AI 서버의 전처리 방식 테스트"""
    print("🔍 AI 서버 전처리 방식 테스트")
    
    # AI 서버 경로 추가
    sys.path.append('/Users/jeong-yeongjin/Desktop/exProject/Team-PICK-O/aiserver')
    
    try:
        from app.services.vgg_service import VGG16Service
        
        vgg_service = VGG16Service()
        
        # 테스트 이미지 생성
        test_image = Image.fromarray(
            np.random.randint(50, 200, (112, 112, 3), dtype=np.uint8)
        )
        
        # 전처리 실행
        processed = vgg_service._preprocess_image(test_image)
        
        print(f"  - 입력 크기: {vgg_service.input_size}")
        print(f"  - 출력 형태: {processed.shape}")
        print(f"  - 값 범위: [{processed.min():.3f}, {processed.max():.3f}]")
        print(f"  - 평균: {processed.mean():.3f}")
        print(f"  - 표준편차: {processed.std():.3f}")
        
        return processed, test_image
        
    except Exception as e:
        print(f"  - 실패: {e}")
        return None, None

def test_backend_preprocessing():
    """백엔드의 전처리 방식 테스트"""
    print("🔍 백엔드 전처리 방식 테스트")
    
    # 백엔드 경로 추가 및 Django 설정
    sys.path.append('/Users/jeong-yeongjin/Desktop/exProject/Team-PICK-O/backend')
    
    try:
        # Django 설정
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
        
        import django
        django.setup()
        
        from fish_analysis.services.vgg_service import VGG16Service
        
        vgg_service = VGG16Service()
        
        # 테스트 이미지 생성 (동일한 시드 사용)
        np.random.seed(42)
        test_image = Image.fromarray(
            np.random.randint(50, 200, (112, 112, 3), dtype=np.uint8)
        )
        
        # 전처리 실행
        processed = vgg_service._preprocess_image(test_image)
        
        print(f"  - 입력 크기: {vgg_service.input_size}")
        print(f"  - 출력 형태: {processed.shape}")
        print(f"  - 값 범위: [{processed.min():.3f}, {processed.max():.3f}]")
        print(f"  - 평균: {processed.mean():.3f}")
        print(f"  - 표준편차: {processed.std():.3f}")
        
        return processed, test_image
        
    except Exception as e:
        print(f"  - 실패: {e}")
        return None, None

def compare_preprocessing():
    """전처리 결과 비교"""
    print("=" * 60)
    print("🧪 백엔드 vs AI 서버 VGG16 전처리 일관성 테스트")
    print("=" * 60)
    
    # 동일한 시드로 일관된 테스트
    np.random.seed(42)
    
    # AI 서버 테스트
    ai_result, ai_image = test_aiserver_preprocessing()
    
    print("\n" + "─" * 40)
    
    # 백엔드 테스트  
    backend_result, backend_image = test_backend_preprocessing()
    
    print("\n" + "─" * 40)
    print("📊 비교 결과:")
    
    if ai_result is not None and backend_result is not None:
        # 동일한 이미지로 다시 테스트 (시드 고정)
        np.random.seed(42)
        test_image = Image.fromarray(
            np.random.randint(50, 200, (112, 112, 3), dtype=np.uint8)
        )
        
        # 각각 다시 전처리
        sys.path.append('/Users/jeong-yeongjin/Desktop/exProject/Team-PICK-O/aiserver')
        from app.services.vgg_service import VGG16Service as AIVGGService
        ai_vgg = AIVGGService()
        ai_processed = ai_vgg._preprocess_image(test_image)
        
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
        import django
        django.setup()
        from fish_analysis.services.vgg_service import VGG16Service as BackendVGGService
        backend_vgg = BackendVGGService()
        backend_processed = backend_vgg._preprocess_image(test_image)
        
        # 차이 계산
        if ai_processed.shape == backend_processed.shape:
            diff = np.abs(ai_processed - backend_processed)
            max_diff = np.max(diff)
            mean_diff = np.mean(diff)
            
            print(f"  ✅ 형태 일치: {ai_processed.shape}")
            print(f"  📏 최대 차이: {max_diff:.6f}")
            print(f"  📊 평균 차이: {mean_diff:.6f}")
            
            if max_diff < 1e-6:
                print("  🎉 완벽히 일치합니다!")
            elif max_diff < 1e-3:
                print("  ✅ 거의 일치합니다 (허용 오차 내)")
            else:
                print("  ⚠️  차이가 있습니다. 확인 필요")
        else:
            print(f"  ❌ 형태 불일치: AI({ai_processed.shape}) vs Backend({backend_processed.shape})")
    else:
        print("  ❌ 테스트 실패")
    
    print("=" * 60)

if __name__ == "__main__":
    compare_preprocessing()
