from pydantic import BaseModel
from typing import Optional, List

# 어종 생성 스키마
class FishTypeCreate(BaseModel):
    fish_name: str
    aliases: Optional[List[str]] = None
    description: Optional[str] = None

# 어종 업데이트 스키마
class FishTypeUpdate(BaseModel):
    fish_name: Optional[str] = None
    aliases: Optional[List[str]] = None
    description: Optional[str] = None

# 어종 응답 스키마
class FishTypeResponse(BaseModel):
    id: int
    fish_name: str
    aliases: Optional[List[str]] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True 