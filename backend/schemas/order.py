from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

# 주문 상품 생성 스키마
class OrderItemCreate(BaseModel):
    fish_type_id: Optional[int] = None
    quantity: float = 1.0  # 수량 (kg 단위)
    unit_price: Decimal
    unit: Optional[str] = None  # 단위 (kg, 마리, 박스 등)
    description: Optional[str] = None

# 주문 상품 응답 스키마
class OrderItemResponse(BaseModel):
    id: int
    fish_type_id: Optional[int] = None
    quantity: float
    unit_price: Decimal
    unit: Optional[str] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True

# 주문 생성 스키마
class OrderCreate(BaseModel):
    business_id: int
    order_number: str
    status: str = "pending"
    shipping_address: Optional[str] = None
    notes: Optional[str] = None
    order_items: List[OrderItemCreate]

# 주문 업데이트 스키마
class OrderUpdate(BaseModel):
    status: Optional[str] = None
    shipping_address: Optional[str] = None
    notes: Optional[str] = None

# 주문 응답 스키마
class OrderResponse(BaseModel):
    id: int
    business_id: int
    order_number: str
    status: str
    total_amount: Decimal
    shipping_address: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    order_items: List[OrderItemResponse] = []

    class Config:
        from_attributes = True 