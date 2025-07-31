from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# 결제 생성 스키마
class PaymentCreate(BaseModel):
    order_id: int
    business_id: int
    amount: int
    method: str  # bank_transfer, card, cash
    status: str = "paid"
    paid_at: Optional[datetime] = None

# 결제 업데이트 스키마
class PaymentUpdate(BaseModel):
    amount: Optional[int] = None
    method: Optional[str] = None
    status: Optional[str] = None
    paid_at: Optional[datetime] = None

# 결제 응답 스키마
class PaymentResponse(BaseModel):
    id: int
    order_id: int
    business_id: int
    amount: int
    method: str
    status: str
    paid_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True 