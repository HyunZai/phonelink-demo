import { useState } from "react";
import { Combobox } from "@headlessui/react";
import type { StoreDto } from "../../../shared/types";
import { HiChevronUpDown, HiCheck, HiPlus } from "react-icons/hi2";

interface StoreSearchableSelectProps {
  stores: StoreDto[];
  selectedStore: StoreDto | null;
  onStoreSelect: (store: StoreDto | null) => void;
  onNewStoreClick?: () => void; // 신규 등록 클릭 시 호출될 함수
}

function classNames(...classes: (string | boolean)[]) {
  return classes.filter(Boolean).join(" ");
}

const StoreSearchableSelect: React.FC<StoreSearchableSelectProps> = ({
  stores,
  selectedStore,
  onStoreSelect,
  onNewStoreClick,
}) => {
  const [query, setQuery] = useState("");

  const filteredStores =
    query === ""
      ? stores
      : stores.filter((store) => {
          return store.name.toLowerCase().includes(query.toLowerCase());
        });

  // 신규 등록 옵션을 위한 특별한 객체
  const newStoreOption = { id: -8574, name: "신규 등록 요청" };

  return (
    <Combobox as="div" value={selectedStore} onChange={onStoreSelect}>
      <div className="relative">
        <Combobox.Input
          className="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 shadow-sm focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light dark:bg-background-dark dark:border-gray-500 dark:text-white sm:text-sm"
          onChange={(event) => setQuery(event.target.value)}
          displayValue={(store: StoreDto) => store?.name || ""}
          placeholder="매장명 검색"
        />
        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none">
          <HiChevronUpDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </Combobox.Button>

        <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-background-dark dark:ring-white/10 sm:text-sm">
          {/* 신규 등록 옵션을 최상단에 배치 */}
          <Combobox.Option
            value={newStoreOption}
            className={({ active }) =>
              classNames(
                "relative cursor-default select-none py-2 pl-3 pr-9 border-b border-background-light dark:border-[#292929]",
                active
                  ? "bg-primary-light text-white dark:bg-primary-dark"
                  : "text-primary-light dark:text-primary-dark font-medium",
              )
            }
            onClick={() => {
              if (onNewStoreClick) {
                onNewStoreClick();
              }
            }}
          >
            {() => (
              <>
                <span className="flex items-center">
                  <HiPlus className="h-4 w-4 mr-2" />
                  <span className="block truncate">신규 등록 요청</span>
                </span>
              </>
            )}
          </Combobox.Option>

          {filteredStores.length === 0 && query !== "" ? (
            <div className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-700 dark:text-gray-300">
              검색 결과가 없습니다.
            </div>
          ) : (
            filteredStores.map((store) => (
              <Combobox.Option
                key={store.id}
                value={store}
                className={({ active }) =>
                  classNames(
                    "relative cursor-default select-none py-2 pl-3 pr-9",
                    active ? "bg-primary-light text-white dark:bg-primary-dark" : "text-gray-900 dark:text-gray-200",
                  )
                }
              >
                {({ active, selected }) => (
                  <>
                    <span className={classNames("block truncate", selected ? "font-semibold" : "")}>{store.name}</span>
                    {selected && (
                      <span
                        className={classNames(
                          "absolute inset-y-0 right-0 flex items-center pr-4",
                          active ? "text-white" : "text-primary-light dark:text-primary-dark",
                        )}
                      >
                        <HiCheck className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </div>
    </Combobox>
  );
};

export default StoreSearchableSelect;
