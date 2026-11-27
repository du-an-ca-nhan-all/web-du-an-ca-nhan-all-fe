import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { AccountResponse, ServiceRolesCatalogResponse } from '../types/api';
import { useAuth } from '../context/AuthContext';
import { ApiClientError, getServiceRolesCatalog } from '../services/accountApi';

interface RolesCatalogViewProps {
  catalog: ServiceRolesCatalogResponse | null;
  accounts: AccountResponse[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onJumpToServiceAccounts: (serviceCode: string) => void;
}

export function RolesCatalogView({
  catalog,
  accounts,
  loading,
  error,
  onRefresh,
  onJumpToServiceAccounts,
}: RolesCatalogViewProps) {
  const { serverConfig, session } = useAuth();
  const [queryInput, setQueryInput] = useState('');
  const [activeServerQuery, setActiveServerQuery] = useState('');
  const [filteredCatalog, setFilteredCatalog] = useState<ServiceRolesCatalogResponse | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  const displayedCatalog = activeServerQuery ? filteredCatalog : catalog;

  const accountCountsByService = useMemo(() => {
    const counts: Record<string, number> = {};
    accounts.forEach((acc) => {
      Object.keys(acc.serviceRoles || {}).forEach((svc) => {
        counts[svc] = (counts[svc] || 0) + 1;
      });
    });
    return counts;
  }, [accounts]);

  const serviceEntries = useMemo(() => {
    if (!displayedCatalog?.serviceRoles) return [];
    return Object.entries(displayedCatalog.serviceRoles).sort(([a], [b]) => a.localeCompare(b));
  }, [displayedCatalog]);

  const handleServerQuery = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = queryInput.trim();
    setQueryError(null);

    if (!trimmed) {
      setActiveServerQuery('');
      setFilteredCatalog(null);
      return;
    }

    setQueryLoading(true);
    try {
      const result = await getServiceRolesCatalog(serverConfig, trimmed, session);
      setActiveServerQuery(trimmed);
      setFilteredCatalog(result);
    } catch (err) {
      setQueryError(
        err instanceof ApiClientError
          ? err.message
          : 'Không thể truy vấn danh mục vai trò cho mã dịch vụ này.'
      );
    } finally {
      setQueryLoading(false);
    }
  };

  const handleResetQuery = () => {
    setQueryInput('');
    setActiveServerQuery('');
    setFilteredCatalog(null);
    setQueryError(null);
  };

  const activeError = queryError || error;
  const isLoading = queryLoading || (loading && !displayedCatalog);

  return (
    <div className="space-y-6">
      {/* Global role structural strip */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Vai trò toàn cục áp dụng cho mọi dịch vụ (globalRole)
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-slate-900 dark:text-slate-50">
              {displayedCatalog?.globalRole || 'SUPER_ADMIN'}
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          {serviceEntries.length} dịch vụ trong danh mục · GET /v1/account/roles
        </div>
      </div>

      {/* Live query form for GET /v1/account/roles?serviceCode=... */}
      <form
        onSubmit={handleServerQuery}
        className="flex flex-col sm:flex-row sm:items-center gap-2.5"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Truy vấn theo mã serviceCode (ví dụ: VIDEOS_MANAGE)..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] pl-9 pr-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={queryLoading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-medium text-white disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
          >
            {queryLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Tra cứu API
          </button>
          {activeServerQuery && (
            <button
              type="button"
              onClick={handleResetQuery}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <X className="h-3.5 w-3.5" />
              Xem tất cả
            </button>
          )}
        </div>
      </form>

      {activeError && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/75 dark:bg-red-950/35 px-4 py-3 text-xs text-red-900 dark:text-red-300"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{activeError}</span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 dark:border-red-800 px-3 py-1.5 text-xs font-medium hover:bg-red-100/70 dark:hover:bg-red-900/40 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Tải lại
          </button>
        </div>
      )}

      {/* Services & Roles Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-xs font-medium text-slate-600 dark:text-slate-400">
                <th className="py-3 pl-5 pr-4 whitespace-nowrap">Mã dịch vụ (serviceCode)</th>
                <th className="py-3 px-4 whitespace-nowrap">Danh sách vai trò hợp lệ</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Số tài khoản đang giữ quyền</th>
                <th className="py-3 pl-4 pr-5 text-right whitespace-nowrap">Liên kết nhanh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="h-[52px]">
                    <td className="py-3 pl-5 pr-4">
                      <div className="h-3.5 w-36 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3.5 w-60 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="ml-auto h-3.5 w-10 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                    </td>
                    <td className="py-3 pl-4 pr-5 text-right">
                      <div className="ml-auto h-3.5 w-24 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : serviceEntries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <p className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {activeServerQuery
                        ? `Không tìm thấy cấu hình role cho "${activeServerQuery}"`
                        : 'Danh mục role theo dịch vụ đang trống'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {activeServerQuery
                        ? 'Kiểm tra lại chính tả mã serviceCode hoặc xóa điều kiện truy vấn.'
                        : 'Backend chưa trả về mã dịch vụ nào trong endpoint /v1/account/roles.'}
                    </p>
                    {activeServerQuery && (
                      <button
                        type="button"
                        onClick={handleResetQuery}
                        className="mt-4 rounded-lg border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        Hiển thị toàn bộ dịch vụ
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                serviceEntries.map(([serviceCode, roles]) => {
                  const assignedCount = accountCountsByService[serviceCode] || 0;
                  return (
                    <tr
                      key={serviceCode}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/45 transition-colors"
                    >
                      <td className="py-3.5 pl-5 pr-4 font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {serviceCode}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {Array.isArray(roles) && roles.length > 0 ? (
                          roles.join(' · ')
                        ) : (
                          <span className="font-sans text-slate-400">Chưa khai báo role</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                        {assignedCount}
                      </td>
                      <td className="py-3.5 pl-4 pr-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onJumpToServiceAccounts(serviceCode)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        >
                          Xem tài khoản
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
