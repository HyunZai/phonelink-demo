import React, { useState, useEffect } from "react";
import type { OfferRegionDto } from "../../../../shared/types";
import CustomCheckbox from "../CustomCheckbox";
import { api } from "../../api/axios";
import { toast } from "sonner";

interface RegionSelectorProps {
  selectedRegions: OfferRegionDto[];
  onRegionsChange: (regions: OfferRegionDto[]) => void;
  lastSelectedSido: OfferRegionDto | null;
  setLastSelectedSido: (sido: OfferRegionDto | null) => void;
}

const RegionSelector: React.FC<RegionSelectorProps> = ({
  selectedRegions,
  onRegionsChange,
  lastSelectedSido,
  setLastSelectedSido,
}) => {
  const [sidoOptions, setSidoOptions] = useState<OfferRegionDto[]>([]);
  const [sigunguOptions, setSigunguOptions] = useState<OfferRegionDto[]>([]);

  // 시/도 지역 데이터 GET
  useEffect(() => {
    try {
      const fetchSidos = async () => {
        const response = await api.get<OfferRegionDto[]>(`/region/sidos`);
        setSidoOptions(response);
      };
      fetchSidos();
    } catch (error) {
      console.error("Error fetching sidos:", error);
      toast.error("시/도 지역 데이터를 불러오는 중 오류가 발생했습니다.");
    }
  }, []);

  // 시/도 지역 선택 시 구/군(하위 지역) 지역 데이터 GET
  useEffect(() => {
    try {
      const fetchSigungus = async () => {
        if (lastSelectedSido) {
          const sidoCode = lastSelectedSido?.code.substring(
            0,
            lastSelectedSido.code.substring(0, 2) === "36" ? 4 : 2, // 세종(36)은 다른 지역과 다르게 고유코드가 4임
          );
          const response = await api.get<OfferRegionDto[]>(`/region/sigungus`, {
            params: {
              sidoCode,
            },
          });
          const allOption: OfferRegionDto = {
            code: "-" + lastSelectedSido?.code,
            name: "전체",
          };
          setSigunguOptions([allOption, ...response]);
        }
      };
      fetchSigungus();
    } catch (error) {
      console.error("Error fetching sigungus:", error);
      toast.error("시/구/군 지역 데이터를 불러오는 중 오류가 발생했습니다.");
    }
  }, [lastSelectedSido]);

  const handleSubRegionChange = (clickedSigungu: OfferRegionDto) => {
    if (!lastSelectedSido) return;

    const sidoCode = lastSelectedSido.code;
    const isAll = clickedSigungu.code === "-" + sidoCode;

    const alreadyExists = selectedRegions.some((item) => item.code === clickedSigungu.code);

    const trimmedSidoCode = sidoCode.substring(
      0,
      lastSelectedSido.code.substring(0, 2) === "36" ? 4 : 2, // 세종(36)은 다른 지역과 다르게 고유코드가 4임
    );

    if (isAll) {
      // '전체'를 선택한 경우
      if (alreadyExists) {
        // 이미 '전체'가 선택되어 있다면 제거
        onRegionsChange(selectedRegions.filter((item) => item.code !== clickedSigungu.code));
      } else {
        // '전체'를 새로 선택한 경우, 같은 부모를 가진 다른 하위 지역들을 모두 제거하고 '전체'만 추가
        const others = selectedRegions.filter((item) => !item.code.startsWith(trimmedSidoCode));
        onRegionsChange([...others, clickedSigungu]);
      }
    } else if (alreadyExists) {
      // 이미 선택된 항목을 다시 클릭한 경우, 해당 항목을 제거합니다.
      // '전체' 항목도 함께 제거합니다.
      onRegionsChange(
        selectedRegions.filter((item) => item.code !== clickedSigungu.code && item.code !== "-" + sidoCode),
      );
    } else {
      // 새로운 하위 지역을 선택한 경우, '전체' 항목을 제거하고 새 항목을 추가합니다.
      const others = selectedRegions.filter((item) => item.code !== "-" + sidoCode);
      onRegionsChange([...others, clickedSigungu]);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="w-full md:w-1/4 max-h-60 overflow-y-auto custom-scrollbar border border-gray-300 dark:border-gray-400 rounded-md p-3 bg-white dark:bg-[#292929]">
        <div className="grid grid-cols-3 md:grid-cols-2 gap-2">
          {sidoOptions?.map((sido) => (
            <label key={sido.name} className="flex justify-center items-center cursor-pointer">
              <CustomCheckbox
                label={sido.name}
                checked={lastSelectedSido?.name === sido.name}
                onChange={() => setLastSelectedSido(sido)}
                customStyle="text-sm w-[81px]"
              />
            </label>
          ))}
        </div>
      </div>
      <div className="w-full md:w-3/4 max-h-60 overflow-y-auto custom-scrollbar border border-gray-300 dark:border-gray-400 rounded-md p-3 bg-white dark:bg-[#292929]">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {!lastSelectedSido ? (
            <div className="text-gray-400 text-xs">시/도를 먼저 선택하세요.</div>
          ) : !sigunguOptions ? (
            <span className="text-gray-400 text-xs">구/군 데이터 없음</span>
          ) : (
            sigunguOptions?.map((sigungu) => (
              <label key={sigungu.name} className="flex justify-center items-center cursor-pointer">
                <CustomCheckbox
                  label={sigungu.name}
                  checked={selectedRegions.some((item) => sigungu.code === item.code)}
                  onChange={() => handleSubRegionChange(sigungu)}
                  customStyle="text-sm w-[81px]"
                />
              </label>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RegionSelector;
