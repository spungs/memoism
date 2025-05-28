from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from uuid import UUID
import json

from database import get_session
from models import Diary, DiaryComment, DiaryReaction, Profile, Follow, Notification
from auth.router import get_current_user
from diary.schemas import (
    DiaryCreate,
    DiaryResponse,
    DiaryUpdate,
    DiaryCommentCreate,
    DiaryCommentResponse,
    DiaryReactionCreate,
    DiaryReactionResponse
)

router = APIRouter(prefix="/diaries", tags=["diaries"])

@router.post("", response_model=DiaryResponse)
async def create_diary(
    diary: DiaryCreate,
    current_user: Profile = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Validate max 10 images
    if diary.images and len(diary.images) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 10 images allowed per diary"
        )
    
    # Convert images list to JSON string
    images_json = json.dumps(diary.images) if diary.images else None
    
    db_diary = Diary(
        user_id=current_user.id,
        content=diary.content,
        images=images_json,
        is_public=diary.is_public
    )
    session.add(db_diary)
    session.commit()
    session.refresh(db_diary)
    
    # Create response with parsed images
    images_list = json.loads(db_diary.images) if db_diary.images else None
    return DiaryResponse(
        id=db_diary.id,
        user_id=db_diary.user_id,
        content=db_diary.content,
        images=images_list,
        created_at=db_diary.created_at,
        updated_at=db_diary.updated_at,
        is_public=db_diary.is_public
    )

@router.get("", response_model=List[DiaryResponse])
async def get_diaries(
    skip: int = 0,
    limit: int = 10,
    public_only: bool = False,
    current_user: Profile = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    try:
        if public_only:
            # 모든 사용자의 공개 일기 조회
            query = select(Diary, Profile).join(Profile, Diary.user_id == Profile.id).where(Diary.is_public == True)
        else:
            # 자신의 일기만 조회 (공개/비공개 모두)
            query = select(Diary, Profile).join(Profile, Diary.user_id == Profile.id).where(Diary.user_id == current_user.id)
        
        results = session.exec(
            query
            .offset(skip)
            .limit(limit)
            .order_by(Diary.created_at.desc())
        ).all()
        
        # Diary와 Profile을 결합하여 DiaryResponse 생성
        diary_responses = []
        for diary, user in results:
            try:
                # 댓글 수 계산
                comment_count = len(session.exec(
                    select(DiaryComment).where(DiaryComment.diary_id == diary.id)
                ).fetchall())
                
                # 좋아요 수 계산 (❤️ 반응만)
                like_count = len(session.exec(
                    select(DiaryReaction).where(
                        DiaryReaction.diary_id == diary.id,
                        DiaryReaction.reaction_type == "❤️"
                    )
                ).fetchall())
                
                # 현재 사용자의 좋아요 여부 확인
                user_like = session.exec(
                    select(DiaryReaction).where(
                        DiaryReaction.diary_id == diary.id,
                        DiaryReaction.user_id == current_user.id,
                        DiaryReaction.reaction_type == "❤️"
                    )
                ).first()
                is_liked = user_like is not None
                
                # 최근 댓글 3개 가져오기
                comments_query = session.exec(
                    select(DiaryComment, Profile)
                    .join(Profile, DiaryComment.user_id == Profile.id)
                    .where(DiaryComment.diary_id == diary.id)
                    .order_by(DiaryComment.created_at.desc())
                    .limit(3)
                ).all()
                
                comments = []
                for comment, comment_user in comments_query:
                    comments.append({
                        "id": str(comment.id),
                        "content": comment.content,
                        "user": {"id": str(comment_user.id), "username": comment_user.username},
                        "created_at": comment.created_at
                    })
                
                # Parse images JSON string back to list - 안전한 파싱
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
                    user={"id": str(user.id), "username": user.username},
                    comment_count=comment_count,
                    like_count=like_count,
                    is_liked=is_liked,
                    comments=comments
                )
                diary_responses.append(diary_response)
            except Exception as e:
                print(f"Error processing diary {diary.id}: {e}")
                continue
        
        return diary_responses
    except Exception as e:
        print(f"Error in get_diaries: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/{diary_id}", response_model=DiaryResponse)
