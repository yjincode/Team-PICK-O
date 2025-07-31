from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal
from database import get_db
from models import Order, OrderItem, Business
from schemas import OrderCreate, OrderUpdate, OrderResponse, OrderItemCreate

router = APIRouter()

# 주문 목록 조회
@router.get("/", response_model=List[OrderResponse])
def get_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """모든 주문 목록을 조회합니다."""
    orders = db.query(Order).offset(skip).limit(limit).all()
    return orders

# 거래처별 주문 목록 조회
@router.get("/business/{business_id}", response_model=List[OrderResponse])
def get_business_orders(business_id: int, db: Session = Depends(get_db)):
    """특정 거래처의 모든 주문을 조회합니다."""
    # 거래처 존재 확인
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="거래처를 찾을 수 없습니다."
        )
    
    orders = db.query(Order).filter(Order.business_id == business_id).all()
    return orders

# 주문 생성
@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    """새로운 주문을 생성합니다."""
    # 거래처 존재 확인
    business = db.query(Business).filter(Business.id == order.business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="거래처를 찾을 수 없습니다."
        )
    
    # 주문번호 중복 확인
    existing_order = db.query(Order).filter(Order.order_number == order.order_number).first()
    if existing_order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 존재하는 주문번호입니다."
        )
    
    # 주문 생성
    order_data = order.dict(exclude={'order_items'})
    db_order = Order(**order_data)
    db.add(db_order)
    db.flush()  # ID 생성을 위해 flush
    
    # 주문 상품들 생성
    total_amount = Decimal('0')
    for item_data in order.order_items:
        item = OrderItem(
            order_id=db_order.id,
            **item_data.dict()
        )
        # 총 가격 계산
        item.total_price = item.unit_price * item.quantity
        total_amount += item.total_price
        db.add(item)
    
    # 주문 총액 업데이트
    db_order.total_amount = total_amount
    
    db.commit()
    db.refresh(db_order)
    return db_order

# 주문 상세 조회
@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    """특정 주문의 상세 정보를 조회합니다."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="주문을 찾을 수 없습니다."
        )
    return order

# 주문 상태 업데이트
@router.put("/{order_id}", response_model=OrderResponse)
def update_order(order_id: int, order_update: OrderUpdate, db: Session = Depends(get_db)):
    """주문 정보를 수정합니다."""
    db_order = db.query(Order).filter(Order.id == order_id).first()
    if not db_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="주문을 찾을 수 없습니다."
        )
    
    update_data = order_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_order, field, value)
    
    db.commit()
    db.refresh(db_order)
    return db_order

# 주문 삭제
@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    """주문을 삭제합니다."""
    db_order = db.query(Order).filter(Order.id == order_id).first()
    if not db_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="주문을 찾을 수 없습니다."
        )
    
    db.delete(db_order)
    db.commit()
    return None 