import React, { useState } from "react";
import { FaHeart, FaReply, FaUserAlt } from "react-icons/fa";
import { toast } from "sonner";
import type { CommentCreateData, CommentListDto } from "../../../shared/types";
import { useAuthStore } from "../store/authStore";
import { api } from "../api/axios";
import { useNavigate } from "react-router-dom";

interface PostCommentProps {
  post: {
    id: number;
    authorId: number;
    comments: CommentListDto[];
  };
  setPost: React.Dispatch<React.SetStateAction<any>>;
}

const PostComment: React.FC<PostCommentProps> = ({ post, setPost }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [newComment, setNewComment] = useState<CommentCreateData>({
    postId: post.id,
    userId: user ? user.id : -1,
    content: "",
  });
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const handleCommentLike = async (commentId: number) => {
    if (!user?.id) {
      toast.error("로그인이 필요합니다.");
      navigate("/login");
      return;
    }
    try {
      const response = await api.post(`/post/comment/like`, {
        commentId: commentId,
        userId: user.id,
      });
      setPost((prevPost: any) => ({
        ...prevPost,
        comments: prevPost.comments.map((c: CommentListDto) =>
          c.id === commentId ? { ...c, isLiked: response, likeCount: response ? c.likeCount + 1 : c.likeCount - 1 } : c,
        ),
      }));
    } catch (error) {
      console.error("댓글 좋아요 오류:", error);
      toast.error("다시 시도해주세요.");
    }
  };

  const handleReplyToggle = (commentId: number) => {
    if (replyingTo === commentId) {
      setReplyingTo(null);
      setReplyContent("");
    } else {
      setReplyingTo(commentId);
      setReplyContent("");
    }
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);
    if (diffInSeconds < 60) return "방금 전";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}일 전`;
  };

  const handleAddComment = async (content: string, parentId: number | null) => {
    if (!user?.id) {
      toast.error("로그인이 필요합니다.");
      return;
    }
    if (!content.trim()) {
      toast.error("댓글을 작성해주세요.");
      return;
    }

    const commentData: CommentCreateData = {
      postId: post.id,
      userId: user.id,
      content,
      parentId: parentId ?? undefined,
    };

    try {
      const newCommentData = await api.post<CommentListDto>(`/post/comment`, commentData);
      setPost((prevPost: any) => ({
        ...prevPost,
        comments: [...prevPost.comments, newCommentData],
      }));

      if (parentId) {
        setReplyingTo(null);
        setReplyContent("");
      } else {
        setNewComment({ ...newComment, content: "" });
      }
    } catch (error) {
      console.error("댓글 작성 오류:", error);
    }
  };

  const handleCommentFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (!user?.id) {
      toast.error("로그인이 필요합니다.");
      e.target.blur(); // 포커스 취소
    }
  };

  const renderComment = (comment: CommentListDto, depth = 0) => {
    const replies = post.comments.filter((reply) => reply.parentId === comment.id);
    return (
      <div
        key={comment.id}
        className={`flex space-x-3 ${depth > 0 ? "pl-4 border-l-2 border-background-light dark:border-background-dark" : ""}`}
      >
        <div className="flex-shrink-0">
          {comment.author.profileImageUrl ? (
            <img
              src={`${import.meta.env.VITE_API_URL}${comment.author.profileImageUrl}`}
              alt={comment.author.nickname}
              className="w-8 h-8 rounded-full bg-gray-300"
            />
          ) : (
            <div className="w-8 h-8 bg-background-light dark:bg-background-dark rounded-full flex items-center justify-center">
              <FaUserAlt className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <span className="font-semibold text-black dark:text-white">{comment.author.nickname}</span>
            {comment.author.id === user?.id && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                나
              </span>
            )}
            {comment.author.id === post.authorId && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                작성자
              </span>
            )}
            <span className="mx-0.5">·</span>
            <span>{getRelativeTime(comment.createdAt.toString())}</span>
          </div>
          <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">{comment.content}</p>
          <div className="flex items-center space-x-4 mt-2 text-xs">
            <button
              onClick={() => handleCommentLike(comment.id)}
              className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:text-red-500"
            >
              <FaHeart className={comment.isLiked ? "text-red-500" : ""} />
              <span>{comment.likeCount}</span>
            </button>
            <button
              onClick={() => handleReplyToggle(comment.id)}
              className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:underline"
            >
              <FaReply />
              <span>답글</span>
            </button>
          </div>
          {replyingTo === comment.id && (
            <div className="mt-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                onFocus={handleCommentFocus}
                placeholder={`${comment.author.nickname}님에게 답글 달기...`}
                className="w-full p-3 border border-gray-300 dark:border-gray-500 rounded-lg bg-white dark:bg-[#292929] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:border-transparent outline-none resize-none"
                rows={2}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => handleReplyToggle(comment.id)}
                  className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm font-medium"
                >
                  취소
                </button>
                <button
                  onClick={() => handleAddComment(replyContent, comment.id)}
                  disabled={!replyContent.trim()}
                  className="bg-primary-light dark:bg-primary-dark text-background-light dark:text-background-dark px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  저장
                </button>
              </div>
            </div>
          )}
          <div className="mt-3 space-y-3">{replies.map((reply) => renderComment(reply, depth + 1))}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-[#292929] rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">댓글 ({post.comments.length})</h3>
      <div className="mb-6">
        <textarea
          value={newComment.content}
          onChange={(e) => setNewComment({ ...newComment, content: e.target.value })}
          onFocus={handleCommentFocus}
          placeholder={user?.id ? "댓글을 작성해주세요." : "로그인 후 댓글 작성이 가능합니다."}
          className="w-full p-3 border border-gray-300 dark:border-gray-500 rounded-lg bg-white dark:bg-[#292929] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:border-transparent outline-none resize-none"
          rows={3}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={() => handleAddComment(newComment.content, null)}
            disabled={!newComment.content.trim()}
            className="bg-primary-light dark:bg-primary-dark text-background-light dark:text-background-dark px-6 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            저장
          </button>
        </div>
      </div>
      <div className="space-y-5">
        {post.comments.filter((comment) => !comment.parentId).map((comment) => renderComment(comment))}
      </div>
    </div>
  );
};

export default PostComment;