async def get_diary(
    diary_id: UUID,
    current_user: Profile = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    diary = session.exec(
        select(Diary)
        .where(Diary.id == diary_id)
        .where(
            (Diary.user_id == current_user.id) |
            (Diary.is_public == True)
        )
    ).first()
    
    if not diary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diary not found"
        )
    
    # Parse images JSON string back to list
    images_list = json.loads(diary.images) if diary.images else None
    
    return DiaryResponse(
        id=diary.id,
        user_id=diary.user_id,
        content=diary.content,
        images=images_list,
        created_at=diary.created_at,
        updated_at=diary.updated_at,
        is_public=diary.is_public
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
    
    # Validate max 10 images if images are being updated
    if diary_update.images and len(diary_update.images) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 10 images allowed per diary"
        )
    
    # 공개 상태가 변경되는지 확인
    was_private = not diary.is_public
    will_be_public = diary_update.is_public if diary_update.is_public is not None else diary.is_public
    
    update_data = diary_update.dict(exclude_unset=True)
    
    # Convert images list to JSON string if provided
    if 'images' in update_data:
        update_data['images'] = json.dumps(update_data['images']) if update_data['images'] else None
    
    for key, value in update_data.items():
        setattr(diary, key, value)
    
    session.add(diary)
    session.commit()
    session.refresh(diary)
    
    # 비공개에서 공개로 변경된 경우 팔로워들에게 알림
    if was_private and will_be_public:
        # 팔로워들 조회
        followers = session.exec(
            select(Profile)
            .join(Follow, Follow.follower_id == Profile.id)
            .where(Follow.following_id == current_user.id)
        ).all()
        
        # 각 팔로워에게 알림 생성
        for follower in followers:
            notification = Notification(
                user_id=follower.id,
                type="diary_shared",
                title="새로운 일기 공유",
                message=f"{current_user.username}님이 새로운 일기를 공유했습니다.",
                data=str(diary.id)
            )
            session.add(notification)
        
        session.commit()
    
    # Parse images JSON string back to list for response
    images_list = json.loads(diary.images) if diary.images else None
    
    return DiaryResponse(
        id=diary.id,
        user_id=diary.user_id,
        content=diary.content,
        images=images_list,
        created_at=diary.created_at,
        updated_at=diary.updated_at,
        is_public=diary.is_public
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

# 댓글 관련 엔드포인트
@router.post("/{diary_id}/comments", response_model=DiaryCommentResponse)
async def create_comment(
    diary_id: UUID,
    comment: DiaryCommentCreate,
    current_user: Profile = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # 일기가 존재하는지 확인
    diary = session.exec(
        select(Diary)
        .where(Diary.id == diary_id)
        .where(
            (Diary.user_id == current_user.id) |
            (Diary.is_public == True)
        )
    ).first()
    
    if not diary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diary not found"
        )
    
    db_comment = DiaryComment(
        diary_id=diary_id,
        user_id=current_user.id,
        content=comment.content
    )
    session.add(db_comment)
    session.commit()
    session.refresh(db_comment)
    return db_comment

@router.put("/comments/{comment_id}", response_model=DiaryCommentResponse)
async def update_comment(
    comment_id: UUID,
    comment_update: DiaryCommentCreate,
    current_user: Profile = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # 댓글 조회 및 권한 확인
    comment = session.exec(
        select(DiaryComment)
        .where(DiaryComment.id == comment_id)
        .where(DiaryComment.user_id == current_user.id)
    ).first()
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found or you don't have permission to edit it"
        )
    
    comment.content = comment_update.content
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return comment

@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: UUID,
    current_user: Profile = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # 댓글 조회 및 권한 확인
    comment = session.exec(
        select(DiaryComment)
        .where(DiaryComment.id == comment_id)
        .where(DiaryComment.user_id == current_user.id)
    ).first()
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found or you don't have permission to delete it"
        )
    
    session.delete(comment)
    session.commit()
    return None

@router.get("/{diary_id}/comments", response_model=List[DiaryCommentResponse])
async def get_comments(
    diary_id: UUID,
    current_user: Profile = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # 일기가 존재하는지 확인
    diary = session.exec(
        select(Diary)
        .where(Diary.id == diary_id)
        .where(
            (Diary.user_id == current_user.id) |
            (Diary.is_public == True)
        )
    ).first()
    
    if not diary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diary not found"
        )
    
    comments = session.exec(
        select(DiaryComment)
        .where(DiaryComment.diary_id == diary_id)
    ).all()
    return comments

# 반응 관련 엔드포인트
@router.post("/{diary_id}/like")
async def toggle_like(
    diary_id: UUID,
    current_user: Profile = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # 일기가 존재하는지 확인
    diary = session.exec(
        select(Diary)
        .where(Diary.id == diary_id)
        .where(
            (Diary.user_id == current_user.id) |
            (Diary.is_public == True)
        )
    ).first()
    
    if not diary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diary not found"
        )
    
    # 기존 좋아요가 있는지 확인
    existing_like = session.exec(
        select(DiaryReaction)
        .where(DiaryReaction.diary_id == diary_id)
        .where(DiaryReaction.user_id == current_user.id)
        .where(DiaryReaction.reaction_type == "❤️")
    ).first()
    
    if existing_like:
        # 좋아요 취소
        session.delete(existing_like)
        session.commit()
        return {"message": "Like removed", "is_liked": False}
    else:
        # 좋아요 추가
        new_like = DiaryReaction(
            diary_id=diary_id,
            user_id=current_user.id,
            reaction_type="❤️"
        )
        session.add(new_like)
        session.commit()
        return {"message": "Like added", "is_liked": True}

@router.post("/{diary_id}/reactions", response_model=DiaryReactionResponse)
async def create_reaction(
    diary_id: UUID,
    reaction: DiaryReactionCreate,
    current_user: Profile = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # 일기가 존재하는지 확인
    diary = session.exec(
        select(Diary)
        .where(Diary.id == diary_id)
        .where(
            (Diary.user_id == current_user.id) |
            (Diary.is_public == True)
        )
    ).first()
    
    if not diary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diary not found"
        )
    
    # 이미 같은 반응이 있는지 확인
    existing_reaction = session.exec(
        select(DiaryReaction)
        .where(DiaryReaction.diary_id == diary_id)
        .where(DiaryReaction.user_id == current_user.id)
        .where(DiaryReaction.reaction_type == reaction.reaction_type)
    ).first()
    
    if existing_reaction:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reaction already exists"
        )
    
    db_reaction = DiaryReaction(
        diary_id=diary_id,
        user_id=current_user.id,
        reaction_type=reaction.reaction_type
    )
    session.add(db_reaction)
    session.commit()
    session.refresh(db_reaction)
    return db_reaction

@router.get("/{diary_id}/reactions", response_model=List[DiaryReactionResponse])
async def get_reactions(
    diary_id: UUID,
    current_user: Profile = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # 일기가 존재하는지 확인
    diary = session.exec(
        select(Diary)
        .where(Diary.id == diary_id)
        .where(
            (Diary.user_id == current_user.id) |
            (Diary.is_public == True)
        )
    ).first()
    
    if not diary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diary not found"
        )
    
    reactions = session.exec(
        select(DiaryReaction)
        .where(DiaryReaction.diary_id == diary_id)
    ).all()
    return reactions 