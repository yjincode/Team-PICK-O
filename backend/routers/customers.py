from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from database import get_db
from models import Customer, Order
from schemas import CustomerCreate, CustomerUpdate, CustomerResponse, CustomerSummary

router = APIRouter()

# 고객 목록 조회
@router.get("/", response_model=List[CustomerResponse])
def get_customers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """모든 고객 목록을 조회합니다."""
    customers = db.query(Customer).offset(skip).limit(limit).all()
    return customers

# 고객 생성
@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    """새로운 고객을 생성합니다."""
    # 이메일 중복 확인
    existing_customer = db.query(Customer).filter(Customer.email == customer.email).first()
    if existing_customer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 존재하는 이메일입니다."
        )
    
    db_customer = Customer(**customer.dict())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

# 고객 상세 조회
@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    """특정 고객의 상세 정보를 조회합니다."""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="고객을 찾을 수 없습니다."
        )
    return customer

# 고객 정보 수정
@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(customer_id: int, customer_update: CustomerUpdate, db: Session = Depends(get_db)):
    """고객 정보를 수정합니다."""
    db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="고객을 찾을 수 없습니다."
        )
    
    update_data = customer_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_customer, field, value)
    
    db.commit()
    db.refresh(db_customer)
    return db_customer

# 고객 삭제
@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    """고객을 삭제합니다."""
    db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="고객을 찾을 수 없습니다."
        )
    
    db.delete(db_customer)
    db.commit()
    return None

# 고객 요약 정보 조회
@router.get("/{customer_id}/summary", response_model=CustomerSummary)
def get_customer_summary(customer_id: int, db: Session = Depends(get_db)):
    """고객의 요약 정보(총 주문 수, 총 지출, 최근 주문일)를 조회합니다."""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="고객을 찾을 수 없습니다."
        )
    
    # 주문 통계 계산
    orders = db.query(Order).filter(Order.customer_id == customer_id).all()
    total_orders = len(orders)
    total_spent = sum(order.total_amount for order in orders) if orders else 0
    latest_order_date = max(order.created_at for order in orders) if orders else None
    
    return CustomerSummary(
        id=customer.id,
        name=customer.name,
        email=customer.email,
        total_orders=total_orders,
        total_spent=float(total_spent),
        latest_order_date=latest_order_date
    ) 