from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv


from routers import businesses, orders

load_dotenv()

app = FastAPI(
    title=os.getenv("PROJECT_NAME", "Team-PICK-O Backend"),

    description="Team-PICK-O 수산물 거래 관리 시스템",

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

app.include_router(businesses.router, prefix="/api/v1/businesses", tags=["거래처 관리"])
app.include_router(orders.router, prefix="/api/v1/orders", tags=["주문 관리"])

@app.get("/")
async def root():
    return {"message": "Team-PICK-O 수산물 거래 관리 시스템", "status": "running"}

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