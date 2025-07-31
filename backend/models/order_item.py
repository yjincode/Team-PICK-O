from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from database import Base

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    fish_type_id = Column(Integer, ForeignKey("fish_types.id"), nullable=True)
    quantity = Column(Float, nullable=False, default=1)  # 수량 (kg 단위)
    unit_price = Column(Numeric(10, 2), nullable=False)
    unit = Column(String(20), nullable=True)  # 단위 (kg, 마리, 박스 등)
    description = Column(Text, nullable=True)
    
    # 관계 설정
    order = relationship("Order", back_populates="order_items")
    fish_type = relationship("FishType", back_populates="order_items")
    
    def __repr__(self):
        return f"<OrderItem(id={self.id}, quantity={self.quantity}, unit_price={self.unit_price})>" 