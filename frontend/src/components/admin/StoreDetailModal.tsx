import React, { useEffect, useState } from "react";
import { HiX } from "react-icons/hi";
import {
  HiBuildingStorefront,
  HiMapPin,
  HiPhone,
  HiUser,
  HiLink,
  HiPhoto,
  HiMiniInformationCircle,
} from "react-icons/hi2";
import type { StoreRegisterFormData } from "../../../../shared/store.types";
import { api } from "../../api/axios";
import Swal from "sweetalert2";
import { useTheme } from "../../hooks/useTheme";
import { toast } from "sonner";

interface StoreDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: number;
}

const StoreDetailModal: React.FC<StoreDetailModalProps> = ({ isOpen, onClose, storeId }) => {
  const [storeDetail, setStoreDetail] = useState<StoreRegisterFormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const SERVER = import.meta.env.VITE_API_URL;
  const { theme } = useTheme();

  const handleConfirm = (approvalStatus: "APPROVED" | "REJECTED") => {
    Swal.fire({
      title: approvalStatus === "APPROVED" ? "승인하시겠습니까?" : "거부하시겠습니까?",
      icon: "question",
      showCancelButton: true,
      background: theme === "dark" ? "#343434" : "#fff",
      color: theme === "dark" ? "#e5e7eb" : "#1f2937",
      confirmButtonColor: theme === "dark" ? "#9DC183" : "#4F7942",
      cancelButtonColor: theme === "dark" ? "#F97171" : "#EF4444",
      confirmButtonText: approvalStatus === "APPROVED" ? "승인" : "거부",
      cancelButtonText: "취소",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.post(`/admin/store-confirm`, {
            storeId,
            approvalStatus,
            sellerId: storeDetail?.createdBy,
          });
          toast.success(approvalStatus === "APPROVED" ? "승인되었습니다." : "거부되었습니다.");
        } catch (error) {
          console.error("Error confirm store:", error);
          toast.error(
            approvalStatus === "APPROVED" ? "승인하는 중 오류가 발생했습니다." : "거부하는 중 오류가 발생했습니다.",
          );
        } finally {
          onClose();
        }
      }
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setStoreDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const handleSave = async () => {
    if (!storeDetail) return;

    try {
      await api.post(`/store/${storeId}/update`, storeDetail);
      setIsEditing(false);
      // 성공 메시지 표시
    } catch (error) {
      console.error("매장 정보 수정 실패:", error);
      // 에러 메시지 표시
    }
  };

  useEffect(() => {
    if (!isOpen || !storeId || storeId === -1) return;

    const fetchStoreDetail = async () => {
      setIsLoading(true);
      try {
        const response = await api.get<StoreRegisterFormData>(`/store/${storeId}/detail`);
        setStoreDetail(response);
      } catch (error) {
        console.error("매장 상세정보 조회 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStoreDetail();
  }, [isOpen, storeId]);

  if (!isOpen || !storeId || storeId === -1) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose} />
        <div
          className="relative bg-white dark:bg-[#292929] rounded-lg p-8 max-w-2xl w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-light dark:border-primary-dark"></div>
            <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">매장 정보를 불러오는 중...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!storeDetail) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose} />
        <div
          className="relative bg-white dark:bg-[#292929] rounded-lg p-8 max-w-2xl w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">매장 정보를 불러올 수 없습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white dark:bg-[#292929] rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-600">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">매장 등록 요청 상세정보</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <HiX className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-[1fr_auto_1fr] lg:gap-x-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* 매장명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <HiBuildingStorefront className="inline h-4 w-4 mr-1" />
                  매장명
                </label>
                <input
                  type="text"
                  name="name"
                  value={storeDetail.name || ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-background-dark dark:border-gray-500 dark:text-white disabled:cursor-not-allowed"
                  placeholder="매장명을 입력하세요"
                />
              </div>

              {/* 주소 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <HiMapPin className="inline h-4 w-4 mr-1" />
                  주소
                </label>
                <input
                  type="text"
                  name="address"
                  value={storeDetail.address || ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-background-dark dark:border-gray-500 dark:text-white disabled:cursor-not-allowed"
                  placeholder="주소를 입력하세요"
                />
              </div>

              {/* 상세주소 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <HiMapPin className="inline h-4 w-4 mr-1" />
                  상세주소
                </label>
                <input
                  type="text"
                  name="addressDetail"
                  value={storeDetail.addressDetail || ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-background-dark dark:border-gray-500 dark:text-white disabled:cursor-not-allowed"
                  placeholder="상세주소를 입력하세요"
                />
              </div>

              {/* 연락처 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <HiPhone className="inline h-4 w-4 mr-1" />
                  연락처
                </label>
                <input
                  type="text"
                  name="contact"
                  value={storeDetail.contact || ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-background-dark dark:border-gray-500 dark:text-white disabled:cursor-not-allowed"
                  placeholder="연락처를 입력하세요"
                />
              </div>

              {/* 대표자명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <HiUser className="inline h-4 w-4 mr-1" />
                  대표자명
                </label>
                <input
                  type="text"
                  name="ownerName"
                  value={storeDetail.ownerName || ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-background-dark dark:border-gray-500 dark:text-white disabled:cursor-not-allowed"
                  placeholder="대표자명을 입력하세요"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px bg-gray-200 dark:bg-background-dark" />

            {/* Right Column */}
            <div className="space-y-6">
              {/* 매장 대표 이미지 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <HiPhoto className="inline h-4 w-4 mr-1" />
                  매장 대표 이미지
                </label>
                <div className="px-3 py-2 bg-gray-50 dark:bg-background-dark rounded-md border border-gray-200 dark:border-gray-500">
                  {storeDetail.thumbnailUrl ? (
                    <div className="flex items-center justify-center">
                      <img
                        src={`${SERVER}${storeDetail.thumbnailUrl}`}
                        alt="매장 대표 이미지"
                        className="h-[119px] w-[119px] object-cover rounded-md"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">이미지 없음</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 소셜 링크 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <HiLink className="inline h-4 w-4 mr-1" />
                  소셜 링크
                </label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input
                    type="url"
                    name="link_1"
                    value={storeDetail.link_1 || ""}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-background-dark dark:border-gray-500 dark:text-white disabled:cursor-not-allowed"
                    placeholder="https://pf.kakao.com/example"
                  />
                  <input
                    type="url"
                    name="link_2"
                    value={storeDetail.link_2 || ""}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-background-dark dark:border-gray-500 dark:text-white disabled:cursor-not-allowed"
                    placeholder="https://blog.naver.com/example"
                  />
                </div>
              </div>

              {/* 매장 소개글 */}
              <div className="flex-1 flex flex-col">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <HiMiniInformationCircle className="inline h-4 w-4 mr-1" />
                  매장 소개글
                </label>
                <textarea
                  name="description"
                  value={storeDetail.description || ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-background-dark dark:border-gray-500 dark:text-white disabled:cursor-not-allowed resize-none"
                  placeholder=""
                  rows={5}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
            <div className="flex space-x-3">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors duration-200 font-medium"
              >
                {isEditing ? "취소" : "편집"}
              </button>
              {isEditing && (
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors duration-200 font-medium"
                >
                  저장
                </button>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => handleConfirm("REJECTED")}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors duration-200 font-medium"
              >
                거부
              </button>
              <button
                onClick={() => handleConfirm("APPROVED")}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors duration-200 font-medium"
              >
                승인
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreDetailModal;
