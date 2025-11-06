import React, { useState, useEffect } from "react";
import { FiAlertTriangle, FiChevronDown } from "react-icons/fi";
import { Listbox, Transition } from "@headlessui/react";
import type { ReportListDto, ReportListResponse } from "../../../../shared/report.types";
import { REPORT_STATUSES, REPORTABLE_TYPES, REASON_TYPES, type ReportStatus } from "../../../../shared/constants";
import Pagination from "../Pagination";
// import { api } from "../../api/axios";
import ReportDetailModal from "./ReportDetailModal";
import { api } from "../../api/axios";

const ReportManagement: React.FC = () => {
  const [reports, setReports] = useState<ReportListDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "ALL">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const reportsPerPage = 6;

  // 상태 필터 옵션
  const statusFilterOptions = [
    { value: "ALL" as ReportStatus | "ALL", label: "전체 상태" },
    { value: REPORT_STATUSES.PENDING, label: "대기" },
    { value: REPORT_STATUSES.PROCESSING, label: "처리중" },
    { value: REPORT_STATUSES.RESOLVED, label: "처리완료" },
    { value: REPORT_STATUSES.DISMISSED, label: "기각" },
  ];

  // 신고 목록 조회
  useEffect(() => {
    fetchReports();
  }, [currentPage, statusFilter]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: reportsPerPage,
        sortBy: "createdAt",
        sortOrder: "DESC",
      };

      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }

      const response = await api.get<ReportListResponse>("/admin/reports", { params });
      setReports(response.reports);
      setTotalCount(response.totalCount);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error("신고 목록 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
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
  const getReasonTypeText = (reason: string) => {
    switch (reason) {
      case REASON_TYPES.SPAM:
        return "스팸/광고";
      case REASON_TYPES.ABUSE:
        return "욕설/비방";
      case REASON_TYPES.OBSCENITY:
        return "음란물";
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

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 상태 필터 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // 신고 클릭 핸들러
  const handleReportClick = (reportId: number) => {
    setSelectedReportId(reportId);
    setIsModalOpen(true);
  };

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReportId(null);
    fetchReports(); // 신고 처리 후 목록 새로고침
  };

  // 신고 상태 업데이트 함수
  const updateReportStatus = () => {
    fetchReports(); // 목록 새로고침
  };

  // 날짜 포맷팅 (KST 변환)
  const formatDate = (date: string | undefined) => {
    if (!date) return "-";

    if (typeof date === "string" && date.includes("T")) {
      // "2025-10-06T17:32:59.000Z" 형태의 문자열을 직접 파싱
      const [datePart, timePart] = date.split("T");
      const [year, month, day] = datePart.split("-");

      // 시간 부분에서 초와 밀리초 제거
      const timeOnly = timePart.split(".")[0]; // "17:32:59"
      const [hours, minutes] = timeOnly.split(":");

      return `${year}. ${month}. ${day}. ${hours}:${minutes}`;
    } else {
      // Date 객체인 경우 기존 로직 유지
      const dateObj = new Date(date);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      const hours = String(dateObj.getHours()).padStart(2, "0");
      const minutes = String(dateObj.getMinutes()).padStart(2, "0");
      return `${year}. ${month}. ${day}. ${hours}:${minutes}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 섹션 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <FiAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">신고 관리</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">총 {totalCount}건의 신고</p>
          </div>
        </div>

        {/* 상태 필터 */}
        <div className="w-full sm:w-48">
          <Listbox value={statusFilter} onChange={setStatusFilter}>
            <div className="relative">
              <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white dark:bg-[#292929] py-2 pl-3 pr-10 text-left shadow-md border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:border-transparent sm:text-sm">
                <span className="block truncate text-gray-900 dark:text-white">
                  {statusFilterOptions.find((option) => option.value === statusFilter)?.label}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <FiChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </span>
              </Listbox.Button>
              <Transition
                as={React.Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options className="absolute z-10 mt-1 w-full overflow-auto rounded-md bg-white dark:bg-[#292929] py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm border border-gray-200 dark:border-gray-600 max-h-60">
                  {statusFilterOptions.map((option) => (
                    <Listbox.Option
                      key={option.value}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                          active
                            ? "bg-primary-light/10 dark:bg-primary-dark/10 text-primary-light dark:text-primary-dark"
                            : "text-gray-900 dark:text-white"
                        }`
                      }
                      value={option.value}
                    >
                      {({ selected }) => (
                        <>
                          <span className={`block truncate ${selected ? "font-medium" : "font-normal"}`}>
                            {option.label}
                          </span>
                          {selected ? (
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-light dark:text-primary-dark">
                              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path
                                  fillRule="evenodd"
                                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </span>
                          ) : null}
                        </>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox>
        </div>
      </div>

      {/* 신고 목록 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-light dark:border-primary-dark"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">신고 목록을 불러오는 중...</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#292929] rounded-lg border border-gray-200 dark:border-gray-600">
          <FiAlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">신고가 없습니다</h3>
          <p className="text-gray-500 dark:text-gray-400">신고 내역이 없습니다.</p>
        </div>
      ) : (
        <>
          {/* 신고 리스트 테이블 */}
          <div className="bg-white dark:bg-[#292929] rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200 dark:divide-gray-600">
                <thead className="bg-gray-50 dark:bg-[#343434]">
                  <tr>
                    {/* ID - lg 이상에서만 표시 */}
                    <th className="hidden lg:table-cell px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      ID
                    </th>
                    {/* 신고 대상 - 항상 표시 (최우선) */}
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      신고 대상
                    </th>
                    {/* 신고 사유 - 항상 표시 (최우선) */}
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      신고 사유
                    </th>
                    {/* 상태 - 항상 표시 */}
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      상태
                    </th>
                    {/* 신고일 - md 이상에서 표시 */}
                    <th className="hidden md:table-cell px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      신고일
                    </th>
                    {/* 신고자 - lg 이상에서만 표시 */}
                    <th className="hidden lg:table-cell px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      신고자
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-[#292929] divide-y divide-gray-200 dark:divide-gray-600">
                  {reports.map((report) => (
                    <tr
                      key={report.id}
                      className="hover:bg-gray-50 dark:hover:bg-[#343434] cursor-pointer transition-colors"
                      onClick={() => handleReportClick(report.id)}
                    >
                      {/* ID - lg 이상에서만 표시 */}
                      <td className="hidden lg:table-cell px-2 sm:px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        #{report.id}
                      </td>
                      {/* 신고 대상 - 항상 표시 */}
                      <td className="px-2 sm:px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                          {getReportableTypeText(report.reportableType)}
                        </span>
                      </td>
                      {/* 신고 사유 - 항상 표시 */}
                      <td className="px-2 sm:px-4 py-4 text-sm text-gray-500 dark:text-gray-300 break-words">
                        {getReasonTypeText(report.reasonType)}
                      </td>
                      {/* 상태 - 항상 표시 */}
                      <td className="px-2 sm:px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeColor(report.status)}`}
                        >
                          {getStatusText(report.status)}
                        </span>
                      </td>
                      {/* 신고일 - md 이상에서 표시 */}
                      <td className="hidden md:table-cell px-2 sm:px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {formatDate(report.createdAt?.toString())}
                      </td>
                      {/* 신고자 - lg 이상에서만 표시 */}
                      <td className="hidden lg:table-cell px-2 sm:px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {report.reporterNickname || "알 수 없음"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
          )}
        </>
      )}

      {/* 신고 상세 정보 모달 */}
      <ReportDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        reportId={selectedReportId}
        onReportStatusUpdate={updateReportStatus}
      />
    </div>
  );
};

export default ReportManagement;
