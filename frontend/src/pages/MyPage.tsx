import React, { useState, useEffect } from "react";
import { api } from "../api/axios";
import { toast } from "sonner";
import type { UserDto, UserUpdateData } from "../../../shared/types";
import { useAuthStore } from "../store/authStore";
import { useTheme } from "../hooks/useTheme";
import Swal from "sweetalert2";
import { FaUserAlt } from "react-icons/fa";
import { FiEdit3, FiMessageSquare, FiLink, FiStar, FiChevronRight } from "react-icons/fi";
import ProfileEditModal from "../components/mypage/ProfileEditModal";
import PostsModal from "../components/mypage/PostsModal";
import CommentsModal from "../components/mypage/CommentsModal";
import SocialModal from "../components/mypage/SocialModal";
import FavoritesModal from "../components/mypage/FavoritesModal";

// 마이페이지 메뉴 타입 정의
type MyPageMenu =
  | "posts" // 내가 쓴 글
  | "comments" // 내가 쓴 댓글
  | "social" // 소셜계정 관리
  | "favorites"; // 관심 매장

// 메뉴 목록 정의
const MENU_ITEMS = [
  {
    id: "posts" as MyPageMenu,
    label: "내가 쓴 글",
    icon: FiEdit3,
    description: "작성한 게시글을 확인하세요",
    hoverColor: "group-hover:text-blue-500",
  },
  {
    id: "comments" as MyPageMenu,
    label: "댓글 단 글",
    icon: FiMessageSquare,
    description: "댓글을 작성한 게시글을 확인하세요",
    hoverColor: "group-hover:text-green-500",
  },
  {
    id: "social" as MyPageMenu,
    label: "소셜계정 관리",
    icon: FiLink,
    description: "연동된 계정을 관리하세요",
    hoverColor: "group-hover:text-purple-500",
  },
  {
    id: "favorites" as MyPageMenu,
    label: "관심 매장",
    icon: FiStar,
    description: "즐겨찾기한 매장을 확인하세요",
    hoverColor: "group-hover:text-yellow-500",
  },
];

const MyPage: React.FC = () => {
  const { user, withdrawal, logout } = useAuthStore();
  const { theme } = useTheme();

  // 모달 상태 관리
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [activeModal, setActiveModal] = useState<MyPageMenu | null>(null);

  const [formData, setFormData] = useState<(UserDto & { storeId?: number }) | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof UserUpdateData | "passwordConfirm" | "storeId", string>>>(
    {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return;

      try {
        const userId = user?.id;
        const response = await api.get<UserDto & { storeId?: number }>("/user/profile", {
          params: { userId },
        });

        setFormData(response);
      } catch (error) {
        toast.error("사용자 정보를 불러오는 중 오류가 발생했습니다.");
        console.error("User data fetch error:", error);
      }
    };
    fetchUserData();
  }, []);

  const handleWithdrawal = async () => {
    if (!user) {
      toast.error("사용자 정보를 찾을 수 없습니다.");
      return;
    }

    Swal.fire({
      html: "정말로 탈퇴하시겠습니까?",
      icon: "warning",
      showCancelButton: true,
      background: theme === "dark" ? "#343434" : "#fff",
      color: theme === "dark" ? "#e5e7eb" : "#1f2937",
      confirmButtonColor: theme === "dark" ? "#9DC183" : "#4F7942",
      cancelButtonColor: theme === "dark" ? "#F97171" : "#EF4444",
      confirmButtonText: "탈퇴",
      cancelButtonText: "취소",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await withdrawal(user);
          toast.success("회원 탈퇴가 완료되었습니다.");
        } catch (error: any) {
          toast.error(error.message || "회원 탈퇴 중 오류가 발생했습니다.");
        }
      }
    });
  };

  const handleMenuClick = (menuId: MyPageMenu) => {
    setActiveModal(menuId);
  };

  const closeModal = () => {
    setActiveModal(null);
    setShowProfileEdit(false);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark pt-20 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* 로그아웃 버튼 */}
          <div className="flex justify-end mb-2 mr-2">
            <button
              onClick={() => logout()}
              className="text-sm text-gray-600 dark:text-gray-400 underline hover:text-primary-light dark:hover:text-primary-dark transition-colors duration-200"
            >
              로그아웃
            </button>
          </div>

          {/* 사용자 프로필 섹션 */}
          <div
            className="bg-white dark:bg-[#292929] rounded-lg shadow-md p-6 mb-6 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-200 group"
            onClick={() => setShowProfileEdit(true)}
          >
            <div className="flex items-center space-x-4">
              {/* 프로필 이미지 */}
              <div className="flex-shrink-0">
                {formData?.profileImageUrl ? (
                  <img
                    src={`${import.meta.env.VITE_API_URL}${formData.profileImageUrl}`}
                    alt="프로필"
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <FaUserAlt className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 dark:text-gray-500" />
                  </div>
                )}
              </div>

              {/* 사용자 정보 */}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">
                  {formData?.nickname || "닉네임 없음"}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{formData?.email || "이메일 없음"}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">계정 정보 수정하기</p>
              </div>

              {/* 화살표 아이콘 */}
              <div className="flex-shrink-0">
                <FiChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:translate-x-1 transition-all duration-200" />
              </div>
            </div>
          </div>

          {/* 구분선 */}
          <div className="border-t border-gray-200 dark:border-gray-600 mb-6"></div>

          {/* 메뉴 목록 */}
          <div className="space-y-3">
            {MENU_ITEMS.map((item) => {
              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-[#292929] rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group"
                  onClick={() => handleMenuClick(item.id)}
                >
                  <div className="flex items-center space-x-4">
                    {/* 아이콘 */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-hover:bg-opacity-80 transition-all duration-200">
                        <item.icon
                          className={`w-6 h-6 text-gray-600 dark:text-gray-400 ${item.hoverColor} transition-colors duration-200`}
                        />
                      </div>
                    </div>

                    {/* 메뉴 정보 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-200">
                        {item.label}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200">
                        {item.description}
                      </p>
                    </div>

                    {/* 화살표 아이콘 */}
                    <div className="flex-shrink-0">
                      <FiChevronRight
                        className={`w-5 h-5 text-gray-400 dark:text-gray-500 ${item.hoverColor} transition-colors duration-200`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 모달들 */}
      <ProfileEditModal
        isOpen={showProfileEdit}
        onClose={closeModal}
        formData={formData}
        setFormData={setFormData}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        passwordConfirm={passwordConfirm}
        setPasswordConfirm={setPasswordConfirm}
        errors={errors}
        setErrors={setErrors}
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
        user={user}
        handleWithdrawal={handleWithdrawal}
      />

      <PostsModal isOpen={activeModal === "posts"} onClose={closeModal} />
      <CommentsModal isOpen={activeModal === "comments"} onClose={closeModal} />
      <SocialModal isOpen={activeModal === "social"} onClose={closeModal} />
      <FavoritesModal isOpen={activeModal === "favorites"} onClose={closeModal} />
    </div>
  );
};

export default MyPage;
