"""
AI 서버 - FastAPI 기반 어류 질병 분석 서비스
YOLO11 + VGG16을 사용한 증상 탐지 및 질병 분류
AI Server health endpoint updated
"""
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

app = FastAPI(
    title="Fish Disease Analysis AI Server",
    description="YOLO11 + VGG16 기반 어류 질병 분석 서비스",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],  # 프론트엔드 및 백엔드
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 정적 파일 서빙 (업로드된 이미지 등)
if os.path.exists("uploads"):
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# API 라우터 등록
from app.api import analysis

app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["analysis"])

@app.get("/")
async def root():
    """헬스 체크"""
    return {
        "service": "Fish Disease Analysis AI Server",
        "status": "healthy",
        "version": "1.0.0",
        "endpoints": {
            "analyze": "/api/v1/analysis/predict",
            "health": "/health",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health_check():
    """상세 헬스 체크"""
    try:
        # 모델 로드 상태 확인
        from app.services.yolo_service import YOLO11Service
        from app.services.vgg_service import VGG16Service
        
        yolo_service = YOLO11Service()
        vgg_service = VGG16Service()
        
        yolo_status = yolo_service.check_model_status()
        vgg_status = vgg_service.check_model_status()
        
        return {
            "status": "healthy",
            "models": {
                "yolo11": yolo_status,
                "vgg16": vgg_status
            },
            "server": {
                "port": os.getenv("AI_SERVER_PORT", "8001"),
                "host": os.getenv("AI_SERVER_HOST", "0.0.0.0")
            }
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("AI_SERVER_HOST", "0.0.0.0")
    port = int(os.getenv("AI_SERVER_PORT", "8001"))
    
    print(f"🚀 AI Server 시작: http://{host}:{port}")
    print(f"📚 API 문서: http://{host}:{port}/docs")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )