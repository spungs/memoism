from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth.router import router as auth_router
from diary.router import router as diary_router
from follow.router import router as follow_router
from database import create_db_and_tables

app = FastAPI(title="Memoism API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 환경에서만 사용. 프로덕션에서는 실제 도메인으로 변경
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth_router)
app.include_router(diary_router)
app.include_router(follow_router)

@app.on_event("startup")
async def on_startup():
    create_db_and_tables()

@app.get("/")
async def root():
    return {"message": "Welcome to Memoism API"} 