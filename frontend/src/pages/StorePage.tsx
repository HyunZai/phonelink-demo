import { useEffect, useState, useRef } from "react";
import ExcelUpload from "../components/store/ExcelUpload";
import StoreAddonForm from "../components/store/StoreAddonForm";
import StoreOfferPriceForm from "../components/store/StoreOfferPriceForm";
import { useParams } from "react-router-dom";
import StoreReqPlanForm from "../components/store/StoreReqPlanForm";
import { api } from "../api/axios";
import axios from "axios";
import type { StoreDto, StoreRegisterFormData, DaumPostcodeData } from "../../../shared/types";
import {
  FiMapPin,
  FiPhone,
  FiExternalLink,
  FiHome,
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiSave,
  FiX,
} from "react-icons/fi";
import { FaStar, FaRegStar } from "react-icons/fa";
import { useAuthStore } from "../store/authStore";
import { ROLES } from "../../../shared/constants";
import { toast } from "sonner";
import StoreStaffForm from "../components/store/StoreStaffForm";
import AddressSearchButton from "../components/AddressSearchButton";

const StorePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"prices" | "excel" | "addon" | "requiredPlan" | "staff">("prices");
  const { storeId: storeIdString } = useParams<{ storeId: string }>();
  const { user } = useAuthStore();

  // 1. 매장 정보, 로딩, 에러 상태 추가
  const [store, setStore] = useState<StoreDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedStore, setEditedStore] = useState<StoreRegisterFormData | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [tempAddress, setTempAddress] = useState({
    address: "",
    addressDetail: "",
    regionCode: "",
  });
  const addressDetailRef = useRef<HTMLInputElement>(null);

  // 사용자 권한 확인
  const isSeller = user?.role === ROLES.SELLER;
  const parsedStoreId = parseInt(storeIdString || "0", 10);
  const userStoreId = user?.storeId ? parseInt(String(user.storeId), 10) : null;
  const isStoreStaff = isSeller && (userStoreId === parsedStoreId || String(user?.storeId) === String(parsedStoreId));

  // 즐겨찾기 토글 함수
  const toggleFavorite = async () => {
    try {
      const response = await api.post<boolean>(`/store/favorite`, { userId: user?.id, storeId: storeId });
      setIsFavorite(response);
    } catch (error) {
      console.error(error);
      toast.error("처리 중 오류가 발생했습니다.");
    }
  };

  // 편집 모드 진입
  const handleEditClick = () => {
    if (store) {
      const formData: StoreRegisterFormData = {
        name: store.name,
        description: store.description,
        regionCode: store.regionCode,
        address: store.address,
        addressDetail: store.addressDetail,
        contact: store.contact,
        thumbnailUrl: store.thumbnailUrl,
        link_1: store.link_1,
        link_2: store.link_2,
        ownerName: store.ownerName,
        approvalStatus: store.approvalStatus,
        createdBy: store.createdBy,
      };
      setEditedStore(formData);
      setIsEditMode(true);
    }
  };

  // 편집 취소
  const handleCancelEdit = () => {
    setEditedStore(null);
    setIsEditMode(false);
  };

  // 편집 저장
  const handleSaveEdit = async () => {
    if (!editedStore || !storeId) {
      toast.error("수정할 정보가 없습니다.");
      return;
    }

    try {
      // 백엔드 API 호출
      const response = await api.post(`/store/${storeId}/edit-info`, {
        editedStore,
      });

      // 서버에서 받은 업데이트된 매장 정보로 상태 업데이트
      if (response.data) {
        setStore(response.data);
      } else {
        // 응답에 data가 없으면 로컬 상태 병합
        setStore({
          ...store!,
          ...editedStore,
        });
      }

      setIsEditMode(false);
      toast.success("매장 정보가 수정되었습니다.");
    } catch (error) {
      console.error("매장 정보 수정 오류:", error);
      if (axios.isAxiosError(error) && error.response) {
        toast.error(error.response.data.message || "매장 정보 수정 중 오류가 발생했습니다.");
      } else {
        toast.error("매장 정보 수정 중 오류가 발생했습니다.");
      }
    }
  };

  // 편집 중인 매장 정보 변경
  const handleInputChange = (field: keyof StoreRegisterFormData, value: string) => {
    if (editedStore) {
      setEditedStore({
        ...editedStore,
        [field]: value,
      });
    }
  };

  // 주소 변경 모달 열기
  const handleAddressModalOpen = () => {
    setTempAddress({
      address: editedStore?.address || "",
      addressDetail: editedStore?.addressDetail || "",
      regionCode: editedStore?.regionCode || "",
    });
    setIsAddressModalOpen(true);
  };

  // 주소 변경 모달 닫기
  const handleAddressModalClose = () => {
    setIsAddressModalOpen(false);
    setTempAddress({
      address: "",
      addressDetail: "",
      regionCode: "",
    });
  };

  // 다음 주소 검색 완료 핸들러
  const handleAddressComplete = (data: DaumPostcodeData) => {
    let fullAddress = data.address;
    let extraAddress = "";

    if (data.addressType === "R") {
      if (data.bname !== "") {
        extraAddress += data.bname;
      }
      if (data.buildingName !== "") {
        extraAddress += extraAddress !== "" ? `, ${data.buildingName}` : data.buildingName;
      }
      fullAddress += extraAddress !== "" ? ` (${extraAddress})` : "";
    }

    setTempAddress((prev) => ({
      ...prev,
      address: fullAddress,
      regionCode: data.sigunguCode ? `${data.sigunguCode}00000` : prev.regionCode,
    }));

    // 상세 주소 필드로 포커스 이동
    addressDetailRef.current?.focus();
  };

  // 주소 변경 저장
  const handleAddressSave = () => {
    if (editedStore) {
      setEditedStore({
        ...editedStore,
        address: tempAddress.address,
        addressDetail: tempAddress.addressDetail,
        regionCode: tempAddress.regionCode,
      });
    }
    handleAddressModalClose();
    toast.success("주소가 변경되었습니다.");
  };

  // 링크 타입 감지 함수
  const getLinkInfo = (url: string) => {
    if (url.includes("blog.naver")) {
      return {
        label: "네이버 블로그",
        color:
          "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30",
      };
    } else if (url.includes("band.us")) {
      return {
        label: "네이버 밴드",
        color:
          "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30",
      };
    } else if (url.includes("kakao")) {
      return {
        label: "카카오 채널",
        color:
          "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30",
      };
    } else if (url.includes("youtube")) {
      return {
        label: "유튜브",
        color: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30",
      };
    } else {
      return {
        label: "링크",
        color:
          "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30",
      };
    }
  };

  // storeId를 숫자로 변환
  const storeId = storeIdString ? parseInt(storeIdString, 10) : null;

  // 즐겨찾기 상태 조회
  useEffect(() => {
    const fetchFavorite = async () => {
      const response = await api.get<boolean>(`/store/favorite`, { params: { userId: user?.id, storeId: storeId } });
      setIsFavorite(response);
    };
    fetchFavorite();
  }, []);

  useEffect(() => {
    // storeId가 유효하지 않으면 API 호출 중단
    if (!storeId) {
      setError("잘못된 접근입니다. 매장 ID가 없습니다.");
      setIsLoading(false);
      return;
    }

    const fetchStoreData = async () => {
      setIsLoading(true); // 데이터 fetching 시작 시 로딩 상태로 설정
      try {
        const response = await api.get<StoreDto>(`/store/${storeId}/detail`);
        setStore(response); // data 객체 안의 data를 사용
        setError(null); // 이전 에러 상태 초기화
      } catch (err) {
        setError("매장 정보를 불러오는 데 실패했습니다.");
        console.error(err);
      } finally {
        setIsLoading(false); // 성공/실패 여부와 관계없이 로딩 상태 해제
      }
    };

    fetchStoreData();
  }, [storeId]); // storeId가 변경될 때마다 effect 재실행

  // 2. 로딩 및 에러 상태에 따른 UI 렌더링
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8 mt-16">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-light dark:border-primary-dark mx-auto mb-4"></div>
            <p className="text-lg text-gray-600 dark:text-gray-400">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8 mt-16">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <p className="text-lg sm:text-xl text-red-500 dark:text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!store || !storeId) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8 mt-16">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">🏪</div>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400">매장 정보를 찾을 수 없습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8 mt-16">
      {/* 매장 헤더 섹션 */}
      <div className="bg-white dark:bg-[#292929] rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 relative">
        {/* Edit 버튼 (우측 상단) */}
        {isStoreStaff && (
          <div className="absolute top-4 right-4">
            {!isEditMode ? (
              <button
                onClick={handleEditClick}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary-light dark:hover:text-primary-dark hover:bg-gray-100 dark:hover:bg-background-dark rounded-md transition-colors"
                title="매장 정보 수정"
              >
                <FiEdit2 className="w-4 h-4" />
                <span>수정</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-background-dark rounded-md transition-colors"
                  title="취소"
                >
                  <FiX className="w-4 h-4" />
                  <span className="hidden sm:inline">취소</span>
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary-light dark:text-background-dark dark:bg-primary-dark hover:opacity-90 rounded-md transition-opacity"
                  title="저장"
                >
                  <FiSave className="w-4 h-4" />
                  <span>저장</span>
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-4 lg:space-x-6">
          {/* 매장 썸네일 */}
          <div className="flex-shrink-0 w-full sm:w-auto flex justify-center sm:justify-start">
            {isEditMode ? (
              <button
                type="button"
                onClick={() => {
                  // TODO: 이미지 업로드 로직 구현
                  toast.info("기능 준비 중입니다.");
                }}
                className="relative w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-600 group cursor-pointer"
              >
                {editedStore?.thumbnailUrl ? (
                  <img
                    src={`${import.meta.env.VITE_API_URL}${editedStore.thumbnailUrl}`}
                    alt={editedStore.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <FiHome className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 text-gray-400 dark:text-gray-500" />
                  </div>
                )}
                {/* Hover 오버레이 */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                  <span className="text-white text-xs sm:text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    변경하기
                  </span>
                </div>
              </button>
            ) : (
              <>
                {store.thumbnailUrl ? (
                  <img
                    src={`${import.meta.env.VITE_API_URL}${store.thumbnailUrl}`}
                    alt={store.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-600"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-200 dark:border-gray-600">
                    <FiHome className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 text-gray-400 dark:text-gray-500" />
                  </div>
                )}
              </>
            )}
          </div>

          {/* 매장 기본 정보 */}
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-2 sm:mb-3">
              {isEditMode ? (
                <input
                  type="text"
                  value={editedStore?.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-primary-light dark:border-primary-dark focus:outline-none w-full sm:w-1/2"
                  placeholder="매장명"
                />
              ) : (
                <>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 dark:text-white break-words">
                    {store.name}
                  </h1>
                  {/* 즐겨찾기 별 아이콘 (편집 모드 아닐 때만 표시) */}
                  <button
                    onClick={toggleFavorite}
                    className="flex-shrink-0 p-2 rounded-full transition-colors duration-200"
                    title={isFavorite ? "즐겨찾기에서 제거" : "즐겨찾기에 추가"}
                  >
                    {isFavorite ? (
                      <FaStar className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-yellow-500 hover:text-yellow-600 transition-colors duration-200" />
                    ) : (
                      <FaRegStar className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-gray-400 hover:text-yellow-500 transition-colors duration-200" />
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Description 섹션 */}
            {(store.description || isEditMode) && (
              <div className="mb-4 sm:mb-6">
                <div className="bg-gray-50 dark:bg-background-dark rounded-lg p-3 sm:p-4">
                  {isEditMode ? (
                    <textarea
                      value={editedStore?.description || ""}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      className="w-full text-sm sm:text-base text-gray-600 dark:text-gray-300 bg-transparent border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark min-h-[80px]"
                      placeholder="매장 소개글을 입력하세요"
                    />
                  ) : (
                    <>
                      <p
                        className={`text-sm sm:text-base text-gray-600 dark:text-gray-300 ${!isDescriptionExpanded ? "line-clamp-2" : "whitespace-pre-wrap"}`}
                      >
                        {store.description}
                      </p>
                      {store.description && store.description.length > 100 && (
                        <div className="flex justify-center mt-3">
                          <button
                            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                            className="flex items-center space-x-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                          >
                            {isDescriptionExpanded ? (
                              <>
                                <span>접기</span>
                                <FiChevronUp className="w-3 h-3 sm:w-4 sm:h-4" />
                              </>
                            ) : (
                              <>
                                <span>펼치기</span>
                                <FiChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 매장 상세 정보 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              {/* 주소 */}
              <div className="flex items-start space-x-2 sm:space-x-3">
                <FiMapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">주소</p>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white break-words">
                    {isEditMode ? editedStore?.address : store.address}
                    {isEditMode
                      ? editedStore?.addressDetail && ` ${editedStore.addressDetail}`
                      : store.addressDetail && ` ${store.addressDetail}`}
                    {isEditMode && (
                      <button
                        onClick={handleAddressModalOpen}
                        className="ml-2 text-xs sm:text-sm text-primary-light dark:text-primary-dark hover:underline whitespace-nowrap"
                      >
                        주소 변경
                      </button>
                    )}
                  </p>
                </div>
              </div>

              {/* 연락처 */}
              <div className="flex items-start space-x-2 sm:space-x-3">
                <FiPhone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">연락처</p>
                  {isEditMode ? (
                    <input
                      type="tel"
                      value={editedStore?.contact || ""}
                      onChange={(e) => handleInputChange("contact", e.target.value)}
                      className="w-full text-sm sm:text-base text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-primary-light dark:focus:border-primary-dark"
                      placeholder="연락처"
                    />
                  ) : (
                    <a
                      href={`tel:${store.contact}`}
                      className="text-sm sm:text-base text-primary-light dark:text-primary-dark hover:underline transition-colors break-all"
                    >
                      {store.contact}
                    </a>
                  )}
                </div>
              </div>

              {/* 소셜 링크 */}
              {(store.link_1 || store.link_2 || isEditMode) && (
                <div className="flex items-start space-x-2 sm:space-x-3 sm:col-span-2 lg:col-span-1">
                  <FiExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">소셜 링크</p>
                    {isEditMode ? (
                      <div className="space-y-2 mt-1">
                        <input
                          type="url"
                          value={editedStore?.link_1 || ""}
                          onChange={(e) => handleInputChange("link_1", e.target.value)}
                          className="w-full text-xs sm:text-sm text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-primary-light dark:focus:border-primary-dark"
                          placeholder="링크 1 (예: 카카오톡 채널)"
                        />
                        <input
                          type="url"
                          value={editedStore?.link_2 || ""}
                          onChange={(e) => handleInputChange("link_2", e.target.value)}
                          className="w-full text-xs sm:text-sm text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-primary-light dark:focus:border-primary-dark"
                          placeholder="링크 2 (예: 네이버 블로그)"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                        {store.link_1 &&
                          (() => {
                            const linkInfo = getLinkInfo(store.link_1);
                            return (
                              <a
                                href={store.link_1}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${linkInfo.color}`}
                              >
                                <span>{linkInfo.label}</span>
                              </a>
                            );
                          })()}
                        {store.link_2 &&
                          (() => {
                            const linkInfo = getLinkInfo(store.link_2);
                            return (
                              <a
                                href={store.link_2}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${linkInfo.color}`}
                              >
                                <span>{linkInfo.label}</span>
                              </a>
                            );
                          })()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#292929] rounded-lg shadow-lg p-0 mb-0">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold p-4 sm:p-6 text-foreground-light dark:text-foreground-dark">
          판매 정보
        </h2>
        <div className="border-b border-gray-200 dark:border-background-dark">
          <nav className="-mb-px flex flex-wrap gap-2 sm:gap-4 lg:gap-6 px-3 sm:px-6 overflow-x-auto" aria-label="Tabs">
            <button
              className={`shrink-0 border-b-2 py-3 sm:py-4 px-2 text-sm sm:text-base font-semibold transition-colors duration-200 focus:outline-none whitespace-nowrap ${activeTab === "prices" ? "border-primary-light dark:border-primary-dark text-primary-light dark:text-primary-dark" : "border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"}`}
              onClick={() => setActiveTab("prices")}
            >
              시세표
            </button>
            <button
              className={`shrink-0 border-b-2 py-3 sm:py-4 px-2 text-sm sm:text-base font-semibold transition-colors duration-200 focus:outline-none whitespace-nowrap ${activeTab === "requiredPlan" ? "border-primary-light dark:border-primary-dark text-primary-light dark:text-primary-dark" : "border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"}`}
              onClick={() => setActiveTab("requiredPlan")}
            >
              요금제
            </button>
            <button
              className={`shrink-0 border-b-2 py-3 sm:py-4 px-2 text-sm sm:text-base font-semibold transition-colors duration-200 focus:outline-none whitespace-nowrap ${activeTab === "addon" ? "border-primary-light dark:border-primary-dark text-primary-light dark:text-primary-dark" : "border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"}`}
              onClick={() => setActiveTab("addon")}
            >
              부가서비스
            </button>
            {/* 엑셀 업로드 탭은 판매자에게만 표시 */}
            {isStoreStaff && (
              <>
                <button
                  className={`shrink-0 border-b-2 py-3 sm:py-4 px-2 text-sm sm:text-base font-semibold transition-colors duration-200 focus:outline-none whitespace-nowrap ${activeTab === "excel" ? "border-primary-light dark:border-primary-dark text-primary-light dark:text-primary-dark" : "border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"}`}
                  onClick={() => setActiveTab("excel")}
                >
                  <span className="hidden sm:inline">엑셀 파일 업로드</span>
                  <span className="sm:hidden">엑셀 업로드</span>
                </button>
                <button
                  className={`shrink-0 border-b-2 py-3 sm:py-4 px-2 text-sm sm:text-base font-semibold transition-colors duration-200 focus:outline-none whitespace-nowrap ${activeTab === "staff" ? "border-primary-light dark:border-primary-dark text-primary-light dark:text-primary-dark" : "border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"}`}
                  onClick={() => setActiveTab("staff")}
                >
                  직원 관리
                </button>
              </>
            )}
          </nav>
        </div>
        <div className="min-h-[400px]">
          {activeTab === "prices" && <StoreOfferPriceForm storeId={storeId} isEditable={isStoreStaff} />}
          {activeTab === "requiredPlan" && <StoreReqPlanForm storeId={storeId} isEditable={isStoreStaff} />}
          {activeTab === "addon" && <StoreAddonForm storeId={storeId} isEditable={isStoreStaff} />}
          {activeTab === "excel" && isStoreStaff && (
            <div className="p-4 sm:p-6">
              <ExcelUpload />
            </div>
          )}
          {activeTab === "staff" && isStoreStaff ? (
            <StoreStaffForm storeId={storeId} isEditable={isStoreStaff} />
          ) : null}
        </div>
      </div>

      {/* 주소 변경 모달 */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#292929] rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="sticky top-0 bg-white dark:bg-[#292929] border-b border-gray-200 dark:border-gray-500 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">주소 변경</h2>
              <button
                onClick={handleAddressModalClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="px-6 py-4 space-y-4">
              {/* 기본 주소 */}
              <div>
                <label
                  htmlFor="modal-address"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  기본 주소
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    id="modal-address"
                    value={tempAddress.address}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md bg-gray-50 dark:bg-background-dark text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
                    placeholder="주소 검색 버튼을 클릭하세요"
                  />
                  <AddressSearchButton onAddressComplete={handleAddressComplete} />
                </div>
              </div>

              {/* 상세 주소 */}
              <div>
                <label
                  htmlFor="modal-addressDetail"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  상세 주소
                </label>
                <input
                  type="text"
                  id="modal-addressDetail"
                  ref={addressDetailRef}
                  value={tempAddress.addressDetail}
                  onChange={(e) =>
                    setTempAddress((prev) => ({
                      ...prev,
                      addressDetail: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-background-dark text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
                  placeholder="상세 주소를 입력하세요"
                />
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="sticky bottom-0 bg-white dark:bg-[#292929] border-t border-gray-200 dark:border-gray-500 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={handleAddressModalClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAddressSave}
                disabled={!tempAddress.address}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-light dark:bg-primary-dark dark:text-background-dark hover:opacity-90 rounded-md transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorePage;
