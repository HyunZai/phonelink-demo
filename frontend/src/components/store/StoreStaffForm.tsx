import React, { useState, useEffect, useContext } from "react";
import { FaPhone, FaEnvelope, FaUserAlt } from "react-icons/fa";
import Swal from "sweetalert2";
import { api } from "../../api/axios";
import { ThemeContext } from "../../context/ThemeContext";
import type { StoreStaffData } from "../../../../shared/types";
import { toast } from "sonner";

interface StoreStaffFormProps {
  storeId: number;
  isEditable?: boolean;
}

const StoreStaffForm: React.FC<StoreStaffFormProps> = ({ storeId }) => {
  const [staffMembers, setStaffMembers] = useState<StoreStaffData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || "light";

  // Swal 알림창 스타일 설정
  const getSwalConfig = (isDark: boolean) => ({
    background: isDark ? "#343434" : "#fff",
    color: isDark ? "#e5e7eb" : "#1f2937",
    confirmButtonColor: isDark ? "#9DC183" : "#4F7942",
    cancelButtonColor: isDark ? "#F97171" : "#EF4444",
  });

  // 직원 상태 변경 처리 (승인/퇴사 통합)
  const handleStaffStatusChange = async (
    userId: number,
    newStatus: "ACTIVE" | "INACTIVE",
    successMessage: string,
    errorMessage: string,
  ) => {
    try {
      await api.post("store/update-staff-status", { storeId, userId, newStatus });
      // 로컬 상태 업데이트
      setStaffMembers((prev) =>
        prev.map((staff) => (staff.userId === userId ? { ...staff, storeStatus: newStatus } : staff)),
      );

      toast.success(successMessage);
    } catch (error) {
      console.error(errorMessage, error);
      toast.error(errorMessage);
    }
  };

  // 직원 카드 클릭 핸들러
  const handleStaffCardClick = (staff: StoreStaffData) => {
    const { systemStatus, storeStatus, userId } = staff;

    // 승인 대기 상태
    if (systemStatus === "ACTIVE" && storeStatus === "PENDING") {
      Swal.fire({
        title: "승인하시겠습니까?",
        text: "승인 시, 해당 사용자에게 매장 관리 권한이 부여됩니다.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "승인",
        cancelButtonText: "취소",
        ...getSwalConfig(theme === "dark"),
      }).then((result) => {
        if (result.isConfirmed) {
          handleStaffStatusChange(
            userId,
            "ACTIVE",
            "직원이 성공적으로 승인되었습니다.",
            "직원 승인 중 오류가 발생했습니다:",
          );
        }
      });
    }
    // 재직 중 상태
    else if (systemStatus === "ACTIVE" && storeStatus === "ACTIVE") {
      Swal.fire({
        title: "퇴사 처리하시겠습니까?",
        text: "퇴사 시, 해당 사용자에게 매장 관리 권한이 해제됩니다.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "퇴사 처리",
        cancelButtonText: "취소",
        ...getSwalConfig(theme === "dark"),
      }).then((result) => {
        if (result.isConfirmed) {
          handleStaffStatusChange(
            userId,
            "INACTIVE",
            "직원이 성공적으로 퇴사 처리되었습니다.",
            "직원 퇴사 처리 중 오류가 발생했습니다:",
          );
        }
      });
    }
  };

  useEffect(() => {
    const fetchStaffMembers = async () => {
      try {
        setIsLoading(true);
        const response = await api.get<StoreStaffData[]>(`/store/${storeId}/staffs`);
        setStaffMembers(response);
      } catch (error) {
        console.error("직원 목록 조회 중 오류가 발생했습니다:", error);
        // 에러 처리 로직 추가 가능 (예: 토스트 메시지, 에러 상태 설정 등)
      } finally {
        setIsLoading(false);
      }
    };
    fetchStaffMembers();
  }, []);

  // 상태별 스타일과 텍스트
  const getStatusInfo = (systemStatus: string, storeStatus: string) => {
    // systemStatus 우선 처리
    if (systemStatus === "SUSPENDED") {
      return {
        text: "이용 정지",
        style: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
      };
    }

    if (systemStatus === "WITHDRAWN") {
      return {
        text: "탈퇴한 사용자",
        style: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300",
      };
    }

    // systemStatus가 ACTIVE인 경우 storeStatus에 따라 처리
    if (systemStatus === "ACTIVE") {
      switch (storeStatus) {
        case "PENDING":
          return {
            text: "승인 대기중",
            style: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
          };
        case "REJECTED":
          return {
            text: "승인 거절",
            style: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
          };
        case "ACTIVE":
          return {
            text: "재직 중",
            style: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
          };
        case "INACTIVE":
          return {
            text: "퇴사",
            style: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300",
          };
        default:
          return {
            text: "알 수 없음",
            style: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300",
          };
      }
    }

    // 기본값
    return {
      text: "알 수 없음",
      style: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300",
    };
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-light dark:border-primary-dark mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 dark:text-gray-400">직원 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">직원 관리</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">매장 직원 정보를 관리합니다.</p>
        </div>
      </div>

      {/* 직원 목록 */}
      <div className="space-y-4">
        {staffMembers.length === 0 ? (
          <div className="text-center py-12">
            <FaUserAlt className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-lg text-gray-500 dark:text-gray-400">등록된 직원이 없습니다.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {staffMembers.map((staff) => {
              const isClickable =
                (staff.systemStatus === "ACTIVE" && staff.storeStatus === "PENDING") ||
                (staff.systemStatus === "ACTIVE" && staff.storeStatus === "ACTIVE");

              return (
                <div
                  key={staff.userId}
                  onClick={() => isClickable && handleStaffCardClick(staff)}
                  className={`bg-background-light dark:bg-background-dark border border-gray-200 dark:border-gray-500 rounded-lg p-4 sm:p-6 lg:p-4 transition-all ${
                    isClickable
                      ? "hover:shadow-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      : "hover:shadow-md"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* 직원 기본 정보 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4 lg:mb-0">
                        {/* 프로필 이미지 */}
                        <div className="flex-shrink-0">
                          {staff.profileImageUrl ? (
                            <img
                              src={`${import.meta.env.VITE_API_URL}${staff.profileImageUrl}`}
                              alt={staff.name}
                              className="w-16 h-16 lg:w-12 lg:h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-500"
                            />
                          ) : (
                            <div className="w-16 h-16 lg:w-12 lg:h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-200 dark:border-gray-600">
                              <FaUserAlt className="w-8 h-8 lg:w-6 h-6 text-gray-400 dark:text-gray-500" />
                            </div>
                          )}
                        </div>

                        {/* 직원 정보 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 lg:mb-1">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-2">
                              <div className="flex items-center gap-2">
                                <h4 className="text-lg lg:text-base font-semibold text-gray-900 dark:text-white">
                                  {staff.name}
                                </h4>
                                {/* 모바일에서만 상태 배지 표시 */}
                                <span className="lg:hidden">
                                  <span
                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusInfo(staff.systemStatus, staff.storeStatus).style}`}
                                  >
                                    {getStatusInfo(staff.systemStatus, staff.storeStatus).text}
                                  </span>
                                </span>
                              </div>
                              {staff.nickname && (
                                <span className="text-sm lg:text-xs text-gray-500 dark:text-gray-400">
                                  {staff.nickname}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 lg:gap-2 text-sm lg:text-xs">
                            <div className="flex items-center gap-2">
                              <FaEnvelope className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-900 dark:text-white truncate">{staff.email}</span>
                            </div>
                            {staff.phoneNumber && (
                              <div className="flex items-center gap-2">
                                <FaPhone className="w-3 h-3 text-gray-400" />
                                <span className="text-gray-900 dark:text-white">{staff.phoneNumber}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 상태 표시 - 큰 화면에서만 표시 */}
                    <div className="hidden lg:flex flex-shrink-0">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusInfo(staff.systemStatus, staff.storeStatus).style}`}
                      >
                        {getStatusInfo(staff.systemStatus, staff.storeStatus).text}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreStaffForm;
