import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaEye, FaHeart, FaComment, FaShare, FaUserAlt, FaEdit, FaTrash } from "react-icons/fa";
import { ClipLoader } from "react-spinners";
import PostComment from "../components/PostComment";
import ReportModal from "../components/ReportModal";
import type { PostDetailDto } from "../../../shared/types";
import { api } from "../api/axios";
import { useAuthStore } from "../store/authStore";
import { useReportStore } from "../store/reportStore";
import { useTheme } from "../hooks/useTheme";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { REPORTABLE_TYPES } from "../../../shared/constants";

const PostPage: React.FC = () => {
  const { category = "", id: postId } = useParams<{ category: string; id: string }>();
  const navigate = useNavigate();

  const [isLiked, setIsLiked] = useState(false);
  const [isHeartAnimating, setIsHeartAnimating] = useState(false);
  const [post, setPost] = useState<PostDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const { user } = useAuthStore();
  const { openModal, isModalOpen, reportableType, reportableId, closeModal, submitReport, setNavigate } =
    useReportStore();
  const { theme } = useTheme();
  const effectRan = useRef(false);

  // 네비게이션 함수 등록
  useEffect(() => {
    setNavigate(navigate);
  }, [navigate, setNavigate]);

  // 다크모드에서 content의 색상을 동적으로 처리하는 함수
  const processContentForTheme = (content: string) => {
    if (theme === "dark") {
      // 다크모드일 때 검은색 텍스트를 흰색으로 변환
      return content
        .replace(/color:\s*#000000/g, "color: #ffffff")
        .replace(/color:\s*#000/g, "color: #fff")
        .replace(/color:\s*black/g, "color: white")
        .replace(/color:\s*rgb\(0,\s*0,\s*0\)/g, "color: rgb(255, 255, 255)")
        .replace(/color:\s*rgba\(0,\s*0,\s*0,\s*[^)]+\)/g, "color: rgba(255, 255, 255, 1)");
    }
    return content;
  };

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setIsLoading(true);
        setIsNotFound(false);

        const response = await api.get<PostDetailDto>(`/post/detail/${postId}`);
        if (response) {
          setPost(response);
          setIsLiked(response.isLiked || false);
        } else {
          setIsNotFound(true);
          navigate("/404", { replace: true });
        }
      } catch (error) {
        console.error("게시글 조회 오류:", error);
        setIsNotFound(true);
        // 404 페이지로 리다이렉트
        navigate("/404", { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    if (effectRan.current === false) {
      if (postId) fetchPost();

      return () => {
        effectRan.current = true;
      };
    }
  }, [postId]);

  // 좋아요 토글
  const handleLike = async () => {
    // 로그인 상태 확인
    if (!user?.id) {
      toast.error("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    try {
      const response = await api.post(`/post/like/${postId}`);
      setIsLiked(response);

      // 하트 애니메이션 트리거
      if (response) {
        setIsHeartAnimating(true);
        setTimeout(() => setIsHeartAnimating(false), 600);
      }

      // 게시글 좋아요 수 업데이트
      if (post) {
        setPost({
          ...post,
          likeCount: response ? post.likeCount + 1 : post.likeCount - 1,
        });
      }
    } catch (error: any) {
      console.error("좋아요 오류:", error);

      // 에러 메시지에 따른 처리
      if (error.response?.status === 401) {
        toast.error("로그인이 필요합니다.");
        navigate("/login");
      } else if (error.response?.status === 400) {
        toast.error(error.response.data.message || "이미 좋아요를 누른 게시글입니다.");
      } else {
        toast.error("다시 시도해주세요.");
      }
    }
  };

  // 공유 버튼 클릭 핸들러
  const handleShare = async () => {
    const currentUrl = window.location.href;

    // 모바일에서 네이티브 공유 API 사용 (iOS Safari, Android Chrome)
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title || "게시글",
          url: currentUrl,
        });
        return;
      } catch (error: any) {
        // 사용자가 공유를 취소한 경우는 에러가 아님
        if (error.name !== "AbortError") {
          console.error("네이티브 공유 실패:", error);
        } else {
          return; // 사용자가 취소한 경우 그냥 종료
        }
      }
    }

    // 네이티브 공유가 지원되지 않거나 실패한 경우 클립보드 복사
    try {
      await navigator.clipboard.writeText(currentUrl);
      toast.success("링크가 클립보드에 복사되었습니다!");
    } catch (error) {
      console.error("클립보드 복사 실패:", error);
      // fallback: 구형 브라우저 지원
      try {
        const textArea = document.createElement("textarea");
        textArea.value = currentUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (successful) {
          toast.success("링크가 클립보드에 복사되었습니다!");
        } else {
          toast.error("링크 복사에 실패했습니다. 수동으로 복사해주세요.");
        }
      } catch (fallbackError) {
        console.error("Fallback 복사 실패:", fallbackError);
        toast.error("링크 복사에 실패했습니다. 수동으로 복사해주세요.");
      }
    }
  };

  // 사용자 프로필 클릭 핸들러 (추후 모달/팝업 구현 예정)
  const handleUserProfileClick = (userId: number) => {
    console.log("User profile clicked:", userId);
    // TODO: 사용자 프로필 모달/팝업 구현
  };

  // 게시글 수정 핸들러
  const handleEdit = () => {
    if (!post) return;
    navigate(`/${category}/edit/${post.id}`);
  };

  // 게시글 삭제 핸들러
  const handleDelete = async () => {
    if (!post) return;

    const result = await Swal.fire({
      title: "게시글을 삭제하시겠습니까?",
      text: "삭제된 게시글은 복구할 수 없습니다.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "삭제",
      cancelButtonText: "취소",
      background: theme === "dark" ? "#343434" : "#fff",
      color: theme === "dark" ? "#e5e7eb" : "#1f2937",
      confirmButtonColor: theme === "dark" ? "#F97171" : "#EF4444",
      cancelButtonColor: theme === "dark" ? "#9DC183" : "#4F7942",
    });

    if (result.isConfirmed) {
      try {
        await api.post(`/post/delete/${post.id}`);
        toast.success("게시글이 삭제되었습니다.");
        navigate(`/${category}`, { replace: true });
      } catch (error) {
        console.error("게시글 삭제 오류:", error);
        toast.error("게시글 삭제에 실패했습니다.");
      }
    }
  };

  // 신고 모달 열기
  const handleReportClick = () => {
    if (!post) return;
    openModal(REPORTABLE_TYPES.POST, post.id, () => !!user?.id);
  };

  // 작성자인지 확인
  const isAuthor = user?.id === post?.authorId;

  // 상대적 시간 표시 함수
  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - commentDate.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "방금 전";
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 6) return `${diffInHours}시간 전`;

    // 6시간 이후는 yyyy/mm/dd hh:mm 형태로 표시
    const year = commentDate.getFullYear();
    const month = String(commentDate.getMonth() + 1).padStart(2, "0");
    const day = String(commentDate.getDate()).padStart(2, "0");
    const hours = String(commentDate.getHours()).padStart(2, "0");
    const minutes = String(commentDate.getMinutes()).padStart(2, "0");

    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  // 게시글이 없으면 404 처리 (이미 navigate로 리다이렉트됨)
  if (!post || isNotFound) return null;

  // 로딩 중일 때 스피너 표시
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 mt-16">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <ClipLoader size={50} className="mx-auto mb-4" color={theme === "light" ? "#4F7942" : "#9DC183"} />
            <p className="text-gray-600 dark:text-gray-400">게시글을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 mt-16">
      {/* 게시글 헤더 */}
      <div className="bg-white dark:bg-[#292929] rounded-lg shadow-md p-6 mb-6">
        {/* 작성자 정보 (모바일) */}
        <div className="md:hidden mb-3">
          <div className="flex items-center justify-between">
            <div
              className="group flex items-center gap-3 cursor-pointer"
              onClick={() => handleUserProfileClick(post.authorId)}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center group-hover:opacity-80 transition-opacity">
                {post.authorProfileImageUrl ? (
                  <img
                    src={`${import.meta.env.VITE_API_URL}${post.authorProfileImageUrl}`}
                    alt={post.authorNickname}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-background-light dark:bg-background-dark rounded-full flex items-center justify-center">
                    <FaUserAlt className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  </div>
                )}
              </div>
              <span className="text-gray-600 dark:text-gray-400 group-hover:text-primary-light dark:group-hover:text-primary-dark group-hover:underline transition-colors">
                {post.authorNickname}
              </span>
            </div>
            {isAuthor ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEdit}
                  className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                  title="수정"
                >
                  <FaEdit className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title="삭제"
                >
                  <FaTrash className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleReportClick}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:underline transition-colors"
              >
                신고하기
              </button>
            )}
          </div>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-500">
            {getRelativeTime(post.createdAt.toString())}
          </div>
        </div>

        {/* 제목과 버튼들 (데스크톱) */}
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex-1">{post.title}</h1>
          <div className="hidden md:flex items-center gap-2 ml-4">
            {isAuthor ? (
              <>
                <button
                  onClick={handleEdit}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors flex items-center gap-1 group"
                >
                  <FaEdit className="w-3.5 h-3.5 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                  <span className="group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                    수정
                  </span>
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors flex items-center gap-1 group"
                >
                  <FaTrash className="w-3.5 h-3.5 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors" />
                  <span className="group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">삭제</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleReportClick}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:underline transition-colors"
              >
                신고하기
              </button>
            )}
          </div>
        </div>

        {/* 작성자 정보와 통계 */}
        <div className="hidden md:flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="group flex items-center gap-3 cursor-pointer"
              onClick={() => handleUserProfileClick(post.authorId)}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-background-dark flex items-center justify-center group-hover:opacity-80 transition-opacity">
                {post.authorProfileImageUrl ? (
                  <img
                    src={`${import.meta.env.VITE_API_URL}${post.authorProfileImageUrl}`}
                    alt={post.authorNickname}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-background-light dark:bg-background-dark rounded-full flex items-center justify-center">
                    <FaUserAlt className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  </div>
                )}
              </div>
              <span className="text-gray-600 dark:text-gray-400 group-hover:text-primary-light dark:group-hover:text-primary-dark group-hover:underline transition-colors">
                {post.authorNickname}
              </span>
            </div>
            <span className="text-gray-500 dark:text-gray-500">{getRelativeTime(post.createdAt.toString())}</span>
          </div>
          <div className="flex items-center gap-6 text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <FaEye className="h-4 w-4" />
              {post.viewCount.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <FaComment className="h-4 w-4" />
              {post.comments.length}
            </span>
          </div>
        </div>

        {/* 통계 정보 (모바일에서만 표시) */}
        <div className="flex items-center justify-end gap-6 text-gray-500 dark:text-gray-400 md:hidden">
          <span className="flex items-center gap-1">
            <FaEye className="h-4 w-4" />
            {post.viewCount.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <FaComment className="h-4 w-4" />
            {post.comments.length}
          </span>
        </div>
      </div>

      {/* 게시글 내용 */}
      <div className="bg-white dark:bg-[#292929] rounded-lg shadow-md p-6 mb-6 min-h-[300px] flex flex-col">
        <div
          className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-strong:text-gray-900 dark:prose-strong:text-white prose-code:text-gray-900 dark:prose-code:text-gray-200 prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600 prose-blockquote:text-gray-700 dark:prose-blockquote:text-gray-300 flex-1"
          style={{
            // 다크모드에서 텍스트 색상만 인버트 (배경은 유지)
            ...(theme === "dark" && {
              filter: "invert(1) hue-rotate(180deg)",
              backgroundColor: "transparent",
            }),
          }}
          dangerouslySetInnerHTML={{ __html: processContentForTheme(post.content) }}
        />

        {/* 좋아요와 공유 버튼 */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={handleLike}
            className={`px-6 py-3 border-2 rounded-lg flex items-center gap-2 transition-colors ${
              isLiked
                ? "border-red-500 dark:border-red-400 text-red-500 dark:text-red-400"
                : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-red-500 hover:text-red-500 dark:hover:border-red-400 dark:hover:text-red-400"
            }`}
          >
            <FaHeart
              className={`h-4 w-4 transition-all duration-300 ${
                isHeartAnimating ? "animate-bounce scale-125 text-red-500 dark:text-red-400" : ""
              }`}
            />
            좋아요 {post.likeCount}
          </button>
          <button
            onClick={handleShare}
            className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg flex items-center gap-2 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors active:border-gray-300 active:text-gray-600 dark:active:border-gray-600 dark:active:text-gray-400"
          >
            <FaShare className="h-4 w-4" />
            공유
          </button>
        </div>
      </div>

      {/* 댓글 섹션 */}
      <PostComment post={{ ...post, authorId: post.authorId }} setPost={setPost} />

      {/* 신고 모달 */}
      {isModalOpen && reportableType && reportableId && (
        <ReportModal
          isOpen={isModalOpen}
          onClose={closeModal}
          reportableType={reportableType}
          reportableId={reportableId}
          onReport={submitReport}
        />
      )}
    </div>
  );
};

export default PostPage;
