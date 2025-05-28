import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  SafeAreaView, 
  Alert, 
  ScrollView,
  Dimensions,
  Image,
  TextInput,
  RefreshControl,
  Modal
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../utils/navigationRef';
import { useDiaries, useUpdateDiary, useToggleLike, useCreateComment, useUpdateComment, useDeleteComment } from '../api/diaryApi';
import { useFollowUser, useUnfollowUser, useFollowStatus, useFollowing } from '../api/followApi';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from 'react-i18next';

type Props = NativeStackScreenProps<RootStackParamList, 'ShareFeed'>;

const { width } = Dimensions.get('window');

const ShareFeedScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [refreshing, setRefreshing] = useState(false);
  const [editingComment, setEditingComment] = useState<{ id: string; content: string } | null>(null);
  const { data: diaries, isLoading, error, refetch } = useDiaries(true);
  const { data: followingUsers } = useFollowing();
  const updateDiaryMutation = useUpdateDiary();
  const followUserMutation = useFollowUser();
  const unfollowUserMutation = useUnfollowUser();
  const toggleLikeMutation = useToggleLike();
  const createCommentMutation = useCreateComment();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();
  const currentUser = useAuthStore((state) => state.user);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const navigateToShareSelect = () => {
    navigation.navigate('ShareSelect');
  };

  const handleUnshare = async (diaryId: string) => {
    Alert.alert(
      '공유 해제',
      '정말 이 일기의 공유를 해제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '공유 해제',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDiaryMutation.mutateAsync({
                id: diaryId,
                is_public: false
              });
              Alert.alert('성공', '일기 공유가 해제되었습니다.');
            } catch (error) {
              Alert.alert('오류', '공유 해제 중 오류가 발생했습니다.');
            }
          }
        }
      ]
    );
  };

  const handleFollow = async (userId: string, isFollowing: boolean) => {
    try {
      if (isFollowing) {
        await unfollowUserMutation.mutateAsync(userId);
        Alert.alert('성공', '언팔로우했습니다.');
      } else {
        await followUserMutation.mutateAsync(userId);
        Alert.alert('성공', '팔로우했습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '팔로우 처리 중 오류가 발생했습니다.');
    }
  };

  const handleLike = async (diaryId: string) => {
    try {
      await toggleLikeMutation.mutateAsync(diaryId);
    } catch (error) {
      Alert.alert('오류', '좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  const handleComment = async (diaryId: string) => {
    const text = commentText[diaryId]?.trim();
    if (!text) return;

    try {
      await createCommentMutation.mutateAsync({ diaryId, content: text });
      setCommentText(prev => ({ ...prev, [diaryId]: '' }));
    } catch (error) {
      Alert.alert('오류', '댓글 작성 중 오류가 발생했습니다.');
    }
  };

  const handleEditComment = (comment: any) => {
    setEditingComment({ id: comment.id, content: comment.content });
  };

  const handleUpdateComment = async () => {
    if (!editingComment || !editingComment.content.trim()) return;

    try {
      await updateCommentMutation.mutateAsync({
        commentId: editingComment.id,
        content: editingComment.content.trim()
      });
      setEditingComment(null);
    } catch (error) {
      Alert.alert('오류', '댓글 수정 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    Alert.alert(
      '댓글 삭제',
      '정말 이 댓글을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCommentMutation.mutateAsync(commentId);
            } catch (error) {
              Alert.alert('오류', '댓글 삭제 중 오류가 발생했습니다.');
            }
          }
        }
      ]
    );
  };

  const handleStoryPress = (userId: string) => {
    if (selectedUserId === userId) {
      // 같은 스토리를 다시 클릭하면 필터 해제
      setSelectedUserId(null);
    } else {
      // 다른 스토리 클릭하면 해당 유저로 필터링
      setSelectedUserId(userId);
    }
  };

  const FollowButton = ({ userId }: { userId: string }) => {
    const { data: followStatus } = useFollowStatus(userId);
    const isFollowing = followStatus?.is_following || false;

    return (
      <TouchableOpacity 
        style={[styles.followButton, isFollowing && styles.followingButton]}
        onPress={() => handleFollow(userId, isFollowing)}
      >
        <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
          {isFollowing ? '팔로잉' : '팔로우'}
        </Text>
      </TouchableOpacity>
    );
  };

  const StoryItem = ({ user, isSelected }: { user: any; isSelected: boolean }) => (
    <TouchableOpacity 
      style={styles.storyContainer}
      onPress={() => handleStoryPress(user.id)}
    >
      <View style={[styles.storyAvatar, isSelected && styles.selectedStoryAvatar]}>
        <View style={styles.avatarInner}>
          <Text style={styles.avatarText}>
            {user.username.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.storyUsername} numberOfLines={1}>
        {user.username}
      </Text>
    </TouchableOpacity>
  );

  const renderDiaryItem = ({ item }: { item: any }) => {
    const isMyDiary = currentUser && item.user_id === currentUser.id;
    const displayName = isMyDiary ? '나' : (item.user?.username || '익명 사용자');
    
    return (
      <View style={styles.postContainer}>
        {/* 포스트 헤더 */}
        <View style={styles.postHeader}>
          <View style={styles.postUserInfo}>
            <View style={styles.postAvatar}>
              <Text style={styles.postAvatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.postUserDetails}>
              <Text style={styles.postUsername}>{displayName}</Text>
              <Text style={styles.postTime}>
                {new Date(item.created_at).toLocaleDateString('ko-KR')}
              </Text>
            </View>
          </View>
          <View style={styles.postActions}>
            {!isMyDiary && <FollowButton userId={item.user_id} />}
            {isMyDiary && (
              <TouchableOpacity 
                style={styles.unshareButton}
                onPress={() => handleUnshare(item.id)}
              >
                <Text style={styles.unshareButtonText}>공유 해제</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 포스트 내용 */}
        <View style={styles.postContent}>
          <Text style={styles.postText}>{item.content}</Text>
          
          {/* 이미지 표시 */}
          {item.images && item.images.length > 0 && (
            <View style={styles.postImages}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.imageScroll}
              >
                {item.images.map((imageUri: string, index: number) => (
                  <Image 
                    key={index}
                    source={{ uri: imageUri }} 
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* 좋아요 및 댓글 수 */}
        <View style={styles.postStats}>
          <Text style={styles.likesCount}>좋아요 {item.like_count}개</Text>
          {item.comment_count > 0 && (
            <Text style={styles.commentsCount}>댓글 {item.comment_count}개</Text>
          )}
        </View>

        {/* 포스트 푸터 (액션 버튼들) */}
        <View style={styles.postFooter}>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleLike(item.id)}
            >
              <Text style={[styles.actionButtonText, item.is_liked && styles.likedText]}>
                {item.is_liked ? '❤️' : '🤍'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>💬</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>📤</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 최근 댓글들 */}
        {item.comments && item.comments.length > 0 && (
          <View style={styles.commentsSection}>
            {item.comments.map((comment: any) => {
              const isMyComment = currentUser && comment.user.id === currentUser.id;
              return (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentContent}>
                    <Text style={styles.commentText}>
                      <Text style={styles.commentUsername}>{comment.user.username}</Text>
                      {' '}{comment.content}
                    </Text>
                  </View>
                  {isMyComment && (
                    <View style={styles.commentActions}>
                      <TouchableOpacity 
                        style={styles.commentActionButton}
                        onPress={() => handleEditComment(comment)}
                      >
                        <Text style={styles.commentActionText}>수정</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.commentActionButton}
                        onPress={() => handleDeleteComment(comment.id)}
                      >
                        <Text style={[styles.commentActionText, styles.deleteText]}>삭제</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* 댓글 입력 */}
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="댓글 달기..."
            value={commentText[item.id] || ''}
            onChangeText={(text) => setCommentText(prev => ({ ...prev, [item.id]: text }))}
            multiline
          />
          <TouchableOpacity 
            style={styles.commentSubmitButton}
            onPress={() => handleComment(item.id)}
            disabled={!commentText[item.id]?.trim()}
          >
            <Text style={[
              styles.commentSubmitText,
              !commentText[item.id]?.trim() && styles.commentSubmitDisabled
            ]}>
              게시
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // 필터링된 다이어리 목록
  const filteredDiaries = selectedUserId 
    ? diaries?.filter(diary => diary.user_id === selectedUserId) 
    : diaries;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>오류가 발생했습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>일기 공유 공간</Text>
        <TouchableOpacity style={styles.shareButton} onPress={navigateToShareSelect}>
          <Text style={styles.shareButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* 스토리 섹션 */}
      <View style={styles.storiesSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesContainer}
        >
          {followingUsers && followingUsers.length > 0 && followingUsers.map((user) => (
            <StoryItem 
              key={user.id} 
              user={user} 
              isSelected={selectedUserId === user.id}
            />
          ))}
        </ScrollView>
      </View>
      
      {/* 피드 */}
      <FlatList
        data={filteredDiaries}
        renderItem={renderDiaryItem}
        keyExtractor={(item) => item.id}
        style={styles.feedList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {selectedUserId ? '해당 사용자의 공유된 일기가 없습니다.' : '아직 공유된 일기가 없습니다.'}
            </Text>
            <Text style={styles.emptySubText}>
              {selectedUserId ? '다른 사용자를 선택해보세요!' : '첫 번째로 일기를 공유해보세요!'}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      />

      {/* 댓글 수정 모달 */}
      <Modal
        visible={editingComment !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditingComment(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditingComment(null)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>댓글 수정</Text>
              <TouchableOpacity onPress={handleUpdateComment}>
                <Text style={styles.modalSaveText}>저장</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalTextInput}
              value={editingComment?.content || ''}
              onChangeText={(text) => setEditingComment(prev => prev ? { ...prev, content: text } : null)}
              multiline
              placeholder="댓글을 입력하세요..."
              autoFocus
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#262626',
  },
  shareButton: {
    backgroundColor: '#405DE6',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  storiesSection: {
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 12,
  },
  storiesContainer: {
    paddingHorizontal: 16,
  },
  storyContainer: {
    alignItems: 'center',
    marginRight: 16,
    width: 72,
  },
  storyAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2,
    backgroundColor: '#e0e0e0',
    marginBottom: 4,
  },
  selectedStoryAvatar: {
    backgroundColor: '#405DE6',
  },
  avatarInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
  },
  storyUsername: {
    fontSize: 12,
    color: '#262626',
    textAlign: 'center',
  },
  feedList: {
    flex: 1,
  },
  postContainer: {
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  postUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  postAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  postUserDetails: {
    flex: 1,
  },
  postUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
  },
  postTime: {
    fontSize: 12,
    color: '#8e8e8e',
    marginTop: 2,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  postText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#262626',
    marginBottom: 8,
  },
  postImages: {
    marginTop: 8,
  },
  imageScroll: {
    flexDirection: 'row',
  },
  postImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginRight: 8,
  },
  postFooter: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#efefef',
    paddingTop: 8,
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginRight: 16,
  },
  actionButtonText: {
    fontSize: 20,
  },
  likesCount: {
    fontSize: 12,
    color: '#8e8e8e',
  },
  commentsCount: {
    fontSize: 12,
    color: '#8e8e8e',
  },
  likedText: {
    color: '#ED4956',
  },
  commentsSection: {
    padding: 12,
  },
  commentItem: {
    marginBottom: 8,
  },
  commentContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentText: {
    fontSize: 14,
    color: '#262626',
  },
  commentUsername: {
    fontSize: 12,
    fontWeight: '600',
    color: '#262626',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#efefef',
  },
  commentInput: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    marginRight: 8,
    minHeight: 40,
  },
  commentSubmitButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#405DE6',
  },
  commentSubmitText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  commentSubmitDisabled: {
    color: '#999',
  },
  followButton: {
    backgroundColor: '#405DE6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  followingButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#dbdbdb',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#262626',
  },
  unshareButton: {
    backgroundColor: '#ED4956',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  unshareButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8e8e8e',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ED4956',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8e8e8e',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#8e8e8e',
    textAlign: 'center',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentActionButton: {
    marginLeft: 8,
  },
  commentActionText: {
    color: '#405DE6',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteText: {
    color: '#ED4956',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalCancelText: {
    color: '#405DE6',
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#262626',
  },
  modalSaveText: {
    color: '#405DE6',
    fontSize: 16,
    fontWeight: '600',
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
});

export default ShareFeedScreen; 