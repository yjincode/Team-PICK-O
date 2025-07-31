from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# 거래처 생성 스키마
class BusinessCreate(BaseModel):
    business_name: str
    phone_number: str
    address: Optional[str] = None

# 거래처 업데이트 스키마
class BusinessUpdate(BaseModel):
    business_name: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None

# 거래처 응답 스키마
class BusinessResponse(BaseModel):
    id: int
    business_name: str
    phone_number: str
    address: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# 거래처 요약 정보 스키마
class BusinessSummary(BaseModel):
    id: int
    business_name: str
    phone_number: str
    total_orders: int
    total_spent: float
    latest_order_date: Optional[datetime] = None

    class Config:
        from_attributes = True 