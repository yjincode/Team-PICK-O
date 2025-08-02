from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import requests
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# Pydantic 모델 정의
class UserRegistrationData(BaseModel):
    firebase_uid: str
    business_name: str
    owner_name: str
    phone_number: str
    address: str
    business_registration_number: str
    subscription_plan: str = "basic"

class UserStatusResponse(BaseModel):
    exists: bool
    user: Optional[dict] = None

# Discord 웹훅 전송 함수
async def send_discord_notification(user_data: UserRegistrationData):
    webhook_url = os.getenv("DISCORD_WEBHOOK_URL")
    
    if not webhook_url or webhook_url == "https://discordapp.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN":
        print("⚠️ Discord 웹훅 URL이 설정되지 않았습니다.")
        return
    
    embed = {
        "title": "🐟 새로운 회원가입 신청",
        "color": 0x3498db,
        "fields": [
            {"name": "사업장명", "value": user_data.business_name, "inline": True},
            {"name": "대표자명", "value": user_data.owner_name, "inline": True},
            {"name": "전화번호", "value": user_data.phone_number, "inline": True},
            {"name": "주소", "value": user_data.address, "inline": False},
            {"name": "사업자등록번호", "value": user_data.business_registration_number, "inline": True},
            {"name": "구독 플랜", "value": user_data.subscription_plan, "inline": True},
        ],
        "timestamp": "2024-01-01T00:00:00.000Z"
    }
    
    payload = {
        "content": "@everyone 새로운 회원가입 신청이 있습니다!",
        "embeds": [embed]
    }
    
    try:
        response = requests.post(webhook_url, json=payload)
        if response.status_code == 204:
            print("✅ Discord 알림 전송 성공")
        else:
            print(f"❌ Discord 알림 전송 실패: {response.status_code}")
    except Exception as e:
        print(f"❌ Discord 알림 전송 오류: {e}")

@router.post("/core/auth/register/")
async def register_user(user_data: UserRegistrationData):
    """
    사용자 회원가입 API
    """
    try:
        # 임시로 메모리에 사용자 데이터 저장 (실제로는 데이터베이스 사용)
        # 실제 구현에서는 데이터베이스에 저장
        
        # Discord 웹훅 전송
        await send_discord_notification(user_data)
        
        # 성공 응답
        return {
            "message": "회원가입 신청이 완료되었습니다.",
            "user": {
                "firebase_uid": user_data.firebase_uid,
                "business_name": user_data.business_name,
                "owner_name": user_data.owner_name,
                "status": "pending"
            }
        }
    except Exception as e:
        print(f"❌ 회원가입 처리 오류: {e}")
        raise HTTPException(status_code=500, detail="회원가입 처리 중 오류가 발생했습니다.")

@router.get("/core/auth/status/")
async def check_user_status(firebase_uid: str):
    """
    사용자 상태 확인 API
    """
    try:
        # 임시로 하드코딩된 응답 (실제로는 데이터베이스에서 조회)
        # 테스트용으로 새 사용자는 존재하지 않는 것으로 처리
        return {
            "exists": False,
            "user": None
        }
    except Exception as e:
        print(f"❌ 사용자 상태 확인 오류: {e}")
        raise HTTPException(status_code=500, detail="사용자 상태 확인 중 오류가 발생했습니다.")

@router.get("/core/auth/pending/")
async def get_pending_users():
    """
    승인 대기 사용자 목록 API (개발/테스트용)
    """
    try:
        # 임시 데이터 (실제로는 데이터베이스에서 조회)
        return {
            "pending_users": [],
            "count": 0
        }
    except Exception as e:
        print(f"❌ 대기 사용자 조회 오류: {e}")
        raise HTTPException(status_code=500, detail="대기 사용자 조회 중 오류가 발생했습니다.")