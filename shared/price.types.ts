import { OfferType } from "./constants";

/**
 * 엑셀 파일에서 파싱된 개별 가격 정보
 */
export interface PriceInput {
  storeId: number;
  model: string;
  capacity: string;
  carrier: string;
  buyingType: OfferType;
  typePrice: number;
}

/**
 * 엑셀 파일과 함께 제출되는 부가서비스 정보
 */
export interface Addon {
  name: string;
  carrier: string;
  monthlyFee: number;
  requiredDuration: number;
  penaltyFee: number;
}

/**
 * 시세 입력을 위해 서버로 전송되는 전체 데이터 구조
 */
export interface PriceSubmissionData {
  priceInputs: PriceInput[];
  addons: Addon[];
}
