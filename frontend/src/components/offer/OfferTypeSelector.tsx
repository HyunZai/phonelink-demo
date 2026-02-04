import React from "react";
//import { GiCycle, GiSmartphone } from "react-icons/gi";
import { BsArrowRepeat, BsPhoneFlip } from "react-icons/bs";
import { OFFER_TYPES, type OfferType } from "../../../../shared/constants";

interface OfferTypeSelectorProps {
  selectedOfferTypes: OfferType[];
  onOfferTypesChange: (offerTypes: OfferType[]) => void;
}

const OfferTypeSelector: React.FC<OfferTypeSelectorProps> = ({ selectedOfferTypes, onOfferTypesChange }) => {
  const offerTypes = [
    { value: OFFER_TYPES.MNP, label: "번호이동", icon: BsArrowRepeat },
    { value: OFFER_TYPES.CHG, label: "기기변경", icon: BsPhoneFlip },
  ];

  const handleOfferTypeChange = (offerType: OfferType) => {
    const isSelected = selectedOfferTypes.includes(offerType);

    if (isSelected) {
      // 선택 해제
      onOfferTypesChange(selectedOfferTypes.filter((type) => type !== offerType));
    } else {
      // 선택 추가
      onOfferTypesChange([...selectedOfferTypes, offerType]);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 items-center min-h-60">
        {offerTypes.map(({ value, label, icon: Icon }) => {
          const isSelected = selectedOfferTypes.includes(value as OfferType);
          return (
            <button
              key={value}
              type="button"
              onClick={() => handleOfferTypeChange(value as OfferType)}
              className={`flex flex-col items-center justify-center gap-2 w-full h-full max-h-44 rounded-lg border transition-all shadow-sm cursor-pointer dark:text-gray-100
                ${
                  isSelected
                    ? "border-green-600 bg-green-50 dark:border-gray-400 dark:bg-primary-dark/20 shadow-md"
                    : "border-gray-300 bg-white dark:bg-background-dark hover:bg-gray-100 dark:hover:bg-[#575757]/40"
                }
              `}
            >
              <Icon size={48} className="dark:text-gray-100" />
              <span className="text-lg font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OfferTypeSelector;
