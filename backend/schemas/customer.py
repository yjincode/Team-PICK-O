from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# 고객 생성 스키마
class CustomerCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    company_name: Optional[str] = None

# 고객 업데이트 스키마
class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    company_name: Optional[str] = None

# 고객 응답 스키마
class CustomerResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    company_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# 고객 요약 정보 스키마
class CustomerSummary(BaseModel):
    id: int
    name: str
    email: str
    total_orders: int
    total_spent: float
    latest_order_date: Optional[datetime] = None

    class Config:
        from_attributes = True 