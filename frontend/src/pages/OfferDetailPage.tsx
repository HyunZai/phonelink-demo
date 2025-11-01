import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api/axios";
import { format } from "date-fns";
import type { OfferDetailFormData, AddonFormData } from "../../../shared/types";
import { FiExternalLink, FiMessageCircle, FiPhone, FiSmartphone, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { CARRIERS, OFFER_TYPES } from "../../../shared/constants";

const formatOfferType = (type?: string): string => {
  switch (type) {
    case OFFER_TYPES.MNP:
      return "번호이동";
    case OFFER_TYPES.CHG:
      return "기기변경";
    default:
      return type || "정보없음";
  }
};

const getOfferTypeBadgeColor = (offerType?: string) => {
  return offerType === OFFER_TYPES.MNP ? "bg-emerald-500 text-white" : "bg-amber-500 text-white";
};

// 링크 타입 감지 함수 (StorePage와 동일)
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

const getCarrierBadgeColor = (carrier?: string) => {
  switch (carrier) {
    case CARRIERS.KT:
      return "bg-[#5EDFDE] text-white";
    case CARRIERS.SKT:
      return "bg-[#3618CE] text-white";
    case CARRIERS.LG:
      return "bg-[#E2207E] text-white";
    default:
      return "bg-gray-400 text-white";
  }
};

const OfferDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [offerFormData, setOfferFormData] = useState<OfferDetailFormData | null>(null);
  const [addons, setAddons] = useState<AddonFormData[]>([]);
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<number>>(new Set());
  const [isAddonsOpen, setIsAddonsOpen] = useState(false);
  const [mvnoPlan, setMvnoPlan] = useState(30000);
  const [mnoPlan, setMnoPlan] = useState(45000);
  const [unlockedPrice, setUnlockedPrice] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  const kakaoLink = offerFormData?.storeLink_1?.toLowerCase().includes("kakao")
    ? offerFormData.storeLink_1
    : offerFormData?.storeLink_2?.toLowerCase().includes("kakao")
      ? offerFormData.storeLink_2
      : null;

  useEffect(() => {
    const fetchOfferData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Offer 상세 정보와 부가서비스 정보를 병렬로 조회
        const [offerResponse, addonsResponse] = await Promise.all([
          api.get<OfferDetailFormData>(`/offer/${id}`),
          api.get<AddonFormData[]>(`/offer/${id}/addon-info`),
        ]);

        setOfferFormData(offerResponse);
        setAddons(addonsResponse || []);

        // 초기에 모든 부가서비스 선택
        if (addonsResponse && addonsResponse.length > 0) {
          setSelectedAddonIds(new Set(addonsResponse.map((_, idx) => idx)));
        }

        if (offerResponse.unlockedPrice) {
          setUnlockedPrice(offerResponse.unlockedPrice);
        }
      } catch (err) {
        console.error("Error fetching offer data:", err);
        setError("판매 정보를 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchOfferData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl">데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (error || !offerFormData) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <p className="text-xl text-red-500">{error || "판매 정보를 찾을 수 없습니다."}</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-200 rounded-md">
          뒤로가기
        </button>
      </div>
    );
  }

  // 부가서비스 토글 함수
  const toggleAddon = (index: number) => {
    setSelectedAddonIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // 선택된 부가서비스 총 비용 계산
  const addonsTotalCost = addons.reduce((total, addon, index) => {
    if (selectedAddonIds.has(index)) {
      return total + addon.monthlyFee * addon.durationMonths;
    }
    return total;
  }, 0);

  // 선택되지 않은 부가서비스의 위약금(penaltyFee) 총합 계산
  const unselectedAddonsPenalty = addons.reduce((total, addon, index) => {
    if (!selectedAddonIds.has(index)) {
      return total + addon.penaltyFee * 10000; // 만원 단위 → 원 단위 변환
    }
    return total;
  }, 0);

  const selfPurchaseTotal = unlockedPrice + mvnoPlan * 24;
  const offerTotal =
    offerFormData.monthlyFee * 6 +
    mnoPlan * 18 +
    offerFormData.price! * 10000 +
    unselectedAddonsPenalty + // 미가입 부가서비스 위약금 추가
    addonsTotalCost;
  const difference = selfPurchaseTotal - offerTotal;

  const API_BASE_URL = import.meta.env.VITE_API_URL || "";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 mt-16">
      <div className="bg-white dark:bg-[#292929] rounded-lg shadow-lg p-6">
        <div className="flex flex-col items-center text-center sm:flex-row sm:text-left gap-6">
          <div className="w-36 flex-shrink-0">
            <div className="h-36 rounded-lg">
              {offerFormData.modelImageUrl ? (
                <img
                  src={`${API_BASE_URL}${offerFormData.modelImageUrl}`}
                  alt={offerFormData.modelName}
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <FiSmartphone className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>
            {offerFormData.modelReleaseDate && (
              <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                {format(offerFormData.modelReleaseDate, "yyyy.MM.dd")} 출시
              </p>
            )}
          </div>

          <div className="flex-1 w-full">
            <Link to={`/store/${offerFormData.storeId}`} className="w-fit block mx-auto sm:mx-0">
              <p className="font-medium text-md text-gray-500 dark:text-gray-400 hover:underline hover:text-primary-light dark:hover:text-primary-dark">
                {offerFormData.storeName}
              </p>
            </Link>

            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${getCarrierBadgeColor(offerFormData.carrierName)}`}
              >
                {offerFormData.carrierName}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${getOfferTypeBadgeColor(offerFormData.offerType)}`}
              >
                {formatOfferType(offerFormData.offerType)}
              </span>
            </div>

            <div className="mt-1 flex w-full flex-col items-center gap-y-2 sm:flex-row sm:flex-wrap sm:justify-between sm:items-baseline sm:gap-x-4">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{offerFormData.modelName}</h2>
              <p
                className={`text-4xl font-bold ${offerFormData?.price && offerFormData.price < 0 ? "text-red-500 dark:text-red-400" : "text-primary-light dark:text-primary-dark"}`}
              >
                {`${offerFormData?.price ?? "N/A"}만원`}
              </p>
            </div>
            {/* <div className="mt-3 flex flex-wrap justify-end items-baseline gap-x-4">
              <button
                onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
                className="flex items-center gap-2 py-2 px-4 bg-primary-light dark:bg-primary-dark text-background-light dark:text-background-dark hover:opacity-75 rounded-lg transition-colors text-sm"
              >
                유지비 계산해보기
                {isCalculatorOpen ? <FiChevronUp /> : <FiChevronDown />}
              </button>
            </div> */}
          </div>
        </div>

        <div className="mt-6 bg-gray-50 dark:bg-background-dark rounded-lg p-4">
          <div className="flex flex-col items-center justify-center gap-4 text-sm sm:flex-row sm:gap-x-8">
            {/* 출고가 */}
            <div className="text-center">
              <span className="text-gray-600 dark:text-gray-400">출고가: </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {offerFormData.retailPrice.toLocaleString("ko-KR")}원
              </span>
            </div>

            {/* 쿠팡 자급제 가격 + 바로가기 버튼 */}
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
              <div className="text-center">
                <span className="text-gray-600 dark:text-gray-400">쿠팡 자급제: </span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {offerFormData.unlockedPrice
                    ? `${offerFormData.unlockedPrice.toLocaleString("ko-KR")}원`
                    : "정보 없음"}
                </span>
              </div>
              {offerFormData.coupangLink && (
                <a
                  href={offerFormData.coupangLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 flex items-center justify-center gap-1 text-xs py-1 px-2 border border-gray-300 dark:border-gray-200 text-gray-700 dark:text-gray-300 rounded-md hover:bg-primary-light hover:text-background-light dark:hover:bg-primary-dark dark:hover:text-background-dark transition-colors"
                >
                  <FiExternalLink />
                  쿠팡 가격 확인해보기
                </a>
              )}
            </div>
          </div>
        </div>

        {/* 전화, 카카오톡 버튼 */}
        <div className="mt-4">
          {kakaoLink ? (
            <div className="grid grid-cols-2 gap-3">
              <a
                href={`tel:${offerFormData.storeContact}`}
                className="flex items-center justify-center gap-2 w-full text-center py-3 px-4 bg-primary-light dark:bg-primary-dark text-background-light dark:text-background-dark hover:opacity-75 rounded-lg transition-colors font-semibold"
              >
                <FiPhone />
                전화 문의
              </a>
              <a
                href={kakaoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full text-center py-3 px-4 bg-[#FAE202] text-black hover:opacity-75 rounded-lg transition-colors font-semibold"
              >
                <FiMessageCircle />
                카카오톡 채널
              </a>
            </div>
          ) : (
            <a
              href={`tel:${offerFormData.storeContact}`}
              className="flex items-center justify-center gap-2 w-full text-center py-3 px-4 bg-primary-light dark:bg-primary-dark text-background-light dark:text-background-dark hover:opacity-75 rounded-lg transition-colors font-semibold"
            >
              <FiPhone />
              전화 문의
            </a>
          )}
        </div>

        {/* {isCalculatorOpen && ( */}
        <div className="my-4 p-4 border border-gray-200 dark:border-gray-200 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-gray-200 dark:md:divide-gray-400">
            {/* --- 왼쪽: 자급제 구매 시 --- */}
            <div className="p-2 sm:p-4 flex flex-col h-full">
              <div>
                <h3 className="text-base font-semibold text-primary-light dark:text-primary-dark mb-4 text-center break-keep">
                  자급제 + 알뜰폰 요금제 24개월 사용
                </h3>
                <div className="space-y-2 text-gray-700 dark:text-gray-300">
                  <div className="flex justify-between items-center">
                    <p className="text-sm">자급제 기기값</p>
                    <div className="flex items-center max-w-[115px] border-b">
                      <input
                        type="text"
                        value={unlockedPrice.toLocaleString("ko-KR")}
                        onChange={(e) => {
                          const value = Number(e.target.value.replace(/[^0-9]/g, ""));
                          setUnlockedPrice(isNaN(value) ? 0 : value);
                        }}
                        className="w-full bg-transparent p-1 text-right font-semibold focus:outline-none focus:ring-0 border-0"
                      />
                      <span className="text-sm text-gray-500 dark:text-gray-400">원</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm">알뜰 요금제 (24개월)</p>
                    <div className="flex items-center gap-2">
                      <span>+</span>
                      <div className="flex items-center max-w-[90px] border-b">
                        <input
                          type="text"
                          value={mvnoPlan.toLocaleString("ko-KR")}
                          onChange={(e) => {
                            const value = Number(e.target.value.replace(/[^0-9]/g, ""));
                            setMvnoPlan(isNaN(value) ? 0 : value);
                          }}
                          className="w-full bg-transparent p-1 text-right font-semibold focus:outline-none focus:ring-0 border-0"
                        />
                        <span className="text-sm text-gray-500 dark:text-gray-400">원</span>
                      </div>
                      <span className="font-mono">x 24</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-auto">
                <hr className="my-3 border-gray-300 dark:border-gray-200" />
                <div className="flex justify-between items-baseline">
                  <p className="font-bold text-lg text-gray-800 dark:text-gray-200">총</p>
                  <p className="font-bold text-2xl text-gray-800 dark:text-gray-200">
                    {(unlockedPrice + mvnoPlan * 24).toLocaleString("ko-KR")}원
                  </p>
                </div>
              </div>
            </div>

            {/* --- 오른쪽: 해당 조건 구매 시 --- */}
            <div className="p-2 sm:p-4 mt-4 md:mt-0 border-t md:border-t-0 border-gray-200 dark:border-gray-700 flex flex-col h-full">
              <div>
                <h3 className="text-base font-semibold text-primary-light dark:text-primary-dark mb-4 text-center break-keep">
                  해당 구매 조건으로 개통 시
                </h3>
                <div className="space-y-2 text-gray-700 dark:text-gray-300">
                  <div className="flex justify-between items-center">
                    <p className="text-sm">필수 요금제 (6개월)</p>
                    <p className="font-mono">{offerFormData.monthlyFee.toLocaleString("ko-KR")}원 x 6</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm">변경 요금제 (18개월)</p>
                    <div className="flex items-center gap-2">
                      <span>+</span>
                      <div className="flex items-center max-w-[90px] border-b">
                        <input
                          type="text"
                          value={mnoPlan.toLocaleString("ko-KR")}
                          onChange={(e) => {
                            const value = Number(e.target.value.replace(/[^0-9]/g, ""));
                            setMnoPlan(isNaN(value) ? 0 : value);
                          }}
                          className="w-full bg-transparent p-1 text-right font-semibold focus:outline-none focus:ring-0 border-0"
                        />
                        <span className="text-sm text-gray-500 dark:text-gray-400">원</span>
                      </div>
                      <span className="font-mono">x 18</span>
                    </div>
                  </div>
                  {addons.length > 0 && (
                    <div className="space-y-1">
                      <div
                        className="flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded transition-colors"
                        onClick={() => setIsAddonsOpen(!isAddonsOpen)}
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            부가서비스 ({addons.filter((_, i) => selectedAddonIds.has(i)).length}/{addons.length}개)
                          </p>
                          <span className="text-xs text-gray-500 dark:text-gray-400 hover:underline">
                            {isAddonsOpen ? "닫기" : "상세보기"}
                          </span>
                          {isAddonsOpen ? (
                            <FiChevronUp className="w-4 h-4 text-gray-500" />
                          ) : (
                            <FiChevronDown className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                        <p className="font-mono">+ {addonsTotalCost.toLocaleString("ko-KR")}원</p>
                      </div>

                      {isAddonsOpen && (
                        <div className="ml-4 space-y-1.5 border-l-2 border-gray-200 dark:border-gray-600 pl-3 py-1">
                          {addons.map((addon, index) => (
                            <label
                              key={index}
                              className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 p-1.5 rounded transition-colors group"
                            >
                              <input
                                type="checkbox"
                                checked={selectedAddonIds.has(index)}
                                onChange={() => toggleAddon(index)}
                                className="mt-0.5 w-4 h-4 accent-primary-light dark:accent-primary-dark rounded cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                                    {addon.name}
                                  </span>
                                  <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                    {(addon.monthlyFee * addon.durationMonths).toLocaleString("ko-KR")}원
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {addon.monthlyFee.toLocaleString("ko-KR")}원 × {addon.durationMonths}개월
                                  </span>
                                  {addon.penaltyFee > 0 && (
                                    <span className="text-xs text-orange-500 dark:text-orange-400">
                                      미가입 시 +{(addon.penaltyFee * 10000).toLocaleString("ko-KR")}원
                                    </span>
                                  )}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    {offerFormData.price! < 0 ? (
                      <>
                        <p className="text-sm">개통 시 지원금 (페이백)</p>
                        <p className="font-mono text-red-500 dark:text-red-400">
                          - {Math.abs(offerFormData.price! * 10000).toLocaleString("ko-KR")}원
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm">개통 시 기기값 (선납)</p>
                        <p className="font-mono text-blue-500 dark:text-blue-400">
                          + {(offerFormData.price! * 10000).toLocaleString("ko-KR")}원
                        </p>
                      </>
                    )}
                  </div>
                  {unselectedAddonsPenalty > 0 && (
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-orange-600 dark:text-orange-400">부가서비스 미가입 추가금액</p>
                      <p className="font-mono text-orange-600 dark:text-orange-400">
                        + {unselectedAddonsPenalty.toLocaleString("ko-KR")}원
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-auto">
                <hr className="my-3 border-gray-300 dark:border-gray-200" />
                <div className="flex justify-between items-baseline">
                  <p className="font-bold text-lg text-gray-800 dark:text-gray-200">총</p>
                  <p className="font-bold text-2xl text-gray-800 dark:text-gray-200">
                    {offerTotal.toLocaleString("ko-KR")}원
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6">
            {difference > 0 && (
              <div className="bg-blue-50 dark:bg-background-dark/50 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center justify-center gap-4 text-center">
                <div>
                  <p className="font-semibold text-blue-800 dark:text-blue-200">
                    자급제 + 알뜰폰 조합보다{" "}
                    <span className="text-2xl font-bold">{difference.toLocaleString("ko-KR")}원</span> 더 저렴해요!
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">(24개월 총 유지비 기준)</p>
                </div>
              </div>
            )}
            {difference < 0 && (
              <div className="bg-orange-50 dark:bg-background-dark/50 border border-orange-200 dark:border-orange-800 rounded-lg p-4 flex items-center justify-center gap-4 text-center">
                <div>
                  <p className="font-semibold text-orange-800 dark:text-orange-200">
                    자급제 + 알뜰폰 조합이{" "}
                    <span className="text-2xl font-bold">{Math.abs(difference).toLocaleString("ko-KR")}원</span> 더
                    저렴해요.
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">(24개월 총 유지비 기준)</p>
                </div>
              </div>
            )}
            {difference === 0 && (
              <div className="bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
                <p className="font-semibold text-gray-700 dark:text-gray-300">
                  두 조건의 24개월 총 유지비가 동일합니다.
                </p>
              </div>
            )}
          </div>
          <div className="mt-6 text-red-400">
            * 부가적인 조건에 따라 실제 유지비는 다를 수 있습니다. 정확한 가격 및 구매 조건은 해당 매장에 문의해주세요.
          </div>
        </div>
        {/* )} */}

        <hr className="my-8 border-gray-200 dark:border-gray-700" />

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">판매처 정보</h3>
          <div className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex flex-col sm:flex-row sm:justify-between">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-1/4">판매처</span>
              <Link to={`/store/${offerFormData.storeId}`}>
                <span className="font-semibold text-gray-900 dark:text-gray-100 sm:text-right hover:underline hover:text-primary-light dark:hover:text-primary-dark">
                  {offerFormData.storeName}
                </span>
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-1/4">주소</span>
              <a
                href={`https://map.naver.com/p/search/${offerFormData.storeName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-gray-900 dark:text-gray-100 sm:text-right  hover:underline hover:text-primary-light dark:hover:text-primary-dark"
              >
                {offerFormData.storeAddress}
              </a>
            </div>
            {offerFormData.storeContact && (
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-1/4">연락처</span>
                <a
                  href={`tel:${offerFormData.storeContact}`}
                  className="font-semibold text-gray-900 dark:text-gray-100 hover:underline sm:text-right  hover:text-primary-light dark:hover:text-primary-dark"
                >
                  {offerFormData.storeContact}
                </a>
              </div>
            )}
            {(offerFormData.storeLink_1 || offerFormData.storeLink_2) && (
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-1/4">소셜 링크</span>
                <div className="flex flex-wrap gap-2 sm:justify-end sm:w-3/4">
                  {offerFormData.storeLink_1 &&
                    (() => {
                      const linkInfo = getLinkInfo(offerFormData.storeLink_1);
                      return (
                        <a
                          href={offerFormData.storeLink_1}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${linkInfo.color}`}
                        >
                          <span>{linkInfo.label}</span>
                          <FiExternalLink className="ml-1.5 w-3.5 h-3.5" />
                        </a>
                      );
                    })()}
                  {offerFormData.storeLink_2 &&
                    (() => {
                      const linkInfo = getLinkInfo(offerFormData.storeLink_2);
                      return (
                        <a
                          href={offerFormData.storeLink_2}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${linkInfo.color}`}
                        >
                          <span>{linkInfo.label}</span>
                          <FiExternalLink className="ml-1.5 w-3.5 h-3.5" />
                        </a>
                      );
                    })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferDetailPage;
