"""
예측 API 테스트 스크립트
"""
import requests
import json
from datetime import datetime, timedelta

# API 기본 URL
BASE_URL = "http://localhost:8000/api/v1/prediction"

def test_health_check():
    """헬스 체크 테스트"""
    print("🔍 헬스 체크 테스트...")
    
    try:
        response = requests.get(f"{BASE_URL}/health/")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ 헬스 체크 실패: {e}")
        return False

def test_supported_species():
    """지원하는 어종 목록 테스트"""
    print("\n🐟 지원하는 어종 목록 테스트...")
    
    try:
        response = requests.get(f"{BASE_URL}/species/")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ 어종 목록 조회 실패: {e}")
        return False

def test_single_species_prediction():
    """단일 어종 예측 테스트"""
    print("\n🎯 단일 어종 예측 테스트...")
    
    # 테스트 데이터
    test_data = {
        "species": "(활)우럭",
        "target_date": "2024-12-01",
        "environmental_data": {
            "temperature": 15.5,
            "water_temperature": 12.3,
            "humidity": 65.0,
            "precipitation": 0.0,
            "wind_speed": 3.2,
            "pressure": 1013.2
        }
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/single/",
            json=test_data,
            headers={'Content-Type': 'application/json'}
        )
        print(f"Status Code: {response.status_code}")
        print(f"Request Data: {json.dumps(test_data, indent=2, ensure_ascii=False)}")
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ 단일 어종 예측 실패: {e}")
        return False

def test_all_species_prediction():
    """모든 어종 예측 테스트"""
    print("\n🎯 모든 어종 예측 테스트...")
    
    # 테스트 데이터
    test_data = {
        "target_date": "2024-12-01",
        "environmental_data": {
            "temperature": 15.5,
            "water_temperature": 12.3,
            "humidity": 65.0,
            "precipitation": 0.0,
            "wind_speed": 3.2,
            "pressure": 1013.2
        }
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/all/",
            json=test_data,
            headers={'Content-Type': 'application/json'}
        )
        print(f"Status Code: {response.status_code}")
        print(f"Request Data: {json.dumps(test_data, indent=2, ensure_ascii=False)}")
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ 모든 어종 예측 실패: {e}")
        return False

def test_error_handling():
    """에러 처리 테스트"""
    print("\n⚠️ 에러 처리 테스트...")
    
    # 잘못된 어종명으로 테스트
    test_data = {
        "species": "존재하지않는어종",
        "target_date": "2024-12-01",
        "environmental_data": {
            "temperature": 15.5,
            "water_temperature": 12.3
        }
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/single/",
            json=test_data,
            headers={'Content-Type': 'application/json'}
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        return response.status_code == 400  # 에러 응답이 정상
    except Exception as e:
        print(f"❌ 에러 처리 테스트 실패: {e}")
        return False

def main():
    """메인 테스트 함수"""
    print("🚀 예측 API 테스트 시작")
    print("=" * 50)
    
    tests = [
        ("헬스 체크", test_health_check),
        ("지원하는 어종 목록", test_supported_species),
        ("단일 어종 예측", test_single_species_prediction),
        ("모든 어종 예측", test_all_species_prediction),
        ("에러 처리", test_error_handling),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n📋 {test_name} 테스트 중...")
        result = test_func()
        results.append((test_name, result))
        print(f"{'✅ 성공' if result else '❌ 실패'}")
    
    # 결과 요약
    print("\n" + "=" * 50)
    print("📊 테스트 결과 요약")
    print("=" * 50)
    
    passed = 0
    for test_name, result in results:
        status = "✅ 성공" if result else "❌ 실패"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n총 {len(results)}개 테스트 중 {passed}개 성공")
    
    if passed == len(results):
        print("🎉 모든 테스트 통과!")
    else:
        print("⚠️ 일부 테스트 실패")

if __name__ == "__main__":
    main()
