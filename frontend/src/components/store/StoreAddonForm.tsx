import { useEffect, useState } from "react";
import { Listbox } from "@headlessui/react";
import { FaTrashAlt, FaChevronDown } from "react-icons/fa";
import { FiAlertTriangle } from "react-icons/fi";
import type { AddonFormData, CarrierDto } from "../../../../shared/types";
import { api } from "../../api/axios";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { useTheme } from "../../hooks/useTheme";
import LoadingSpinner from "../LoadingSpinner";

const StoreAddonForm: React.FC<{ storeId: number; isEditable?: boolean }> = ({ storeId, isEditable = true }) => {
  const [carriers, setCarriers] = useState<CarrierDto[]>([]);
  const [addons, setAddons] = useState<AddonFormData[]>([
    {
      name: "",
      carrierId: 1,
      monthlyFee: 0,
      durationMonths: 0,
      penaltyFee: 0,
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const { theme } = useTheme();

  useEffect(() => {
    try {
      const fetchCarriers = async () => {
        const response = await api.get<CarrierDto[]>(`/phone/carriers`);
        setCarriers(response);
      };
      fetchCarriers();
    } catch (error) {
      console.error("Error fetching carriers:", error);
      toast.error("통신사 데이터을 불러오는 중 오류가 발생했습니다.");
    }
  }, []);

  useEffect(() => {
    try {
      const fetchAddons = async () => {
        const response = await api.get<AddonFormData[]>(`/store/${storeId}/addons`);
        if (response.length > 0) {
          setAddons(response);
          setShowWarning(false);
        } else {
          setAddons([
            {
              name: "",
              carrierId: 1,
              monthlyFee: 0,
              durationMonths: 0,
              penaltyFee: 0,
            },
          ]);
          setShowWarning(true);
        }
      };
      fetchAddons();
    } catch (error) {
      console.error("Error fetching addons:", error);
      toast.error("부가서비스 데이터을 불러오는 중 오류가 발생했습니다.");
    }
  }, []);

  // 숫자에 콤마 추가하는 함수
  const formatNumberWithComma = (value: number | string): string => {
    if (!value || value === 0) return "";
    const numValue = typeof value === "string" ? parseInt(value.replace(/,/g, ""), 10) : value;
    return numValue.toLocaleString();
  };

  // 콤마가 포함된 문자열을 숫자로 변환하는 함수
  const parseNumberFromCommaString = (value: string): number => {
    if (!value) return 0;
    return parseInt(value.replace(/,/g, ""), 10) || 0;
  };

  const handleAddonChange = (index: number, field: keyof AddonFormData, value: string | number | null) => {
    // 숫자 필드 길이 제한
    if (
      ["monthlyFee", "durationMonths", "penaltyFee"].includes(field) &&
      typeof value === "string" &&
      value.replace(/,/g, "").length > 6
    ) {
      return;
    }

    // 숫자 필드에 숫자가 아닌 값 입력 방지
    if (["monthlyFee", "durationMonths", "penaltyFee"].includes(field) && typeof value === "string") {
      // 콤마를 제거한 후 숫자인지 확인
      const numericValue = value.replace(/,/g, "");
      if (numericValue !== "" && !/^\d+$/.test(numericValue)) {
        return; // 숫자가 아닌 값은 입력 차단
      }
    }

    const newAddons = [...addons];
    let processedValue = value;

    // 숫자 필드인 경우 콤마 제거 후 숫자로 변환
    if (["monthlyFee", "durationMonths", "penaltyFee"].includes(field) && value) {
      if (typeof value === "string") {
        processedValue = parseNumberFromCommaString(value);
      } else {
        processedValue = Number(value);
      }
    }

    newAddons[index] = { ...newAddons[index], [field]: processedValue };
    setAddons(newAddons);
  };

  const addAddon = () => {
    setAddons([
      ...addons,
      {
        name: "",
        carrierId: 1,
        monthlyFee: 0,
        durationMonths: 0,
        penaltyFee: 0,
      },
    ]);
  };

  const removeAddon = (index: number) => {
    if (addons.length > 1) {
      setAddons(addons.filter((_, i) => i !== index));
    }
  };

  const handleAddonSave = () => {
    // 숫자 필드 유효성 검사
    const hasInvalidNumericFields = addons.some((addon) => {
      return (
        (addon.monthlyFee && (isNaN(addon.monthlyFee) || addon.monthlyFee < 0)) ||
        (addon.durationMonths && (isNaN(addon.durationMonths) || addon.durationMonths < 0)) ||
        (addon.penaltyFee && (isNaN(addon.penaltyFee) || addon.penaltyFee < 0))
      );
    });

    if (hasInvalidNumericFields) {
      Swal.fire({
        title: "입력 오류",
        text: "숫자 필드에는 숫자만 입력할 수 있습니다.",
        icon: "error",
        background: theme === "dark" ? "#343434" : "#fff",
        color: theme === "dark" ? "#e5e7eb" : "#1f2937",
        confirmButtonColor: theme === "dark" ? "#9DC183" : "#4F7942",
        confirmButtonText: "확인",
      });
      return;
    }

    const hasInvalidAddon = addons.some(
      (addon) =>
        addon.name.trim() === "" || // 이름이 비어있거나 공백만 있는지 확인
        addon.monthlyFee === 0 || // 월 요금이 0인지 확인
        addon.durationMonths === 0 || // 약정 기간이 0인지 확인
        addon.penaltyFee === 0, // 위약금이 0인지 확인
    );

    Swal.fire({
      title: hasInvalidAddon ? "입력값이 존재하지 않는 부가서비스가 존재합니다." : "저장하시겠습니까?",
      html: hasInvalidAddon ? "그래도 저장하시겠습니까?" : undefined,
      icon: hasInvalidAddon ? "warning" : "question",
      showCancelButton: true,
      background: theme === "dark" ? "#343434" : "#fff",
      color: theme === "dark" ? "#e5e7eb" : "#1f2937",
      confirmButtonColor: theme === "dark" ? "#9DC183" : "#4F7942",
      cancelButtonColor: theme === "dark" ? "#F97171" : "#EF4444",
      confirmButtonText: "저장",
      cancelButtonText: "취소",
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsSubmitting(true);
        try {
          await api.post(`/store/${storeId}/addon-save`, {
            addons,
          });
          setShowWarning(false); // 저장 성공 시 경고 메시지 숨김
          toast.success("저장되었습니다.");
        } catch (error) {
          console.error("Error saving addons:", error);
          toast.error("부가서비스를 저장하는 중 오류가 발생했습니다.");
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  return (
    <>
      <LoadingSpinner isVisible={isSubmitting} title="부가서비스 정보 저장 중" subtitle="잠시만 기다려주세요..." />
      <div className="p-4 sm:p-6 rounded-b-lg">
        {/* 경고 메시지 */}
        {showWarning && isEditable && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-400 dark:border-orange-500 p-4 rounded-md mb-4">
            <div className="flex items-start gap-3">
              <FiAlertTriangle className="w-5 h-5 text-orange-500 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                통신사별 부가서비스 정보를 입력하지 않으면 사용자들에게 제공되는 가격에 부가서비스 금액은 적용되지
                않습니다.
              </p>
            </div>
          </div>
        )}

        {/* 헤더 - 데스크톱에서만 표시 */}
        <div className="hidden lg:flex gap-3 px-2 text-center mb-4">
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">통신사</label>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">부가서비스명</label>
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">월 요금 (원)</label>
          </div>
          <div className="w-28">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">기간 (개월)</label>
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">추가 요금 (만원)</label>
          </div>
          <div className="w-8">{/* 삭제 버튼 공간 */}</div>
        </div>

        <div className="space-y-4">
          {addons.map((addon, index) => (
            <div key={index} className="border border-gray-200 dark:border-gray-500 rounded-lg p-4 sm:p-6">
              {/* 모바일/태블릿: 카드 형태, 데스크톱: 테이블 형태 */}
              <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                {/* 통신사 선택 */}
                <div className="w-full lg:w-32">
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 lg:hidden">
                    통신사
                  </label>
                  {isEditable ? (
                    <Listbox
                      value={carriers.find((carrier) => carrier.id === addon.carrierId) || null}
                      onChange={(carrier) => handleAddonChange(index, "carrierId", carrier?.id || null)}
                    >
                      <div className="relative">
                        <Listbox.Button className="relative w-full px-2 py-2 text-left text-sm sm:text-base border border-gray-300 rounded-md dark:bg-background-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-light cursor-default">
                          <span className="block truncate">
                            {carriers.find((carrier) => carrier.id === addon.carrierId)?.name || "통신사 선택"}
                          </span>
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <FaChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                          </span>
                        </Listbox.Button>
                        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-[#464646] py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          {carriers.map((carrier) => (
                            <Listbox.Option
                              key={carrier.id}
                              value={carrier}
                              className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-3 pr-9 ${
                                  active
                                    ? "bg-primary-light dark:bg-primary-dark text-white"
                                    : "text-gray-900 dark:text-gray-100"
                                }`
                              }
                            >
                              {({ selected }) => (
                                <span className={`block truncate ${selected ? "font-bold" : "font-normal"}`}>
                                  {carrier.name}
                                </span>
                              )}
                            </Listbox.Option>
                          ))}
                        </Listbox.Options>
                      </div>
                    </Listbox>
                  ) : (
                    <div className="w-full px-2 py-2 text-sm sm:text-base border border-gray-300 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {carriers.find((carrier) => carrier.id === addon.carrierId)?.name || "통신사 선택"}
                    </div>
                  )}
                </div>

                {/* 부가서비스명 */}
                <div className="flex-1 min-w-0">
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 lg:hidden">
                    부가서비스명
                  </label>
                  <input
                    type="text"
                    value={addon.name}
                    onChange={(e) => handleAddonChange(index, "name", e.target.value)}
                    placeholder="부가서비스명을 입력하세요"
                    className={`w-full px-2 py-2 text-sm sm:text-base border border-gray-300 rounded-md dark:bg-background-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-light ${!isEditable ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed" : ""}`}
                    disabled={!isEditable}
                  />
                </div>

                {/* 숫자 입력 필드들을 그룹화 */}
                <div className="flex flex-col gap-4 lg:flex-col xl:flex-row">
                  {/* 월 납부 요금 */}
                  <div className="w-full lg:w-32 xl:w-32">
                    <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 lg:hidden">
                      월 요금
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formatNumberWithComma(addon.monthlyFee)}
                        onChange={(e) => handleAddonChange(index, "monthlyFee", e.target.value)}
                        placeholder="0"
                        maxLength={7}
                        className={`w-full px-2 py-2 pr-8 text-sm sm:text-base border border-gray-300 rounded-md dark:bg-background-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-light ${!isEditable ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed" : ""}`}
                        disabled={!isEditable}
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
                        원
                      </span>
                    </div>
                  </div>

                  {/* 기간과 추가 요금을 같은 row에 배치 */}
                  <div className="flex flex-row gap-2 sm:flex-row sm:gap-4 lg:flex-col xl:flex-row">
                    {/* 유지 기간 */}
                    <div className="w-1/2 sm:w-32 lg:w-28 xl:w-28">
                      <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 lg:hidden">
                        기간
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={addon.durationMonths || ""}
                          onChange={(e) => handleAddonChange(index, "durationMonths", e.target.value)}
                          placeholder="0"
                          maxLength={2}
                          className={`w-full px-2 py-2 pr-8 text-sm sm:text-base border border-gray-300 rounded-md dark:bg-background-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-light ${!isEditable ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed" : ""}`}
                          disabled={!isEditable}
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
                          개월
                        </span>
                      </div>
                    </div>

                    {/* 미가입시 추가 요금 */}
                    <div className="w-1/2 sm:w-40 lg:w-32 xl:w-32">
                      <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 lg:hidden">
                        추가 요금
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={addon.penaltyFee || ""}
                          onChange={(e) => handleAddonChange(index, "penaltyFee", e.target.value)}
                          placeholder="0"
                          maxLength={2}
                          className={`w-full px-2 py-2 pr-8 text-sm sm:text-base border border-gray-300 rounded-md dark:bg-background-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-light ${!isEditable ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed" : ""}`}
                          disabled={!isEditable}
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
                          만원
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 삭제 버튼 - 편집 가능할 때만 표시 */}
                {isEditable && (
                  <div className="flex justify-center lg:justify-end">
                    <button
                      type="button"
                      onClick={() => removeAddon(index)}
                      className="flex items-center justify-center w-10 h-10 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="삭제"
                    >
                      <FaTrashAlt className="text-sm" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 부가서비스 추가 버튼 - 편집 가능할 때만 표시 */}
        {isEditable && (
          <div className="flex justify-center px-2 py-4">
            <button
              type="button"
              onClick={addAddon}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-md font-medium transition-colors"
            >
              + 부가서비스 추가
            </button>
          </div>
        )}

        {/* 저장 버튼 - 편집 가능할 때만 표시 */}
        {isEditable && (
          <div className="flex justify-center mt-4 pt-4">
            <button
              type="button"
              onClick={() => {
                handleAddonSave();
              }}
              className="w-full sm:w-auto px-6 py-3 sm:py-2 rounded-md bg-primary-light hover:bg-primary-dark dark:bg-primary-dark dark:hover:bg-primary-light text-white dark:text-foreground-light text-sm sm:text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light dark:focus:ring-primary-dark"
            >
              저장하기
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default StoreAddonForm;
