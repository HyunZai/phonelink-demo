import React, { useState, useEffect } from "react";
import { api } from "../api/axios";
import { TbReload } from "react-icons/tb";
import StoreDetailModal from "../components/admin/StoreDetailModal";
import type { PendingStoreDto } from "../../../shared/types";
import MasterDataManager from "../components/admin/MasterDataManager";
import UserManagement from "../components/admin/UserManagement";
import ReportManagement from "../components/admin/ReportManagement";

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "store-approval" | "master-data-management" | "user-management" | "report-management" | "system-region"
  >("store-approval");

  // 시스템 지역 설정 관련 상태
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // 매장 승인 대기 관련 상태
  const [pendingStores, setPendingStores] = useState<PendingStoreDto[]>([]);
  const [selectedStore, setSelectedStore] = useState<PendingStoreDto | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchPendingStores = async () => {
      const response = await api.get<PendingStoreDto[]>("/store/pending");
      setPendingStores(response);
    };
    fetchPendingStores();
  }, []);

  const syncRegionDataToDb = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const response = await api.post("/admin/regions-sync-db");
      setSyncResult(`${response.message} (총 ${response.totalFetched}건 처리)`);
    } catch (err) {
      setSyncError("DB 동기화 중 오류가 발생했습니다.");
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-8 mt-16">
      <h1 className="text-3xl font-bold mb-6 text-foreground-light dark:text-foreground-dark">관리자 페이지</h1>

      <div className="bg-white dark:bg-[#292929] rounded-t-lg shadow-lg p-0 mb-0">
        <div className="border-b border-gray-200 dark:border-background-dark">
          <nav className="-mb-px flex gap-2 sm:gap-4 md:gap-6 px-2 sm:px-4 md:px-6 overflow-x-auto" aria-label="Tabs">
            <button
              className={`shrink-0 border-b-2 py-3 sm:py-4 px-1 sm:px-2 text-xs sm:text-sm md:text-base font-semibold transition-colors duration-200 focus:outline-none whitespace-nowrap ${
                activeTab === "store-approval"
                  ? "border-primary-light dark:border-primary-dark text-primary-light dark:text-primary-dark"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"
              }`}
              onClick={() => setActiveTab("store-approval")}
            >
              <span className="hidden sm:inline">매장 등록 승인</span>
              <span className="sm:hidden">매장 승인</span>
            </button>
            <button
              className={`shrink-0 border-b-2 py-3 sm:py-4 px-1 sm:px-2 text-xs sm:text-sm md:text-base font-semibold transition-colors duration-200 focus:outline-none whitespace-nowrap ${
                activeTab === "master-data-management"
                  ? "border-primary-light dark:border-primary-dark text-primary-light dark:text-primary-dark"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"
              }`}
              onClick={() => setActiveTab("master-data-management")}
            >
              <span className="hidden sm:inline">기본정보 관리</span>
              <span className="sm:hidden">기본정보</span>
            </button>
            <button
              className={`shrink-0 border-b-2 py-3 sm:py-4 px-1 sm:px-2 text-xs sm:text-sm md:text-base font-semibold transition-colors duration-200 focus:outline-none whitespace-nowrap ${
                activeTab === "user-management"
                  ? "border-primary-light dark:border-primary-dark text-primary-light dark:text-primary-dark"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"
              }`}
              onClick={() => setActiveTab("user-management")}
            >
              <span className="hidden sm:inline">회원 관리</span>
              <span className="sm:hidden">회원</span>
            </button>
            <button
              className={`shrink-0 border-b-2 py-3 sm:py-4 px-1 sm:px-2 text-xs sm:text-sm md:text-base font-semibold transition-colors duration-200 focus:outline-none whitespace-nowrap ${
                activeTab === "report-management"
                  ? "border-primary-light dark:border-primary-dark text-primary-light dark:text-primary-dark"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"
              }`}
              onClick={() => setActiveTab("report-management")}
            >
              <span className="hidden sm:inline">신고 관리</span>
              <span className="sm:hidden">신고</span>
            </button>
            <button
              className={`shrink-0 border-b-2 py-3 sm:py-4 px-1 sm:px-2 text-xs sm:text-sm md:text-base font-semibold transition-colors duration-200 focus:outline-none whitespace-nowrap ${
                activeTab === "system-region"
                  ? "border-primary-light dark:border-primary-dark text-primary-light dark:text-primary-dark"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"
              }`}
              onClick={() => setActiveTab("system-region")}
            >
              <span className="hidden sm:inline">시스템 지역 설정</span>
              <span className="sm:hidden">지역 설정</span>
            </button>
          </nav>
        </div>
      </div>

      <div className="bg-white dark:bg-[#292929] rounded-b-lg shadow-lg px-2 sm:px-4 md:px-6 pb-4 sm:pb-6 pt-4 sm:pt-6 min-h-[500px]">
        {activeTab === "store-approval" && (
          <div className="space-y-6">
            <p className="text-gray-600 dark:text-gray-300">승인 대기 중인 매장 등록 요청을 관리합니다.</p>

            {/* 매장 승인 대기 목록 */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">승인 대기 매장 목록</h3>
                <button
                  onClick={() => {
                    // TODO: 데이터 새로고침 기능
                    console.log("새로고침");
                  }}
                  className="flex items-center gap-2 px-2 py-1 bg-none hover:bg-primary-light hover:text-white dark:hover:text-black dark:hover:bg-primary-dark text-black dark:text-white rounded-full duration-200"
                >
                  새로고침
                  <TbReload className="w-5 h-5" />
                </button>
              </div>

              {pendingStores.length === 0 ? (
                <div className="bg-gray-50 dark:bg-background-dark rounded-lg p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-200">승인 대기 중인 매장이 없습니다.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-[#454545] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-[#454545]">
                      <thead className="bg-gray-50 dark:bg-[#454545]">
                        <tr>
                          <th className="px-2 sm:px-4 md:px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            매장명
                          </th>
                          <th className="px-2 sm:px-4 md:px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            지역
                          </th>
                          <th className="hidden sm:table-cell px-2 sm:px-4 md:px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            연락처
                          </th>
                          <th className="hidden md:table-cell px-2 sm:px-4 md:px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            사용자 이메일
                          </th>
                          <th className="px-2 sm:px-4 md:px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            등록일
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-background-dark divide-y divide-gray-200 dark:divide-gray-400">
                        {pendingStores.map((store) => (
                          <tr
                            key={store.id}
                            className="hover:bg-gray-50 dark:hover:bg-primary-dark/10 cursor-pointer"
                            onClick={() => {
                              setSelectedStore(store);
                              setShowModal(true);
                            }}
                          >
                            <td className="px-2 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-gray-900 dark:text-gray-100">
                              {store.name}
                            </td>
                            <td className="px-2 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-300">
                              {store.regionName}
                            </td>
                            <td className="hidden sm:table-cell px-2 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-300">
                              {store.contact}
                            </td>
                            <td className="hidden md:table-cell px-2 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-300">
                              {store.userEmail}
                            </td>
                            <td className="px-2 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-300">
                              {new Date(store.createdAt).toLocaleDateString("ko-KR", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "master-data-management" && <MasterDataManager />}

        {activeTab === "user-management" && <UserManagement />}

        {activeTab === "report-management" && <ReportManagement />}

        {activeTab === "system-region" && (
          <div className="space-y-6">
            <p className="text-gray-600 dark:text-gray-300">
              공공 API의 모든 법정동 데이터를 가져와 DB에 저장합니다. (10 ~ 20분정도 소요됩니다.)
            </p>
            <button
              onClick={syncRegionDataToDb}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
              disabled={syncing}
            >
              {syncing ? "동기화 진행 중..." : "법정동 데이터 DB 동기화"}
            </button>

            {syncResult && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-blue-700 dark:text-blue-300 font-bold">{syncResult}</p>
              </div>
            )}
            {syncError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-700 dark:text-red-300">{syncError}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 매장 상세정보 모달 */}
      <StoreDetailModal isOpen={showModal} onClose={() => setShowModal(false)} storeId={selectedStore?.id ?? -1} />
    </div>
  );
};

export default AdminPage;
