import React, { useState, useEffect } from "react";
import ThemeToggleButton from "./ThemeToggleButton";
import { IoMenuOutline, IoChevronDown } from "react-icons/io5";
import { FaUserAlt } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { ROLES } from "../../../shared/constants";
import { api } from "../api/axios";
import type { CategoryDto } from "../../../shared/post.types";

const Navbar: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const category = "tips";
  const [isCommunityDropdownOpen, setIsCommunityDropdownOpen] = useState(false);
  const [dropdownTimeout, setDropdownTimeout] = useState<NodeJS.Timeout | null>(null);
  const [communityMenuItems, setCommunityMenuItems] = useState<CategoryDto[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // 드롭다운 열기 (지연 없이)
  const handleDropdownEnter = () => {
    if (dropdownTimeout) {
      clearTimeout(dropdownTimeout);
      setDropdownTimeout(null);
    }
    setIsCommunityDropdownOpen(true);
  };

  // 드롭다운 닫기 (지연 있음)
  const handleDropdownLeave = () => {
    const timeout = setTimeout(() => {
      setIsCommunityDropdownOpen(false);
    }, 150); // 150ms 지연
    setDropdownTimeout(timeout);
  };

  // 커뮤니티 카테고리 조회
  useEffect(() => {
    const fetchCommunityCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const response = await api.get<CategoryDto[]>("/util/community-categories");
        if (response) setCommunityMenuItems(response);
      } catch (error) {
        console.error("커뮤니티 카테고리 조회 오류:", error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCommunityCategories();
  }, []);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (dropdownTimeout) {
        clearTimeout(dropdownTimeout);
      }
    };
  }, [dropdownTimeout]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-8 shadow-sm bg-background-light dark:shadow-[#404040] dark:shadow-sm  dark:bg-background-dark">
      <div className="flex items-center">
        <Link to="/">
          <button className="text-2xl font-bold mr-8 text-primary-light dark:text-primary-dark hover:opacity-80 transition-opacity">
            PhoneLink
          </button>
        </Link>
        <ul className="hidden md:flex gap-6">
          <li>
            <Link to="/offer">
              <button
                className={`text-base transition-colors text-foreground-light dark:text-foreground-dark hover:text-primary-light dark:hover:text-primary-dark`}
              >
                가격 비교
              </button>
            </Link>
          </li>
          {user?.role === ROLES.SELLER && user.storeId && (
            <li>
              <Link to={`/store/${user.storeId}`}>
                <button
                  className={`text-base transition-colors text-foreground-light dark:text-foreground-dark hover:text-primary-light dark:hover:text-primary-dark`}
                >
                  매장 관리
                </button>
              </Link>
            </li>
          )}
          <li>
            <Link to={`/${category}`}>
              <button
                className={`text-base transition-colors text-foreground-light dark:text-foreground-dark hover:text-primary-light dark:hover:text-primary-dark`}
              >
                정보
              </button>
            </Link>
          </li>
          <li className="relative">
            <div className="relative" onMouseEnter={handleDropdownEnter} onMouseLeave={handleDropdownLeave}>
              <button
                className={`text-base transition-colors text-foreground-light dark:text-foreground-dark hover:text-primary-light dark:hover:text-primary-dark flex items-center gap-1`}
              >
                커뮤니티
                <IoChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${isCommunityDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* 드롭다운 메뉴 */}
              {isCommunityDropdownOpen && (
                <div className="absolute top-full left-0 w-48 bg-white dark:bg-[#292929] rounded-lg shadow-lg border border-gray-200 dark:border-gray-500 py-2 z-50">
                  {isLoadingCategories ? (
                    <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">로딩 중...</div>
                  ) : (
                    communityMenuItems.map((item, index) => (
                      <Link
                        key={index}
                        to={`/${item.name.toLowerCase()}`}
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-primary-light dark:hover:bg-primary-dark hover:text-background-light dark:hover:text-background-dark transition-colors"
                        onClick={() => setIsCommunityDropdownOpen(false)}
                      >
                        {item.description}
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          </li>
          {user?.role === ROLES.ADMIN && (
            <li>
              <Link to="/admin">
                <button
                  className={`text-base transition-colors text-foreground-light dark:text-foreground-dark hover:text-primary-light dark:hover:text-primary-dark`}
                >
                  관리자
                </button>
              </Link>
            </li>
          )}
        </ul>
      </div>
      <div className="flex items-center gap-4">
        <ThemeToggleButton />
        {isAuthenticated ? (
          <Link to="/mypage">
            <div className="hidden md:flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer group">
              {/* 프로필 이미지 */}
              <div className="flex-shrink-0">
                {user?.profileImageUrl ? (
                  <img
                    src={`${import.meta.env.VITE_API_URL}${user.profileImageUrl}`}
                    alt="프로필"
                    className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 dark:bg-[#292929]">
                    <FaUserAlt className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  </div>
                )}
              </div>

              {/* 닉네임 */}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-24 group-hover:underline transition-all duration-200">
                {user?.nickname || "사용자"}
              </span>
            </div>
          </Link>
        ) : (
          <Link to="/login">
            <button className="hidden md:block px-4 py-2 rounded bg-primary-light hover:bg-[#3d5e33] dark:bg-primary-dark dark:hover:bg-[#759161] text-white dark:text-foreground-light text-base font-medium transition-colors">
              로그인
            </button>
          </Link>
        )}
        <button className="flex md:hidden items-center justify-center w-10 h-10 ml-2" aria-label="메뉴">
          <IoMenuOutline size={28}></IoMenuOutline>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
