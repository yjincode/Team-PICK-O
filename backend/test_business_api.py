#!/usr/bin/env python3
"""
거래처 API 테스트 스크립트
서버를 실행하지 않고도 데이터베이스에 직접 접근하여 테스트
"""

import sys
import os
from decimal import Decimal
from datetime import datetime

# 현재 디렉토리를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import Business
from schemas import BusinessCreate, BusinessResponse

def test_create_business():
    """거래처 생성 테스트"""
    print("=== 거래처 생성 테스트 ===")
    
    # 테스트 데이터
    business_data = BusinessCreate(
        business_name="부산수산물상회",
        phone_number="051-123-4567",
        address="부산시 해운대구 해운대로 123"
    )
    
    db = SessionLocal()
    try:
        # 거래처 생성
        db_business = Business(**business_data.dict())
        db.add(db_business)
        db.commit()
        db.refresh(db_business)
        
        print(f"✅ 거래처 생성 성공!")
        print(f"ID: {db_business.id}")
        print(f"이름: {db_business.business_name}")
        print(f"전화번호: {db_business.phone_number}")
        print(f"주소: {db_business.address}")
        print(f"생성일: {db_business.created_at}")
        
        return db_business.id
        
    except Exception as e:
        print(f"❌ 거래처 생성 실패: {e}")
        db.rollback()
        return None
    finally:
        db.close()

def test_get_businesses():
    """거래처 목록 조회 테스트"""
    print("\n=== 거래처 목록 조회 테스트 ===")
    
    db = SessionLocal()
    try:
        businesses = db.query(Business).all()
        
        print(f"✅ 총 {len(businesses)}개의 거래처를 찾았습니다!")
        
        for business in businesses:
            print(f"\n--- 거래처 정보 ---")
            print(f"ID: {business.id}")
            print(f"이름: {business.business_name}")
            print(f"전화번호: {business.phone_number}")
            print(f"주소: {business.address}")
            print(f"생성일: {business.created_at}")
            
    except Exception as e:
        print(f"❌ 거래처 목록 조회 실패: {e}")
    finally:
        db.close()

def test_get_business(business_id: int):
    """특정 거래처 조회 테스트"""
    print(f"\n=== 거래처 ID {business_id} 조회 테스트 ===")
    
    db = SessionLocal()
    try:
        business = db.query(Business).filter(Business.id == business_id).first()
        
        if business:
            print(f"✅ 거래처를 찾았습니다!")
            print(f"ID: {business.id}")
            print(f"이름: {business.business_name}")
            print(f"전화번호: {business.phone_number}")
            print(f"주소: {business.address}")
            print(f"생성일: {business.created_at}")
        else:
            print(f"❌ ID {business_id}인 거래처를 찾을 수 없습니다.")
            
    except Exception as e:
        print(f"❌ 거래처 조회 실패: {e}")
    finally:
        db.close()

def test_update_business(business_id: int):
    """거래처 정보 수정 테스트"""
    print(f"\n=== 거래처 ID {business_id} 수정 테스트 ===")
    
    db = SessionLocal()
    try:
        business = db.query(Business).filter(Business.id == business_id).first()
        
        if business:
            # 정보 수정
            business.phone_number = "051-987-6543"
            business.address = "부산시 해운대구 해운대로 456"
            db.commit()
            
            print(f"✅ 거래처 정보가 수정되었습니다!")
            print(f"ID: {business.id}")
            print(f"이름: {business.business_name}")
            print(f"전화번호: {business.phone_number}")
            print(f"주소: {business.address}")
            print(f"수정일: {business.updated_at}")
        else:
            print(f"❌ ID {business_id}인 거래처를 찾을 수 없습니다.")
            
    except Exception as e:
        print(f"❌ 거래처 수정 실패: {e}")
        db.rollback()
    finally:
        db.close()

def test_delete_business(business_id: int):
    """거래처 삭제 테스트"""
    print(f"\n=== 거래처 ID {business_id} 삭제 테스트 ===")
    
    db = SessionLocal()
    try:
        business = db.query(Business).filter(Business.id == business_id).first()
        
        if business:
            db.delete(business)
            db.commit()
            print(f"✅ 거래처가 삭제되었습니다!")
        else:
            print(f"❌ ID {business_id}인 거래처를 찾을 수 없습니다.")
            
    except Exception as e:
        print(f"❌ 거래처 삭제 실패: {e}")
        db.rollback()
    finally:
        db.close()

def main():
    """메인 테스트 함수"""
    print("🐟 수산물 거래 관리 시스템 - 거래처 API 테스트")
    print("=" * 50)
    
    # 1. 거래처 생성 테스트
    business_id = test_create_business()
    
    if business_id:
        # 2. 거래처 목록 조회 테스트
        test_get_businesses()
        
        # 3. 특정 거래처 조회 테스트
        test_get_business(business_id)
        
        # 4. 거래처 정보 수정 테스트
        test_update_business(business_id)
        
        # 5. 수정된 정보 확인
        test_get_business(business_id)
        
        # 6. 거래처 삭제 테스트 (선택사항)
        # test_delete_business(business_id)
        
        print("\n" + "=" * 50)
        print("🎉 모든 테스트가 완료되었습니다!")
    else:
        print("\n❌ 거래처 생성에 실패하여 다른 테스트를 건너뜁니다.")

if __name__ == "__main__":
    main() 