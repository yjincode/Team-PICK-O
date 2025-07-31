from sqlalchemy import Column, Integer, String, ARRAY, Text
from sqlalchemy.orm import relationship
from database import Base

class FishType(Base):
    __tablename__ = "fish_types"
    
    id = Column(Integer, primary_key=True, index=True)
    fish_name = Column(String(50), nullable=False, index=True)
    aliases = Column(ARRAY(String), nullable=True)  # 동의어 배열
    description = Column(Text, nullable=True)
    
    # 관계 설정
    order_items = relationship("OrderItem", back_populates="fish_type")
    
    def __repr__(self):
        return f"<FishType(id={self.id}, fish_name='{self.fish_name}')>" 