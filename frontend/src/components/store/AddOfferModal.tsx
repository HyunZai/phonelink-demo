import React, { useState, useEffect } from "react";
import { FaTimes, FaChevronDown, FaCheck } from "react-icons/fa";
import { toast } from "sonner";
import { api } from "../../api/axios";
import CustomCheckbox from "../CustomCheckbox";
import { Combobox } from "@headlessui/react";

// 모델 선택을 위한 타입
interface ModelOption {
  id: number;
  name_ko: string;
  manufacturer_id: number;
}

// 용량 선택을 위한 타입
interface StorageOption {
  id: number;
  storage: string;
}

interface AddOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedModel: ModelOption, selectedStorages: StorageOption[]) => void;
  storeId: number;
}

const AddOfferModal: React.FC<AddOfferModalProps> = ({ isOpen, onClose, onConfirm, storeId }) => {
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelOption | null>(null);
  const [query, setQuery] = useState("");
  const [availableStorages, setAvailableStorages] = useState<StorageOption[]>([]);
  const [selectedStorages, setSelectedStorages] = useState<StorageOption[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingStorages, setIsLoadingStorages] = useState(false);

  // 필터링된 모델 목록
  const filteredModels =
    query === ""
      ? availableModels
      : availableModels.filter((model) => model.name_ko.toLowerCase().includes(query.toLowerCase()));

  // 모달이 열릴 때 사용 가능한 모델 목록 조회
  useEffect(() => {
    if (isOpen) {
      fetchAvailableModels();
    }
  }, [isOpen, storeId]);

  // 사용 가능한 모델 목록 조회
  const fetchAvailableModels = async () => {
    try {
      setIsLoadingModels(true);
      const response = await api.get<ModelOption[]>(`/store/${storeId}/available-models`);
      setAvailableModels(response);
    } catch (error) {
      console.error("사용 가능한 모델 조회 중 오류:", error);
      toast.error("모델 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoadingModels(false);
    }
  };

  // 선택된 모델의 사용 가능한 용량 목록 조회
  const fetchAvailableStorages = async (modelId: number) => {
    try {
      setIsLoadingStorages(true);
      const response = await api.get<StorageOption[]>(`/store/${storeId}/available-storages?modelId=${modelId}`);
      setAvailableStorages(response);
    } catch (error) {
      console.error("사용 가능한 용량 조회 중 오류:", error);
      toast.error("용량 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoadingStorages(false);
    }
  };

  // 모델 선택 핸들러 (Combobox용)
  const handleModelSelect = (model: ModelOption | null) => {
    if (model) {
      setSelectedModel(model);
      setSelectedStorages([]); // 모델 변경 시 선택된 용량 초기화
      setQuery(model.name_ko); // 선택된 모델명으로 쿼리 설정
      fetchAvailableStorages(model.id);
    } else {
      setSelectedModel(null);
      setSelectedStorages([]);
      setAvailableStorages([]);
      setQuery("");
    }
  };

  // 용량 체크박스 토글 핸들러
  const handleStorageToggle = (storage: StorageOption) => {
    setSelectedStorages((prev) => {
      const isSelected = prev.some((s) => s.id === storage.id);
      if (isSelected) {
        return prev.filter((s) => s.id !== storage.id);
      } else {
        return [...prev, storage];
      }
    });
  };

  // 확인 버튼 핸들러
  const handleConfirm = () => {
    if (!selectedModel) {
      toast.error("모델을 선택해주세요.");
      return;
    }
    if (selectedStorages.length === 0) {
      toast.error("최소 하나의 용량을 선택해주세요.");
      return;
    }
    onConfirm(selectedModel, selectedStorages);

    // state 초기화
    setSelectedModel(null);
    setQuery("");
    setSelectedStorages([]);
    setAvailableStorages([]);

    onClose();
  };

  // 모달 닫기 핸들러
  const handleClose = () => {
    setSelectedModel(null);
    setQuery("");
    setSelectedStorages([]);
    setAvailableStorages([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-background-dark rounded-lg p-6 w-full max-w-md mx-4">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-foreground-light dark:text-foreground-dark">모델 추가</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* 모델 선택 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground-light dark:text-foreground-dark mb-2">
            모델 선택
          </label>
          <Combobox value={selectedModel} onChange={handleModelSelect} disabled={isLoadingModels}>
            <div className="relative">
              <div className="relative w-full cursor-default overflow-hidden rounded-md border border-gray-300 dark:border-gray-500 bg-white dark:bg-background-dark text-left shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-light">
                <Combobox.Input
                  className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 dark:text-white bg-transparent focus:ring-0"
                  displayValue={(model: ModelOption) => model?.name_ko || ""}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={isLoadingModels ? "로딩 중..." : "모델을 검색하세요"}
                />
                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                  <FaChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                </Combobox.Button>
              </div>
              <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-background-dark py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {filteredModels.length === 0 && query !== "" ? (
                  <div className="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-300">
                    모델을 찾을 수 없습니다.
                  </div>
                ) : (
                  filteredModels.map((model) => (
                    <Combobox.Option
                      key={model.id}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                          active ? "bg-primary-light dark:bg-primary-dark text-white" : "text-gray-900 dark:text-white"
                        }`
                      }
                      value={model}
                    >
                      {({ selected, active }) => (
                        <>
                          <span className={`block truncate ${selected ? "font-medium" : "font-normal"}`}>
                            {model.name_ko}
                          </span>
                          {selected ? (
                            <span
                              className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                active ? "text-white" : "text-primary-light"
                              }`}
                            >
                              <FaCheck className="h-4 w-4" aria-hidden="true" />
                            </span>
                          ) : null}
                        </>
                      )}
                    </Combobox.Option>
                  ))
                )}
              </Combobox.Options>
            </div>
          </Combobox>
        </div>

        {/* 용량 선택 */}
        {selectedModel && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground-light dark:text-foreground-dark mb-2">
              용량 선택 (복수 선택 가능)
            </label>
            {isLoadingStorages ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">로딩 중...</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableStorages.map((storage) => {
                  const isSelected = selectedStorages.some((s) => s.id === storage.id);
                  return (
                    <CustomCheckbox
                      key={storage.id}
                      label={storage.storage}
                      checked={isSelected}
                      onChange={() => handleStorageToggle(storage)}
                      customStyle="text-sm flex-1 min-w-0"
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 구분선 */}
        <div className="border-t border-gray-200 dark:border-gray-500 mb-6"></div>

        {/* 버튼들 */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-md text-foreground-light dark:text-foreground-dark hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-primary-light dark:bg-primary-dark text-foreground-dark dark:text-foreground-light rounded-md hover:opacity-90 transition-opacity"
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddOfferModal;
