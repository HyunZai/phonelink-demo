import { Dialog, Transition } from "@headlessui/react";
import { format } from "date-fns";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, type FieldErrors } from "react-hook-form";
import type { PhoneDetailFormData, PhoneManufacturerDto, PhoneStorageDto } from "../../../../shared/phone.types";
import { api } from "../../api/axios";
import CustomCheckbox from "../CustomCheckbox";
import ImageUpload from "../ImageUpload";
import { toast } from "sonner";

interface ModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneModelData?: PhoneDetailFormData | null;
  onSave: () => void;
}

const ModelModal: React.FC<ModelModalProps> = ({ isOpen, onClose, phoneModelData, onSave }) => {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
    watch,
  } = useForm<PhoneDetailFormData>({
    defaultValues: useMemo(
      () =>
        phoneModelData || {
          storages: [],
        },
      [phoneModelData],
    ),
    criteriaMode: "all",
  });
  const [manufacturers, setManufacturers] = useState<PhoneManufacturerDto[]>([]);
  const [allStorages, setAllStorages] = useState<PhoneStorageDto[]>([]);

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "storages",
  });
  const fetchStorages = async () => {
    try {
      const result = await api.get<PhoneStorageDto[]>("/phone/allStorages");
      setAllStorages(result);
    } catch (err) {
      console.error(err);
      toast.error("용량 정보를 불러오는 데 실패했습니다.");
    }
  };

  const fetchManufacturers = async () => {
    try {
      const result = await api.get<PhoneManufacturerDto[]>("/phone/manufacturers");
      setManufacturers(result);
    } catch (error) {
      toast.error("제조사 정보를 불러오는 데 실패했습니다.");
      console.error(error);
    }
  };

  useEffect(() => {
    fetchManufacturers();
    fetchStorages();
  }, []);

  useEffect(() => {
    if (phoneModelData) {
      const formattedData = {
        ...phoneModelData,
        releaseDate: phoneModelData.releaseDate ? format(new Date(phoneModelData.releaseDate), "yyyy-MM-dd") : "",
      };
      reset(formattedData as any);
      replace(phoneModelData.storages || []);
    } else {
      reset({
        modelName_ko: "",
        modelName_en: "",
        manufacturerId: manufacturers[0]?.id || 0,
        imageUrl: "",
        releaseDate: format(new Date(), "yyyy-MM-dd") as any,
        storages: [],
      });
      replace([]);
    }
  }, [phoneModelData, reset, manufacturers, replace]);

  const watchedStorages = watch("storages", []);

  const formatPrice = (value: number | string | undefined | null): string => {
    if (value === undefined || value === null || value === "" || isNaN(Number(value))) return "";
    const num = String(value).replace(/,/g, "");
    if (isNaN(Number(num)) || num === "") return "";
    return Number(num).toLocaleString("ko-KR");
  };

  const handleStorageChange = (storage: PhoneStorageDto) => {
    const index = watchedStorages.findIndex((s) => s.storage === storage.storage);
    if (index > -1) {
      const fieldIndex = fields.findIndex((field) => field.storage === storage.storage);
      if (fieldIndex > -1) remove(fieldIndex);
    } else {
      append({
        id: storage.id,
        storage: storage.storage,
        devices: [
          {
            retailPrice: null as any,
            unlockedPrice: null as any,
            coupangLink: "",
          },
        ],
      });
    }
  };

  const selectedStorageIds = useMemo(() => {
    return watchedStorages.map((s) => s.id);
  }, [watchedStorages]);

  const onValid = async (data: PhoneDetailFormData) => {
    if (data.storages.length === 0) {
      toast.error("하나 이상의 용량을 선택해주세요.");
      return;
    }
    try {
      await api.post(`/admin/phone-detail/${data.modelId}`, data);
      toast.success("저장되었습니다!");
      onSave();
      onClose();
    } catch (error) {
      toast.error("저장에 실패했습니다.");
      console.error(error);
    }
  };

  const onInvalid = (errors: FieldErrors<PhoneDetailFormData>) => {
    let errorMessage = "입력 값을 다시 확인해주세요.";
    const findFirstError = (errObj: any): string | undefined => {
      if (!errObj) return undefined;
      if (typeof errObj.message === "string") return errObj.message;

      for (const key of Object.keys(errObj)) {
        if (key === "storages" && Array.isArray(errObj[key])) {
          for (const item of errObj[key]) {
            const nestedMessage = findFirstError(item);
            if (nestedMessage) return nestedMessage;
          }
        } else if (typeof errObj[key] === "object") {
          const nestedMessage = findFirstError(errObj[key]);
          if (nestedMessage) return nestedMessage;
        }
      }
      return undefined;
    };

    errorMessage = findFirstError(errors) || errorMessage;
    toast.error(errorMessage);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-background-light dark:bg-background-dark p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
                  {phoneModelData ? "핸드폰 모델 수정" : "핸드폰 모델 추가"}
                </Dialog.Title>
                <form onSubmit={handleSubmit(onValid, onInvalid)} className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="manufacturerId"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        제조사
                      </label>
                      <select
                        id="manufacturerId"
                        {...register("manufacturerId", {
                          required: "제조사를 선택해주세요.",
                          valueAsNumber: true,
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-[#292929] dark:border-gray-500 dark:text-white"
                      >
                        {manufacturers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name_ko}
                          </option>
                        ))}
                      </select>
                      {errors.manufacturerId && (
                        <p className="mt-1 text-sm text-red-600">{errors.manufacturerId.message}</p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="releaseDate"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        출시일
                      </label>
                      <input
                        type="date"
                        id="releaseDate"
                        {...register("releaseDate")}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-[#292929] dark:border-gray-500 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="modelName_ko"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        모델명 (한국어)
                      </label>
                      <input
                        type="text"
                        id="modelName_ko"
                        {...register("modelName_ko", {
                          required: "한국어 모델명을 입력해주세요.",
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-[#292929] dark:border-gray-500 dark:text-white"
                      />
                      {errors.modelName_ko && (
                        <p className="mt-1 text-sm text-red-600">{errors.modelName_ko.message}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="modelName_en"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        모델명 (영어)
                      </label>
                      <input
                        type="text"
                        id="modelName_en"
                        {...register("modelName_en", {
                          required: "영어 모델명을 입력해주세요.",
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-[#292929] dark:border-gray-500 dark:text-white"
                      />
                      {errors.modelName_en && (
                        <p className="mt-1 text-sm text-red-600">{errors.modelName_en.message}</p>
                      )}
                    </div>
                  </div>

                  <Controller
                    name="imageUrl"
                    control={control}
                    render={({ field }) => (
                      <ImageUpload
                        currentImageUrl={field.value}
                        onImageChange={field.onChange}
                        onImageRemove={() => field.onChange("")}
                        label="모델 이미지"
                        uploadType="device"
                      />
                    )}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">용량 선택</label>
                    <div className="mt-2 grid grid-cols-4 gap-2 lg:grid-cols-6">
                      {allStorages.map((storage) => (
                        <CustomCheckbox
                          key={storage.id}
                          label={storage.storage}
                          checked={selectedStorageIds.includes(storage.id)}
                          onChange={() => handleStorageChange(storage)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="p-2 border rounded-md border-gray-200 dark:border-gray-500">
                        <div className="flex md:space-x-4 md:items-center gap-4 md:gap-0">
                          {/* 용량 */}
                          <div className="md:w-16 md:flex-shrink-0 flex items-center h-full">
                            <p className="w-full px-3 py-2 font-semibold text-center text-primary-light dark:text-primary-dark flex items-center justify-center h-full">
                              {field.storage}
                            </p>
                          </div>
                          {/* 출고가 */}
                          <div className="flex-1 min-w-[120px]">
                            <label
                              htmlFor={`storages.${index}.devices.0.retailPrice`}
                              className="block text-sm text-center font-medium text-gray-700 dark:text-gray-300"
                            >
                              출고가
                            </label>
                            <Controller
                              name={`storages.${index}.devices.0.retailPrice`}
                              control={control}
                              rules={{ required: "출고가를 입력해주세요." }}
                              render={({ field }) => (
                                <div className="relative mt-1">
                                  <input
                                    type="text"
                                    id={`storages.${index}.devices.0.retailPrice`}
                                    value={formatPrice(field.value)}
                                    onChange={(e) => {
                                      const rawValue = e.target.value.replace(/[^0-9]/g, "");
                                      field.onChange(rawValue ? parseInt(rawValue, 10) : 0);
                                    }}
                                    className="w-full px-3 py-2 pr-8 text-right border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-[#292929] dark:border-gray-500 dark:text-white"
                                    placeholder="0"
                                  />
                                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 pointer-events-none">
                                    원
                                  </span>
                                </div>
                              )}
                            />
                            {errors.storages?.[index]?.devices?.[0]?.retailPrice && (
                              <p className="mt-1 text-xs text-red-600">
                                {errors.storages?.[index]?.devices?.[0]?.retailPrice?.message}
                              </p>
                            )}
                          </div>
                          {/* 자급제 */}
                          <div className="flex-1 min-w-[120px]">
                            <label
                              htmlFor={`storages.${index}.devices.0.unlockedPrice`}
                              className="block text-sm text-center font-medium text-gray-700 dark:text-gray-300"
                            >
                              자급제
                            </label>
                            <Controller
                              name={`storages.${index}.devices.0.unlockedPrice`}
                              control={control}
                              rules={{
                                required: "자급제 가격을 입력해주세요.",
                              }}
                              render={({ field }) => (
                                <div className="relative mt-1">
                                  <input
                                    type="text"
                                    id={`storages.${index}.devices.0.unlockedPrice`}
                                    value={formatPrice(field.value)}
                                    onChange={(e) => {
                                      const rawValue = e.target.value.replace(/[^0-9]/g, "");
                                      field.onChange(rawValue ? parseInt(rawValue, 10) : 0);
                                    }}
                                    className="w-full px-3 py-2 pr-8 text-right border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-[#292929] dark:border-gray-500 dark:text-white"
                                    placeholder="0"
                                  />
                                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 pointer-events-none">
                                    원
                                  </span>
                                </div>
                              )}
                            />
                            {errors.storages?.[index]?.devices?.[0]?.unlockedPrice && (
                              <p className="mt-1 text-xs text-red-600">
                                {errors.storages?.[index]?.devices?.[0]?.unlockedPrice?.message}
                              </p>
                            )}
                          </div>
                          {/* 쿠팡 링크 */}
                          <div className="flex-1 md:grow-[2] min-w-[120px]">
                            <label
                              htmlFor={`storages.${index}.devices.0.coupangLink`}
                              className="block text-sm text-center font-medium text-gray-700 dark:text-gray-300"
                            >
                              쿠팡 링크
                            </label>
                            <input
                              type="text"
                              {...register(`storages.${index}.devices.0.coupangLink`, {
                                required: "쿠팡 링크를 입력해주세요.",
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light dark:bg-[#292929] dark:border-gray-500 dark:text-white"
                            />
                            {errors.storages?.[index]?.devices?.[0]?.coupangLink && (
                              <p className="mt-1 text-xs text-red-600">
                                {errors.storages?.[index]?.devices?.[0]?.coupangLink?.message}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white dark:text-black bg-primary-light rounded-md hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light dark:bg-primary-dark dark:hover:bg-opacity-80"
                    >
                      저장
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ModelModal;
