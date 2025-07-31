from database import engine, Base
from models.business import Business
from models.fish_type import FishType
from models.order import Order
from models.order_item import OrderItem
from models.payment import Payment

def create_tables():
    """데이터베이스 테이블을 생성합니다."""
    Base.metadata.create_all(bind=engine)
    print("✅ 수산물 거래 관리 시스템 테이블이 성공적으로 생성되었습니다!")

if __name__ == "__main__":
    create_tables() 