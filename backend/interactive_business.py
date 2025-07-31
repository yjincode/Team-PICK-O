#!/usr/bin/env python3
"""
인터랙티브 거래처 테스트 스크립트
사용자가 직접 거래처 정보를 입력하고 관리할 수 있습니다.
"""

import sys
import os
from decimal import Decimal
from datetime import datetime

# 현재 디렉토리를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import Business
from schemas import BusinessCreate

def input_business_info():
    """사용자로부터 거래처 정보 입력받기"""
    print("\n=== 거래처 정보 입력 ===")
    
    business_name = input("거래처 이름을 입력하세요: ").strip()
    while not business_name:
        print("❌ 거래처 이름은 필수입니다!")
        business_name = input("거래처 이름을 입력하세요: ").strip()
    
    phone_number = input("전화번호를 입력하세요: ").strip()
    while not phone_number:
        print("❌ 전화번호는 필수입니다!")
        phone_number = input("전화번호를 입력하세요: ").strip()
    
    address = input("주소를 입력하세요 (선택사항): ").strip()
    if not address:
        address = None
    
    return {
        "business_name": business_name,
        "phone_number": phone_number,
        "address": address
    }

def create_business_interactive():
    """인터랙티브 거래처 생성"""
    print("🐟 거래처 생성")
    
    # 사용자 입력 받기
    business_data = input_business_info()
    
    db = SessionLocal()
    try:
        # 거래처 생성
        business_create = BusinessCreate(**business_data)
        db_business = Business(**business_create.dict())
        db.add(db_business)
        db.commit()
        db.refresh(db_business)
        
        print(f"\n✅ 거래처가 성공적으로 생성되었습니다!")
        print(f"ID: {db_business.id}")
        print(f"이름: {db_business.business_name}")
        print(f"전화번호: {db_business.phone_number}")
        if db_business.address:
            print(f"주소: {db_business.address}")
        print(f"생성일: {db_business.created_at}")
        
        return db_business.id
        
    except Exception as e:
        print(f"❌ 거래처 생성 실패: {e}")
        db.rollback()
        return None
    finally:
        db.close()

def show_all_businesses():
    """모든 거래처 조회"""
    print("\n=== 모든 거래처 목록 ===")
    
    db = SessionLocal()
    try:
        businesses = db.query(Business).all()
        
        if not businesses:
            print("📋 등록된 거래처가 없습니다.")
            return
        
        print(f"📋 총 {len(businesses)}개의 거래처:")
        print("-" * 60)
        
        for business in businesses:
            print(f"ID: {business.id}")
            print(f"이름: {business.business_name}")
            print(f"전화번호: {business.phone_number}")
            if business.address:
                print(f"주소: {business.address}")
            print(f"생성일: {business.created_at}")
            print("-" * 60)
            
    except Exception as e:
        print(f"❌ 거래처 조회 실패: {e}")
    finally:
        db.close()

def find_business_by_id():
    """ID로 거래처 찾기"""
    print("\n=== ID로 거래처 찾기 ===")
    
    try:
        business_id = int(input("찾을 거래처 ID를 입력하세요: "))
    except ValueError:
        print("❌ 올바른 숫자를 입력해주세요!")
        return
    
    db = SessionLocal()
    try:
        business = db.query(Business).filter(Business.id == business_id).first()
        
        if business:
            print(f"\n✅ 거래처를 찾았습니다!")
            print(f"ID: {business.id}")
            print(f"이름: {business.business_name}")
            print(f"전화번호: {business.phone_number}")
            if business.address:
                print(f"주소: {business.address}")
            print(f"생성일: {business.created_at}")
        else:
            print(f"❌ ID {business_id}인 거래처를 찾을 수 없습니다.")
            
    except Exception as e:
        print(f"❌ 거래처 조회 실패: {e}")
    finally:
        db.close()

