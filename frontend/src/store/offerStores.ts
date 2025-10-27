// src/store/offerStore.ts

import { create } from "zustand";
import apiClient from "../api/axios";
import { toast } from "sonner";
import type {
  CarrierDto,
  OfferModelDto,
  OfferRegionDto,
  OfferSearchRequest,
  OfferSearchResult,
} from "../../../shared/types";
import { SORT_ORDER, type OfferType, type SortOrder } from "../../../shared/constants";

interface OfferState {
  selectedRegions: OfferRegionDto[];
  selectedModels: OfferModelDto[];
  selectedCarriers: CarrierDto[];
  selectedOfferTypes: OfferType[];
  sortOrder: SortOrder;

  offerDatas: OfferSearchResult[];
  page: number;
  hasNextPage: boolean;
  loading: boolean;
}

interface OfferActions {
  setSelectedRegions: (regions: OfferRegionDto[]) => void;
  setSelectedModels: (models: OfferModelDto[]) => void;
  setSelectedCarriers: (carriers: CarrierDto[]) => void;
  setSelectedOfferTypes: (types: OfferType[]) => void;
  setSortOrder: (order: SortOrder) => void;
  resetFilters: () => void; // 여러 상태를 한번에 초기화하는 액션

  fetchOffers: (isNewSearch: boolean) => Promise<void>;
}

const initialState: OfferState = {
  selectedRegions: [],
  selectedModels: [],
  selectedCarriers: [],
  selectedOfferTypes: [],
  sortOrder: SORT_ORDER.DEFAULT,
  offerDatas: [],
  page: 1,
  hasNextPage: true,
  loading: false,
};

export const useOfferStore = create<OfferState & OfferActions>((set, get) => ({
  ...initialState,

  setSelectedRegions: (regions) => set({ selectedRegions: regions }),
  setSelectedModels: (models) => set({ selectedModels: models }),
  setSelectedCarriers: (carriers) => set({ selectedCarriers: carriers }),
  setSelectedOfferTypes: (types) => set({ selectedOfferTypes: types }),
  setSortOrder: (order) => set({ sortOrder: order }),

  resetFilters: () => {
    set(initialState);
  },

  fetchOffers: async (isNewSearch = false) => {
    const { loading, page, sortOrder, selectedRegions, selectedModels, selectedCarriers, selectedOfferTypes } = get();

    if (loading) return; // 중복 호출 방지
    set({ loading: true });

    // 새 검색이면 페이지 번호를 1로 초기화
    const currentPage = isNewSearch ? 1 : page;

    try {
      const params: OfferSearchRequest = {
        regions: selectedRegions,
        models: selectedModels,
        carriers: selectedCarriers,
        offerTypes: selectedOfferTypes,
        page: currentPage,
        limit: 20,
        sortOrder: sortOrder,
      };

      const response = await apiClient.post<{
        offers: OfferSearchResult[];
        hasNextPage: boolean;
      }>(`/offer/search`, params);

      const data = await response.data;

      set((state) => ({
        offerDatas: isNewSearch ? data.offers : [...state.offerDatas, ...data.offers],
        hasNextPage: data.hasNextPage,
        page: data.hasNextPage ? currentPage + 1 : currentPage,
      }));
    } catch (error) {
      console.error("Error searching offer datas:", error);
      toast.error("검색 과정에서 에러가 발생했습니다.");
    } finally {
      set({ loading: false });
    }
  },
}));
