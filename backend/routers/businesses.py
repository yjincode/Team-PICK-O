from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Business, Order
from schemas import BusinessCreate, BusinessUpdate, BusinessResponse, BusinessSummary

router = APIRouter()

# 거래처 목록 조회
@router.get("/", response_model=List[BusinessResponse])
def get_businesses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """모든 거래처 목록을 조회합니다."""
    businesses = db.query(Business).offset(skip).limit(limit).all()
    return businesses

# 거래처 생성
@router.post("/", response_model=BusinessResponse, status_code=status.HTTP_201_CREATED)
def create_business(business: BusinessCreate, db: Session = Depends(get_db)):
    """새로운 거래처를 생성합니다."""
    db_business = Business(**business.dict())
    db.add(db_business)
    db.commit()
    db.refresh(db_business)
    return db_business

# 거래처 상세 조회
@router.get("/{business_id}", response_model=BusinessResponse)
def get_business(business_id: int, db: Session = Depends(get_db)):
    """특정 거래처의 상세 정보를 조회합니다."""
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="거래처를 찾을 수 없습니다."
        )
    return business

# 거래처 정보 수정
@router.put("/{business_id}", response_model=BusinessResponse)
def update_business(business_id: int, business_update: BusinessUpdate, db: Session = Depends(get_db)):
    """거래처 정보를 수정합니다."""
    db_business = db.query(Business).filter(Business.id == business_id).first()
    if not db_business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="거래처를 찾을 수 없습니다."
        )
    
    update_data = business_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_business, field, value)
    
    db.commit()
    db.refresh(db_business)
    return db_business

# 거래처 삭제
@router.delete("/{business_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_business(business_id: int, db: Session = Depends(get_db)):
    """거래처를 삭제합니다."""
    db_business = db.query(Business).filter(Business.id == business_id).first()
    if not db_business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="거래처를 찾을 수 없습니다."
        )
    
    db.delete(db_business)
    db.commit()
    return None

# 거래처 요약 정보 조회
@router.get("/{business_id}/summary", response_model=BusinessSummary)
def get_business_summary(business_id: int, db: Session = Depends(get_db)):
    """거래처의 요약 정보(총 주문 수, 총 지출, 최근 주문일)를 조회합니다."""
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="거래처를 찾을 수 없습니다."
        )
    
    # 주문 통계 계산
    orders = db.query(Order).filter(Order.business_id == business_id).all()
    total_orders = len(orders)
    total_spent = sum(order.total_amount for order in orders) if orders else 0
    latest_order_date = max(order.created_at for order in orders) if orders else None
    
    return BusinessSummary(
        id=business.id,
        business_name=business.business_name,
        phone_number=business.phone_number,
        total_orders=total_orders,
        total_spent=float(total_spent),
        latest_order_date=latest_order_date
    ) 