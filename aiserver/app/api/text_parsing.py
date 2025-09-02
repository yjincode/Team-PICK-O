"""
텍스트 파싱 API 엔드포인트
"""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Dict, Any, Optional
import logging

from ..services.llm_parser import LLMOrderParser

logger = logging.getLogger(__name__)

router = APIRouter()

class TextParsingRequest(BaseModel):
    text: str
    user_id: Optional[int] = None
    
class TextParsingResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    message: str

# LLM 파서 인스턴스 (싱글톤)
llm_parser = LLMOrderParser()

@router.post("/parse-text", response_model=TextParsingResponse)
async def parse_text(request: TextParsingRequest, authorization: Optional[str] = Header(None)):
    """
    텍스트를 파싱하여 구조화된 주문 정보로 변환
    
    Args:
        request: 파싱할 텍스트가 포함된 요청
        
    Returns:
        TextParsingResponse: 파싱 결과
    """
    try:
        if not request.text or not request.text.strip():
            raise HTTPException(status_code=400, detail="텍스트가 비어있습니다.")
        
        logger.info(f"텍스트 파싱 요청: {request.text[:100]}... (사용자: {request.user_id})")
        
        # 인증 정보 로깅 (디버깅용)
        if authorization:
            logger.info(f"Authorization 헤더 수신됨: {authorization[:20]}...")
        else:
            logger.warning("Authorization 헤더가 없습니다.")
        
        # 인증 토큰을 LLM 파서에 설정
        if authorization:
            llm_parser.set_auth_token(authorization)
        
        # LLM으로 텍스트 파싱 (사용자 정보 포함)
        parsed_data = llm_parser.parse_order_text(request.text.strip(), user_id=request.user_id)
        
        logger.info(f"파싱 완료: {len(parsed_data.get('items', []))}개 품목 추출")
        
        return TextParsingResponse(
            success=True,
            data=parsed_data,
            message="텍스트 파싱이 완료되었습니다."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"텍스트 파싱 오류: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"텍스트 파싱 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """
    LLM 서비스 상태 확인
    """
    try:
        ollama_available = llm_parser.is_ollama_available()
        
        return {
            "status": "healthy",
            "ollama_available": ollama_available,
            "model": llm_parser.model_name,
            "message": "LLM 파싱 서비스가 정상 작동 중입니다." if ollama_available else "Ollama 서비스 연결 실패 - fallback 모드"
        }
    except Exception as e:
        logger.error(f"헬스체크 오류: {str(e)}")
        return {
            "status": "error",
            "ollama_available": False,
            "model": llm_parser.model_name,
            "message": f"서비스 오류: {str(e)}"
        }
