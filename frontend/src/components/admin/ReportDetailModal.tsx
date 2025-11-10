import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FiAlertTriangle, FiUser, FiFileText, FiX, FiChevronDown, FiChevronUp, FiExternalLink } from "react-icons/fi";
import { Listbox, Transition } from "@headlessui/react";
import { Link } from "react-router-dom";
import type { ReportDetailDto } from "../../../../shared/report.types";
import { REPORT_STATUSES, REPORTABLE_TYPES, REASON_TYPES, type ReportStatus } from "../../../../shared/constants";
import LoadingSpinner from "../LoadingSpinner";
import { api } from "../../api/axios";
import { toast } from "sonner";

interface ReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: number | null;
  onReportStatusUpdate?: () => void;
}

const ReportDetailModal: React.FC<ReportDetailModalProps> = ({ isOpen, onClose, reportId, onReportStatusUpdate }) => {
  const [reportDetail, setReportDetail] = useState<ReportDetailDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // 처리 관련 상태
  const [processStatus, setProcessStatus] = useState<ReportStatus>(REPORT_STATUSES.RESOLVED);
  const [actionTaken, setActionTaken] = useState("");
  // 신고 대상 내용 토글 상태
  const [showReportableContent, setShowReportableContent] = useState(false);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
    }

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  // 신고 상세 정보 API 호출 함수
  const fetchReportDetail = async (reportId: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get<ReportDetailDto>(`/admin/reports/${reportId}`);

      if (response) {
        setReportDetail(response);
        if (response.status === REPORT_STATUSES.RESOLVED) {
          setProcessStatus(REPORT_STATUSES.RESOLVED);
        } else if (response.status === REPORT_STATUSES.DISMISSED) {
          setProcessStatus(REPORT_STATUSES.DISMISSED);
        } else {
          setProcessStatus(REPORT_STATUSES.RESOLVED);
        }
      } else {
        setError("신고 정보를 불러오는데 실패했습니다.");
      }
    } catch (err: any) {
      console.error("신고 상세 정보 조회 오류:", err);

      if (err.response?.status === 404) {
        setError("해당 신고를 찾을 수 없습니다.");
      } else if (err.response?.status === 400) {
        setError("잘못된 요청입니다.");
      } else {
        setError("신고 정보를 불러오는 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 신고 처리 함수
  const handleProcessReport = async () => {
    if (!reportId) return;

    if (!processStatus) {
      setError("처리 상태를 선택해주세요.");
      return;
    }

    if (processStatus === REPORT_STATUSES.RESOLVED && !actionTaken.trim()) {
      setError("처리 내용을 입력해주세요.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      await api.post(`/admin/reports/${reportId}/process`, {
        status: processStatus,
        actionTaken: actionTaken.trim() || undefined,
      });

      toast.success("신고가 처리되었습니다.");

      // 신고 상세 정보 다시 불러오기
      await fetchReportDetail(reportId);

      // 부모 컴포넌트 상태 업데이트
      if (onReportStatusUpdate) {
        onReportStatusUpdate();
      }

      setActionTaken("");
    } catch (err: any) {
      console.error("신고 처리 오류:", err);
      const errorMessage = err.response?.data?.message || "신고 처리 중 오류가 발생했습니다.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  // 모달이 열리고 reportId가 있을 때 API 호출
  useEffect(() => {
    if (isOpen && reportId) {
      fetchReportDetail(reportId);
    } else {
      // 모달이 닫히면 상태 초기화
      setReportDetail(null);
      setError(null);
      setProcessStatus(REPORT_STATUSES.RESOLVED);
      setActionTaken("");
      setShowReportableContent(false);
    }
  }, [isOpen, reportId]);

  // 모달이 닫혀있거나 신고 정보가 없으면 렌더링하지 않음
  if (!isOpen) return null;

  // 날짜 포맷팅
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "-";

    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 신고 상태 한글 변환
  const getStatusText = (status: ReportStatus) => {
    switch (status) {
      case REPORT_STATUSES.PENDING:
        return "대기";
      case REPORT_STATUSES.PROCESSING:
        return "처리중";
      case REPORT_STATUSES.RESOLVED:
        return "처리완료";
      case REPORT_STATUSES.DISMISSED:
        return "기각";
      default:
        return status;
    }
  };

  // 신고 상태 배지 색상
  const getStatusBadgeColor = (status: ReportStatus) => {
    switch (status) {
      case REPORT_STATUSES.PENDING:
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700";
      case REPORT_STATUSES.PROCESSING:
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700";
      case REPORT_STATUSES.RESOLVED:
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700";
      case REPORT_STATUSES.DISMISSED:
        return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-600";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600";
    }
  };

  // 신고 대상 타입 한글 변환
  const getReportableTypeText = (type: string) => {
    switch (type) {
      case REPORTABLE_TYPES.POST:
        return "게시글";
      case REPORTABLE_TYPES.COMMENT:
        return "댓글";
      case REPORTABLE_TYPES.USER:
        return "사용자";
      case REPORTABLE_TYPES.STORE:
        return "매장";
      default:
        return type;
    }
  };

  // 신고 사유 한글 변환
  const getReasonTypeText = (reason: string | undefined) => {
    if (!reason) return "-";

    switch (reason) {
      case REASON_TYPES.SPAM:
        return "스팸 또는 광고";
      case REASON_TYPES.ABUSE:
        return "욕설, 비방, 혐오 표현";
      case REASON_TYPES.OBSCENITY:
        return "음란물 또는 성적 콘텐츠";
      case REASON_TYPES.ILLEGAL:
        return "불법 콘텐츠";
      case REASON_TYPES.PRIVACY:
        return "개인정보 침해";
      case REASON_TYPES.COPYRIGHT:
        return "저작권 침해";
      case REASON_TYPES.OTHER:
        return "기타";
      default:
        return reason;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white dark:bg-[#292929] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 모달 헤더 */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-500">
            <div className="flex items-center gap-2 sm:gap-3">
              <FiAlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 dark:text-red-400" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">신고 상세 정보</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              aria-label="닫기"
            >
              <FiX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* 모달 바디 */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
            <div className="space-y-4 sm:space-y-6">
              {/* 로딩 상태 */}
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner isVisible={true} spinnerSize={48} />
                  <span className="ml-3 text-gray-600 dark:text-gray-400">신고 정보를 불러오는 중...</span>
                </div>
              )}

              {/* 에러 상태 */}
              {error && !loading && (
                <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-700">
                  <div className="flex items-center gap-2 mb-2">
                    <FiAlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">오류 발생</p>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  {reportId && (
                    <button
                      onClick={() => reportId && fetchReportDetail(reportId)}
                      className="mt-3 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition-colors"
                    >
                      다시 시도
                    </button>
                  )}
                </div>
              )}

              {/* 신고 정보 표시 (로딩 중이 아니고 에러가 없을 때만) */}
              {!loading && !error && reportDetail && (
                <>
                  {/* 신고자 정보 - 최상단 */}
                  {reportDetail.reporterNickname && (
                    <div className="p-4 bg-gray-50 dark:bg-[#1f1f1f] rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          신고자
                        </span>
                        {reportDetail.reporterImageUrl ? (
                          <img
                            src={`${import.meta.env.VITE_API_URL}${reportDetail.reporterImageUrl}`}
                            alt={reportDetail.reporterNickname || "신고자"}
                            className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                            <FiUser className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {reportDetail.reporterNickname || "알 수 없음"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 신고 정보 - 신고 상태, 신고 대상, 신고 사유, 신고 상세 내용, 신고일 */}
                  <div className="p-4 bg-gray-50 dark:bg-[#1f1f1f] rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">신고 정보</h3>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeColor(reportDetail.status)}`}
                        >
                          {getStatusText(reportDetail.status)}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(reportDetail.createdAt)}
                      </span>
                    </div>
                    <div className="space-y-4 text-sm text-gray-900 dark:text-white">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                          {getReportableTypeText(reportDetail.reportableType)}
                        </span>
                        <span className="text-sm font-medium">
                          {reportDetail.reasonType ? getReasonTypeText(reportDetail.reasonType) : "-"}
                        </span>
                      </div>

                      {reportDetail.reasonDetail && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <FiFileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">신고 상세 내용</span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {reportDetail.reasonDetail}
                          </p>
                        </div>
                      )}

                      {(reportDetail.content || reportDetail.postTitle) && (
                        <div className="space-y-2">
                          <button
                            onClick={() => setShowReportableContent(!showReportableContent)}
                            className="w-full flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-600 bg-white/60 dark:bg-black/30 px-4 py-3 text-left text-gray-900 dark:text-white transition-colors hover:border-primary-light/60 hover:bg-primary-light/10 dark:hover:border-primary-dark/50 dark:hover:bg-primary-dark/20"
                          >
                            <span className="flex items-center gap-2 text-sm font-semibold">
                              <FiAlertTriangle className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              신고 대상 컨텐츠 미리보기
                            </span>
                            {showReportableContent ? (
                              <FiChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            ) : (
                              <FiChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            )}
                          </button>

                          {showReportableContent && (
                            <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#232323] px-4 py-3 space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  {reportDetail.postTitle && (
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                      {reportDetail.postTitle}
                                    </p>
                                  )}
                                  {reportDetail.authorNickname && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      작성자:{" "}
                                      <span className="text-gray-700 dark:text-gray-300">
                                        {reportDetail.authorNickname}
                                      </span>
                                    </p>
                                  )}
                                </div>

                                {reportDetail.link && (
                                  <Link
                                    to={reportDetail.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-md border border-primary-light/40 dark:border-primary-dark/40 px-2 py-1 text-xs font-medium text-primary-light dark:text-primary-dark transition-colors hover:bg-primary-light/10 dark:hover:bg-primary-dark/20"
                                  >
                                    <FiExternalLink className="h-4 w-4" />
                                    이동
                                  </Link>
                                )}
                              </div>

                              {reportDetail.content && (
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {reportDetail.content}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 신고 처리 섹션 */}
                  <div className="p-4 bg-gray-50 dark:bg-[#1f1f1f] rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">신고 처리</h3>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {reportDetail.handledAt ? formatDate(reportDetail.handledAt) : "미처리"}
                      </span>
                    </div>

                    <div className="space-y-4 text-sm text-gray-900 dark:text-white">
                      {reportDetail.status === REPORT_STATUSES.PENDING ? (
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="block text-xs text-gray-600 dark:text-gray-400">처리 상태 *</label>
                            <Listbox value={processStatus} onChange={setProcessStatus}>
                              <div className="relative">
                                <Listbox.Button className="relative w-full cursor-pointer rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#292929] py-2 pl-3 pr-10 text-left text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                                  <span className="block truncate">
                                    {processStatus === REPORT_STATUSES.RESOLVED ? "처리완료" : "기각"}
                                  </span>
                                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400">
                                    <FiChevronDown className="h-4 w-4" aria-hidden="true" />
                                  </span>
                                </Listbox.Button>
                                <Transition
                                  leave="transition ease-in duration-100"
                                  leaveFrom="opacity-100"
                                  leaveTo="opacity-0"
                                >
                                  <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#1f1f1f] py-1 text-sm shadow-lg focus:outline-none">
                                    <Listbox.Option
                                      className={({ active }) =>
                                        `relative cursor-pointer select-none px-4 py-2 text-sm ${
                                          active
                                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                            : "text-gray-900 dark:text-gray-100"
                                        }`
                                      }
                                      value={REPORT_STATUSES.RESOLVED}
                                    >
                                      처리완료
                                    </Listbox.Option>
                                    <Listbox.Option
                                      className={({ active }) =>
                                        `relative cursor-pointer select-none px-4 py-2 text-sm ${
                                          active
                                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                            : "text-gray-900 dark:text-gray-100"
                                        }`
                                      }
                                      value={REPORT_STATUSES.DISMISSED}
                                    >
                                      기각
                                    </Listbox.Option>
                                  </Listbox.Options>
                                </Transition>
                              </div>
                            </Listbox>
                          </div>

                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                              처리 내용 {processStatus === REPORT_STATUSES.RESOLVED && "*"}
                            </label>
                            <textarea
                              value={actionTaken}
                              onChange={(e) => setActionTaken(e.target.value)}
                              placeholder={
                                processStatus === REPORT_STATUSES.RESOLVED
                                  ? "처리 결과를 입력해주세요..."
                                  : "기각 사유를 입력해주세요... (선택사항)"
                              }
                              rows={4}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#292929] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                            />
                          </div>

                          <button
                            onClick={handleProcessReport}
                            disabled={processing || (processStatus === REPORT_STATUSES.RESOLVED && !actionTaken.trim())}
                            className={`w-full px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
                              processing || (processStatus === REPORT_STATUSES.RESOLVED && !actionTaken.trim())
                                ? "bg-red-400 cursor-not-allowed"
                                : "bg-red-500 hover:bg-red-600"
                            }`}
                          >
                            {processing ? "처리 중..." : "처리 확정"}
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white/70 dark:bg-black/30 p-4 space-y-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">처리 관리자</p>
                              <p className="text-sm text-gray-900 dark:text-white">
                                {reportDetail.adminId ? `관리자 #${reportDetail.adminId}` : "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">처리 일시</p>
                              <p className="text-sm text-gray-900 dark:text-white">
                                {reportDetail.handledAt ? formatDate(reportDetail.handledAt) : "-"}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">처리 내용</p>
                            <p className="rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-[#232323] px-3 py-2 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                              {reportDetail.actionTaken?.trim()
                                ? reportDetail.actionTaken
                                : "등록된 처리 내용이 없습니다."}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ReportDetailModal;
