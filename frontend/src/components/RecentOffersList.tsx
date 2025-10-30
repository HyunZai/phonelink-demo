import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { OfferSearchResult } from "../../../shared/types";
import { CARRIERS, OFFER_TYPES } from "../../../shared/constants";
import { api } from "../api/axios";
import { toast } from "sonner";
import { ClipLoader } from "react-spinners";

const RecentOffersList: React.FC = () => {
  const [latestOffers, setLatestOffers] = useState<OfferSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestOffers = async () => {
      try {
        setLoading(true);
        const response = await api.get<OfferSearchResult[]>("/offer/latest");
        setLatestOffers(response);
      } catch (error) {
        console.error("Error fetching latest offers:", error);
        toast.error("최근 등록 조건을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchLatestOffers();
  }, []);

  // 통신사별 색상 설정
  const getCarrierBadgeColor = (carrier: string) => {
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

  // 개통방식별 색상 설정
  const getOfferTypeBadgeColor = (offerType: string) => {
    return offerType === OFFER_TYPES.MNP ? "bg-emerald-500 text-white" : "bg-amber-500 text-white";
  };

  // 개통방식 표시 텍스트 변환
  const getOfferTypeText = (offerType: string) => {
    return offerType === OFFER_TYPES.MNP ? "번호이동" : "기기변경";
  };

  return (
    <div className="h-full">
      <div className="bg-white dark:bg-[#292929] rounded-lg shadow-lg p-4 flex flex-col h-full">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">최근 등록</h2>
          <Link to="/offer" className="text-sm text-primary-light dark:text-primary-dark hover:underline font-medium">
            더보기
          </Link>
        </div>

        {/* 시세 리스트 */}
        {loading ? (
          <div className="flex justify-center items-center flex-1">
            <ClipLoader color="#4F7942" size={40} aria-label="Loading Spinner" data-testid="loader" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 flex-1">
            {latestOffers.map((offer) => (
              <Link
                key={offer.id}
                to={`/offer/${offer.id}`}
                className="block p-2 sm:p-3 bg-gray-50 dark:bg-[#1f1f1f] rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors duration-200 border border-gray-200 dark:border-gray-500 hover:border-primary-light dark:hover:border-primary-dark h-full"
              >
                <div className="flex flex-col items-center text-center space-y-1 sm:space-y-1.5 h-full justify-between">
                  {/* 썸네일 */}
                  <div className="w-12 h-12 sm:w-12 sm:h-16 flex items-center justify-center flex-shrink-0">
                    <img
                      src={`${import.meta.env.VITE_API_URL}${offer.imageUrl}`}
                      alt={offer.modelName}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>

                  {/* 통신사, 개통방식 뱃지 */}
                  <div className="flex flex-wrap justify-center gap-1">
                    <span
                      className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-semibold ${getCarrierBadgeColor(
                        offer.carrierName,
                      )}`}
                    >
                      {offer.carrierName}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-semibold ${getOfferTypeBadgeColor(
                        offer.offerType,
                      )}`}
                    >
                      {getOfferTypeText(offer.offerType)}
                    </span>
                  </div>

                  {/* 지역명 */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-full">{offer.regionName}</p>

                  {/* 모델명 */}
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight line-clamp-2">
                    {offer.modelName}
                  </h3>

                  {/* 가격 */}
                  <p
                    className={`text-sm sm:text-base font-bold ${
                      offer.price !== null && offer.price !== undefined && (offer.price < 0 || offer.price === 0)
                        ? "text-red-500 dark:text-red-400"
                        : "text-primary-light dark:text-primary-dark"
                    }`}
                  >
                    {offer.price + (offer.price && offer.price !== 0 ? "만원" : "원")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentOffersList;
