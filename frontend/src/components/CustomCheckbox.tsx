import React from "react";

interface CustomCheckboxProps {
  label: string;
  checked: boolean;
  onChange: () => void;
  customStyle?: string;
}

const CustomCheckbox: React.FC<CustomCheckboxProps> = ({ label, checked, onChange, customStyle }) => {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`
        px-2 py-1 rounded-lg border transition ${customStyle || "text-sm w-full"}
        ${
          checked
            ? "border-none bg-primary-light dark:bg-primary-dark text-foreground-dark dark:text-foreground-light"
            : "border-none text-foreground-light dark:text-foreground-dark hover:bg-gray-100 dark:hover:bg-[#575757]"
        }
      `}
    >
      {label}
    </button>
  );
};

export default CustomCheckbox;
