from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlmodel import Session, select
from datetime import timedelta

from database import get_session
from models import Profile
from auth.schemas import Token, UserCreate, UserResponse, UserUpdate
from auth.utils import verify_password, get_password_hash, create_access_token, verify_token

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session)
) -> Profile:
    payload = verify_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = session.exec(
        select(Profile).where(Profile.id == user_id)
    ).first()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

@router.post("/signup", response_model=UserResponse)
async def signup(user: UserCreate, session: Session = Depends(get_session)):
    # 이메일 중복 확인
    existing_user = session.exec(
        select(Profile).where(Profile.email == user.email)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # 사용자 생성
    hashed_password = get_password_hash(user.password)
    db_user = Profile(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    
    return UserResponse(
        id=str(db_user.id),
        email=db_user.email,
        username=db_user.username
    )

@router.post("/token", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session)
):
    user = session.exec(
        select(Profile).where(Profile.email == form_data.username)
    ).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=30)
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Profile = Depends(get_current_user)
):
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        username=current_user.username
    )

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    user_update: UserUpdate,
    current_user: Profile = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # 사용자명 중복 확인 (변경하려는 경우에만)
    if user_update.username and user_update.username != current_user.username:
        existing_user = session.exec(
            select(Profile).where(Profile.username == user_update.username)
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        current_user.username = user_update.username
    
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        username=current_user.username
    ) 