def update_business_interactive():
    """인터랙티브 거래처 수정"""
    print("\n=== 거래처 정보 수정 ===")
    
    try:
        business_id = int(input("수정할 거래처 ID를 입력하세요: "))
    except ValueError:
        print("❌ 올바른 숫자를 입력해주세요!")
        return
    
    db = SessionLocal()
    try:
        business = db.query(Business).filter(Business.id == business_id).first()
        
        if not business:
            print(f"❌ ID {business_id}인 거래처를 찾을 수 없습니다.")
            return
        
        print(f"\n현재 거래처 정보:")
        print(f"이름: {business.business_name}")
        print(f"전화번호: {business.phone_number}")
        if business.address:
            print(f"주소: {business.address}")
        
        print(f"\n새로운 정보를 입력하세요 (변경하지 않으려면 엔터):")
        
        new_name = input(f"새 이름 ({business.business_name}): ").strip()
        if new_name:
            business.business_name = new_name
        
        new_phone = input(f"새 전화번호 ({business.phone_number}): ").strip()
        if new_phone:
            business.phone_number = new_phone
        
        new_address = input(f"새 주소 ({business.address or '없음'}): ").strip()
        if new_address:
            business.address = new_address
        
        db.commit()
        
        print(f"\n✅ 거래처 정보가 수정되었습니다!")
        print(f"ID: {business.id}")
        print(f"이름: {business.business_name}")
        print(f"전화번호: {business.phone_number}")
        if business.address:
            print(f"주소: {business.address}")
        print(f"수정일: {business.updated_at}")
        
    except Exception as e:
        print(f"❌ 거래처 수정 실패: {e}")
        db.rollback()
    finally:
        db.close()

def delete_business_interactive():
    """인터랙티브 거래처 삭제"""
    print("\n=== 거래처 삭제 ===")
    
    try:
        business_id = int(input("삭제할 거래처 ID를 입력하세요: "))
    except ValueError:
        print("❌ 올바른 숫자를 입력해주세요!")
        return
    
    db = SessionLocal()
    try:
        business = db.query(Business).filter(Business.id == business_id).first()
        
        if not business:
            print(f"❌ ID {business_id}인 거래처를 찾을 수 없습니다.")
            return
        
        print(f"\n삭제할 거래처 정보:")
        print(f"ID: {business.id}")
        print(f"이름: {business.business_name}")
        print(f"전화번호: {business.phone_number}")
        if business.address:
            print(f"주소: {business.address}")
        
        confirm = input(f"\n정말로 이 거래처를 삭제하시겠습니까? (y/N): ").strip().lower()
        
        if confirm == 'y':
            db.delete(business)
            db.commit()
            print(f"✅ 거래처가 삭제되었습니다!")
        else:
            print("❌ 삭제가 취소되었습니다.")
        
    except Exception as e:
        print(f"❌ 거래처 삭제 실패: {e}")
        db.rollback()
    finally:
        db.close()

def show_menu():
    """메뉴 표시"""
    print("\n" + "=" * 50)
    print("🐟 수산물 거래 관리 시스템")
    print("=" * 50)
    print("1. 거래처 등록")
    print("2. 모든 거래처 조회")
    print("3. ID로 거래처 찾기")
    print("4. 거래처 정보 수정")
    print("5. 거래처 삭제")
    print("0. 종료")
    print("=" * 50)

def main():
    """메인 함수"""
    print("🐟 수산물 거래 관리 시스템 - 인터랙티브 테스트")
    print("서버를 실행하지 않고도 거래처 정보를 관리할 수 있습니다!")
    
    while True:
        show_menu()
        
        try:
            choice = input("원하는 작업을 선택하세요 (0-5): ").strip()
            
            if choice == '0':
                print("\n👋 프로그램을 종료합니다. 감사합니다!")
                break
            elif choice == '1':
                create_business_interactive()
            elif choice == '2':
                show_all_businesses()
            elif choice == '3':
                find_business_by_id()
            elif choice == '4':
                update_business_interactive()
            elif choice == '5':
                delete_business_interactive()
            else:
                print("❌ 올바른 선택지를 입력해주세요!")
                
        except KeyboardInterrupt:
            print("\n\n👋 프로그램을 종료합니다. 감사합니다!")
            break
        except Exception as e:
            print(f"❌ 오류가 발생했습니다: {e}")

if __name__ == "__main__":
    main() 