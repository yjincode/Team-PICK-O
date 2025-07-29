from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv

from routers import __init__ as routers

load_dotenv()

app = FastAPI(
    title=os.getenv("PROJECT_NAME", "Team-PICK-O Backend"),
    description="Team-PICK-O 프로젝트 백엔드 API",
    version="1.0.0",
    openapi_url="/api/v1/openapi.json"
)

# CORS 설정
origins = [
    "http://localhost:3000",  # React 개발 서버
    "http://localhost:8080",  # Vue 개발 서버
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 정적 파일 서빙
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# 라우터 등록
# app.include_router(routers.auth.router, prefix="/api/v1/auth", tags=["인증"])
# app.include_router(routers.users.router, prefix="/api/v1/users", tags=["사용자"])

@app.get("/")
async def root():
    return {"message": "Team-PICK-O Backend API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True
    )