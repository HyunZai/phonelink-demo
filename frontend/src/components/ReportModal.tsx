import React, { useState, useEffect } from "react";
import { FiX, FiAlertTriangle } from "react-icons/fi";
import { REASON_TYPES, REPORTABLE_TYPES, type ReasonType, type ReportableType } from "../../../shared/constants";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportableType: ReportableType;
  reportableId: number;
  onReport: (reasonType: ReasonType, reasonDetail?: string) => void;
}

const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  reportableType,
  reportableId, // eslint-disable-line @typescript-eslint/no-unused-vars
  onReport,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReasonType | null>(null);
  const [reasonDetail, setReasonDetail] = useState("");
  const [error, setError] = useState("");

  // 신고 대상 타입에 따른 라벨 매핑
  const reportableTypeLabels: Record<ReportableType, string> = {
    [REPORTABLE_TYPES.POST]: "게시글",
    [REPORTABLE_TYPES.COMMENT]: "댓글",
    [REPORTABLE_TYPES.USER]: "사용자",
    [REPORTABLE_TYPES.STORE]: "매장",
  };

  // 신고 사유 라벨 매핑
  const reasonLabels: Record<ReasonType, string> = {
    [REASON_TYPES.SPAM]: "스팸 또는 광고",
    [REASON_TYPES.ABUSE]: "욕설, 비방, 혐오 표현",
    [REASON_TYPES.OBSCENITY]: "음란물 또는 성적 콘텐츠",
    [REASON_TYPES.ILLEGAL]: "불법 콘텐츠",
    [REASON_TYPES.PRIVACY]: "개인정보 침해",
    [REASON_TYPES.COPYRIGHT]: "저작권 침해",
    [REASON_TYPES.OTHER]: "기타",
  };

  // 모달이 열렸을 때 배경 스크롤 방지
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) onClose();
    };

    if (isOpen) document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen, onClose]);

  // 모달 닫을 때 상태 초기화
  const handleClose = () => {
    setSelectedReason(null);
    setReasonDetail("");
    setError("");
    onClose();
  };

  // 신고 제출
  const handleSubmit = () => {
    if (!selectedReason) {
      setError("신고 사유를 선택해주세요.");
      return;
    }

    // '기타' 선택 시 상세 내용 필수 검증
    if (selectedReason === REASON_TYPES.OTHER) {
      if (!reasonDetail.trim()) {
        setError("상세 내용을 입력해주세요.");
        return;
      }
      if (reasonDetail.trim().length < 10) {
        setError("상세 내용은 최소 10자 이상 입력해주세요.");
        return;
      }
    }

    setError("");
    // 상세 내용이 있으면 전달 (기타가 아니어도 입력 가능)
    onReport(selectedReason, reasonDetail.trim() || undefined);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 모달 컨텐츠 */}
      <div className="relative bg-white dark:bg-[#292929] rounded-lg shadow-xl max-w-lg md:max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-500">
          <div className="flex items-center gap-2 sm:gap-3">
            <FiAlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 dark:text-red-400" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
              {reportableTypeLabels[reportableType]} 신고하기
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            aria-label="닫기"
          >
            <FiX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* 모달 바디 */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="space-y-4 sm:space-y-6">
            {/* 안내 문구 */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 sm:p-4">
              <p className="text-sm sm:text-base text-yellow-800 dark:text-yellow-200">
                허위 신고는 신고자에게 불이익을 줄 수 있습니다. 신중하게 신고해주세요.
              </p>
            </div>

            {/* 신고 사유 선택 */}
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-3 sm:mb-4">
                신고 사유 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                {Object.entries(REASON_TYPES).map(([, value]) => (
                  <label
                    key={value}
                    className={`flex items-center p-2 sm:p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedReason === value
                        ? "border-primary-light dark:border-primary-dark bg-primary-light/10 dark:bg-primary-dark/10"
                        : "border-gray-200 dark:border-gray-500 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-[#343434]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={value}
                      checked={selectedReason === value}
                      onChange={() => {
                        setSelectedReason(value);
                        setError("");
                        // 신고 사유 변경 시 상세 내용은 유지 (필수는 아니므로)
                      }}
                      className="sr-only"
                    />
                    <div
                      className={`flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center mr-2 sm:mr-3 transition-colors ${
                        selectedReason === value
                          ? "border-primary-light dark:border-primary-dark bg-primary-light dark:bg-primary-dark"
                          : "border-gray-300 dark:border-gray-500 bg-white dark:bg-[#292929]"
                      }`}
                    >
                      {selectedReason === value && (
                        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-white dark:bg-[#292929]" />
                      )}
                    </div>
                    <span
                      className={`text-sm sm:text-base flex-1 ${
                        selectedReason === value
                          ? "text-gray-900 dark:text-gray-100 font-medium"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {reasonLabels[value]}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 상세 내용 입력 (신고 사유 선택 시 항상 표시) */}
            {selectedReason && (
              <div className="animate-fadeIn">
                <label
                  htmlFor="reasonDetail"
                  className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2 sm:mb-3"
                >
                  상세 내용
                  {selectedReason === REASON_TYPES.OTHER && <span className="text-red-500 ml-1">*</span>}
                </label>
                <textarea
                  id="reasonDetail"
                  value={reasonDetail}
                  onChange={(e) => {
                    setReasonDetail(e.target.value);
                    setError("");
                  }}
                  placeholder={
                    selectedReason === REASON_TYPES.OTHER
                      ? "신고 사유를 상세히 입력해주세요. (최소 10자 이상)"
                      : "추가로 설명할 내용이 있으면 입력해주세요. (선택사항)"
                  }
                  rows={4}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark dark:bg-[#343434] dark:text-gray-100 resize-none"
                />
                <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {selectedReason === REASON_TYPES.OTHER && `최소 10자 이상 입력해주세요. (${reasonDetail.length}자)`}
                </p>
              </div>
            )}

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4">
                <p className="text-sm sm:text-base text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-500 bg-gray-50 dark:bg-[#343434]">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 sm:py-3 text-sm sm:text-base font-medium rounded-lg border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-300 bg-white dark:bg-[#292929] hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedReason || (selectedReason === REASON_TYPES.OTHER && reasonDetail.trim().length < 10)}
            className={`flex-1 px-4 py-2.5 sm:py-3 text-sm sm:text-base font-bold rounded-lg text-white transition-colors ${
              selectedReason && (selectedReason !== REASON_TYPES.OTHER || reasonDetail.trim().length >= 10)
                ? "bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                : "bg-gray-300 dark:bg-gray-600 cursor-not-allowed text-gray-500 dark:text-gray-400"
            }`}
          >
            신고하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
