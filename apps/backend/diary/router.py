from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID
import json

from database import get_session
from models import Diary, Profile
from auth.router import get_current_user
from diary.schemas import (
    DiaryCreate,
    DiaryResponse,
    DiaryUpdate,
)

router = APIRouter(prefix="/diaries", tags=["diaries"])

@router.post("", response_model=DiaryResponse)
async def create_diary(
    diary: DiaryCreate,
    current_user: Profile = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if diary.images and len(diary.images) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 10 images allowed per diary"
        )

    images_json = json.dumps(diary.images) if diary.images else None

    db_diary = Diary(
        user_id=current_user.id,
        content=diary.content,
        images=images_json,
    )
    session.add(db_diary)
    session.commit()
    session.refresh(db_diary)

    images_list = json.loads(db_diary.images) if db_diary.images else None
    user_info = {"id": str(current_user.id), "username": current_user.username}

    return DiaryResponse(
        id=db_diary.id,
        user_id=db_diary.user_id,
        content=db_diary.content,
        images=images_list,
        created_at=db_diary.created_at,
        updated_at=db_diary.updated_at,
        is_public=db_diary.is_public,
        user=user_info
    )

@router.get("/", include_in_schema=False)
@router.get("", response_model=List[DiaryResponse])
async def get_diaries(
    skip: int = 0,
    limit: int = 10,
    current_user: Profile = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    query = select(Diary, Profile).join(Profile, Diary.user_id == Profile.id).where(Diary.user_id == current_user.id)

    results = session.exec(
        query
        .offset(skip)
        .limit(limit)
        .order_by(Diary.created_at.desc())
    ).all()

    diary_responses = []
    for diary, user in results:
        images_list = None
        if diary.images:
            try:
                images_list = json.loads(diary.images)
            except (json.JSONDecodeError, TypeError):
                images_list = None

        diary_response = DiaryResponse(
            id=diary.id,
            user_id=diary.user_id,
            content=diary.content,
            images=images_list,
            created_at=diary.created_at,
            updated_at=diary.updated_at,
            is_public=diary.is_public,
            user={"id": str(user.id), "username": user.username}
        )
        diary_responses.append(diary_response)

    return diary_responses

@router.get("/{diary_id}", response_model=DiaryResponse)
async def get_diary(
    diary_id: UUID,
    current_user: Profile = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    result = session.exec(
        select(Diary, Profile)
        .join(Profile, Diary.user_id == Profile.id)
        .where(Diary.id == diary_id)
        .where(Diary.user_id == current_user.id)
    ).first()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diary not found"
        )

    diary, user = result
    images_list = json.loads(diary.images) if diary.images else None

    return DiaryResponse(
        id=diary.id,
        user_id=diary.user_id,
        content=diary.content,
        images=images_list,
        created_at=diary.created_at,
        updated_at=diary.updated_at,
        is_public=diary.is_public,
        user={"id": str(user.id), "username": user.username}
    )

@router.put("/{diary_id}", response_model=DiaryResponse)
async def update_diary(
    diary_id: UUID,
    diary_update: DiaryUpdate,
    current_user: Profile = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    diary = session.exec(
        select(Diary)
        .where(Diary.id == diary_id)
        .where(Diary.user_id == current_user.id)
    ).first()

    if not diary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diary not found"
        )

    if diary_update.images and len(diary_update.images) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 10 images allowed per diary"
        )

    update_data = diary_update.dict(exclude_unset=True)

    if 'images' in update_data:
        update_data['images'] = json.dumps(update_data['images']) if update_data['images'] else None

    for key, value in update_data.items():
        setattr(diary, key, value)

    session.add(diary)
    session.commit()
    session.refresh(diary)

    images_list = json.loads(diary.images) if diary.images else None
    user_info = {"id": str(current_user.id), "username": current_user.username}

    return DiaryResponse(
        id=diary.id,
        user_id=diary.user_id,
        content=diary.content,
        images=images_list,
        created_at=diary.created_at,
        updated_at=diary.updated_at,
        is_public=diary.is_public,
        user=user_info
    )

@router.delete("/{diary_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_diary(
    diary_id: UUID,
    current_user: Profile = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    diary = session.exec(
        select(Diary)
        .where(Diary.id == diary_id)
        .where(Diary.user_id == current_user.id)
    ).first()

    if not diary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diary not found"
        )

    session.delete(diary)
    session.commit()
    return None
