from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from uuid import UUID

from database import get_session
from models import Follow, Profile, Notification
from auth.router import get_current_user
from follow.schemas import (
    FollowResponse,
    UserProfileResponse,
    NotificationResponse
)

router = APIRouter(prefix="/follow", tags=["follow"])

@router.post("/{user_id}", response_model=FollowResponse)
async def follow_user(
    user_id: UUID,
    current_user: Profile = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # 자기 자신을 팔로우할 수 없음
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot follow yourself"
        )
    
    # 대상 유저가 존재하는지 확인
    target_user = session.exec(
        select(Profile).where(Profile.id == user_id)
    ).first()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 이미 팔로우하고 있는지 확인
    existing_follow = session.exec(
        select(Follow)
        .where(Follow.follower_id == current_user.id)
        .where(Follow.following_id == user_id)
    ).first()
    
    if existing_follow:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already following this user"
        )
    
    # 팔로우 생성
    follow = Follow(
        follower_id=current_user.id,
        following_id=user_id
    )
    session.add(follow)
    
    # 알림 생성
    notification = Notification(
        user_id=user_id,
        type="follow",
        title="새로운 팔로워",
        message=f"{current_user.username}님이 회원님을 팔로우했습니다.",
        data=str(current_user.id)
    )
    session.add(notification)
    
    session.commit()
    session.refresh(follow)
    return follow

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unfollow_user(
    user_id: UUID,
    current_user: Profile = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    follow = session.exec(
        select(Follow)
        .where(Follow.follower_id == current_user.id)
        .where(Follow.following_id == user_id)
    ).first()
    
    if not follow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not following this user"
        )
    
    session.delete(follow)
    session.commit()
    return None

@router.get("/following", response_model=List[UserProfileResponse])
async def get_following(
    current_user: Profile = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # 내가 팔로우하는 사람들
    following_users = session.exec(
        select(Profile)
        .join(Follow, Follow.following_id == Profile.id)
        .where(Follow.follower_id == current_user.id)
    ).all()
    
    return following_users

@router.get("/followers", response_model=List[UserProfileResponse])
async def get_followers(
    current_user: Profile = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # 나를 팔로우하는 사람들
    followers = session.exec(
        select(Profile)
        .join(Follow, Follow.follower_id == Profile.id)
        .where(Follow.following_id == current_user.id)
    ).all()
    
    return followers

@router.get("/check/{user_id}")
async def check_follow_status(
    user_id: UUID,
    current_user: Profile = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    follow = session.exec(
        select(Follow)
        .where(Follow.follower_id == current_user.id)
        .where(Follow.following_id == user_id)
    ).first()
    
    return {"is_following": follow is not None}

@router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(
    current_user: Profile = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    notifications = session.exec(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
    ).all()
    
    return notifications

@router.put("/notifications/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: UUID,
    current_user: Profile = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    notification = session.exec(
        select(Notification)
        .where(Notification.id == notification_id)
        .where(Notification.user_id == current_user.id)
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    notification.is_read = True
    session.add(notification)
    session.commit()
    
    return {"message": "Notification marked as read"} 