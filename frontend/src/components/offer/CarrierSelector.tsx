import { useEffect, useState } from "react";
import type { CarrierDto } from "../../../../shared/types";
import { api } from "../../api/axios";
import { toast } from "sonner";

interface CarrierSelectorProps {
  selectedCarriers: CarrierDto[];
  onCarriersChange: (carriers: CarrierDto[]) => void;
}

const CarrierSelector: React.FC<CarrierSelectorProps> = ({ selectedCarriers, onCarriersChange }) => {
  const [carriers, setCarriers] = useState<CarrierDto[]>([]);

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

  const handleCarrierChange = (carrier: CarrierDto) => {
    const isSelected = selectedCarriers.some((c) => c.id === carrier.id);

    if (isSelected) {
      onCarriersChange(selectedCarriers.filter((c) => c.id !== carrier.id));
    } else {
      onCarriersChange([...selectedCarriers, carrier]);
    }
  };

  const getCarrierImageUrl = (carrierName: string) => {
    try {
      return new URL(`/src/assets/images/${carrierName}.png`, import.meta.url).href;
    } catch (error) {
      console.error(`Error loading image for carrier: ${carrierName}`, error);
      return "https://placehold.co/500x500";
    }
  };

  return (
    <div>
      <div
        className={`grid gap-3 items-center min-h-60 ${
          carriers.length === 1
            ? "grid-cols-1"
            : carriers.length === 2
              ? "grid-cols-2"
              : carriers.length === 3
                ? "grid-cols-3"
                : carriers.length === 4
                  ? "grid-cols-4"
                  : "grid-cols-5"
        }`}
      >
        {carriers.map((carrier) => {
          const isSelected = selectedCarriers.some((c) => c.id === carrier.id);

          return (
            <button
              key={carrier.id}
              type="button"
              onClick={() => handleCarrierChange(carrier)}
              className={`flex flex-col items-center justify-center gap-3 w-full h-full max-h-44 rounded-lg border transition-all shadow-sm hover:shadow-md cursor-pointer
    ${
      isSelected
        ? "border-green-600 bg-green-50 dark:border-gray-400 dark:bg-primary-dark/20 shadow-md"
        : "border-gray-300 bg-white dark:bg-background-dark hover:bg-gray-100 dark:hover:bg-[#575757]/40"
    }
  `}
            >
              <div className="flex items-center justify-center w-16 h-16">
                <img
                  src={getCarrierImageUrl(carrier.name)}
                  alt={carrier.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{carrier.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CarrierSelector;
