#!/usr/bin/env python
"""
사용자 승인 관리 스크립트
Discord 알림을 받은 후 사용자를 수동으로 승인/거절하는 스크립트
"""

import os
import sys
import django
from django.utils import timezone

# Django 설정 초기화
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import User


def list_pending_users():
    """승인 대기 중인 사용자 목록 출력"""
    pending_users = User.objects.filter(status='pending').order_by('-created_at')
    
    if not pending_users.exists():
        print("✅ 승인 대기 중인 사용자가 없습니다.")
        return
    
    print(f"\n📋 승인 대기 중인 사용자 ({pending_users.count()}명)")
    print("=" * 80)
    
    for i, user in enumerate(pending_users, 1):
        print(f"""
{i}. ID: {user.id}
   사업장명: {user.business_name}
   대표자명: {user.owner_name}
   전화번호: {user.phone_number}
   주소: {user.address}
   사업자등록번호: {user.business_registration_number}
   구독플랜: {user.subscription_plan}
   가입일: {user.created_at.strftime('%Y-%m-%d %H:%M:%S')}
   Firebase UID: {user.firebase_uid}
""")
    print("=" * 80)


def approve_user(user_id):
    """사용자 승인"""
    try:
        user = User.objects.get(id=user_id, status='pending')
        user.status = 'approved'
        user.approved_at = timezone.now()
        user.save()
        
        print(f"✅ 사용자 '{user.business_name}({user.owner_name})'이 승인되었습니다.")
        return True
    except User.DoesNotExist:
        print(f"❌ ID {user_id}의 승인 대기 사용자를 찾을 수 없습니다.")
        return False


def reject_user(user_id):
    """사용자 거절"""
    try:
        user = User.objects.get(id=user_id, status='pending')
        user.status = 'rejected'
        user.save()
        
        print(f"❌ 사용자 '{user.business_name}({user.owner_name})'이 거절되었습니다.")
        return True
    except User.DoesNotExist:
        print(f"❌ ID {user_id}의 승인 대기 사용자를 찾을 수 없습니다.")
        return False


def suspend_user(user_id):
    """사용자 일시정지"""
    try:
        user = User.objects.get(id=user_id)
        user.status = 'suspended'
        user.save()
        
        print(f"⏸️ 사용자 '{user.business_name}({user.owner_name})'이 일시정지되었습니다.")
        return True
    except User.DoesNotExist:
        print(f"❌ ID {user_id}의 사용자를 찾을 수 없습니다.")
        return False


def main():
    """메인 함수"""
    print("🐟 Team-PICK-O 사용자 승인 관리 도구")
    
    while True:
        print("\n📋 메뉴:")
        print("1. 승인 대기 사용자 목록 보기")
        print("2. 사용자 승인")
        print("3. 사용자 거절")
        print("4. 사용자 일시정지")
        print("5. 종료")
        
        choice = input("\n선택하세요 (1-5): ").strip()
        
        if choice == '1':
            list_pending_users()
            
        elif choice == '2':
            list_pending_users()
            if User.objects.filter(status='pending').exists():
                try:
                    user_id = int(input("\n승인할 사용자 ID를 입력하세요: "))
                    approve_user(user_id)
                except ValueError:
                    print("❌ 올바른 숫자를 입력해주세요.")
                    
        elif choice == '3':
            list_pending_users()
            if User.objects.filter(status='pending').exists():
                try:
                    user_id = int(input("\n거절할 사용자 ID를 입력하세요: "))
                    reject_user(user_id)
                except ValueError:
                    print("❌ 올바른 숫자를 입력해주세요.")
                    
        elif choice == '4':
            try:
                user_id = int(input("\n일시정지할 사용자 ID를 입력하세요: "))
                suspend_user(user_id)
            except ValueError:
                print("❌ 올바른 숫자를 입력해주세요.")
                
        elif choice == '5':
            print("👋 프로그램을 종료합니다.")
            break
            
        else:
            print("❌ 1-5 사이의 숫자를 입력해주세요.")


if __name__ == '__main__':
    main()