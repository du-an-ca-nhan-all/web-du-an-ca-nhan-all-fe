import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { AccountResponse } from '../types/api';
import { formatShortDate, getStatusDisplay } from '../utils/format';

interface AccountsViewProps {
  accounts: AccountResponse[];
  loading: boolean;
  error: string | null;
  knownServices: string[];
  serviceFilter: string;
  onServiceFilterChange: (service: string) => void;
  onSelectAccount: (account: AccountResponse) => void;
  onOpenCreate: () => void;
  onRefresh: () => void;
}

type StatusFilter = 'all' | 'active' | 'other';
type SortField = 'id' | 'username' | 'createdAt';

export function AccountsView({
  accounts,
  loading,
  error,
  knownServices,
  serviceFilter,
  onServiceFilterChange,
  onSelectAccount,
  onOpenCreate,
  onRefresh,
}: AccountsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const stats = useMemo(() => {
    const total = accounts.length;
    const superAdmins = accounts.filter((a) => a.isSuperAdmin).length;
    const active = accounts.filter((a) => (a.status || '').toUpperCase() === 'ACTIVE').length;
    const servicesUsed = new Set<string>();
    accounts.forEach((a) => {
      Object.keys(a.serviceRoles || {}).forEach((svc) => servicesUsed.add(svc));
    });
    return {
      total,
      superAdmins,
      active,
      servicesCount: servicesUsed.size,
    };
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matched = accounts.filter((acc) => {
      if (statusFilter === 'active' && (acc.status || '').toUpperCase() !== 'ACTIVE') {
        return false;
      }
      if (statusFilter === 'other' && (acc.status || '').toUpperCase() === 'ACTIVE') {
        return false;
      }

      if (serviceFilter === '__unassigned__') {
        if (Object.keys(acc.serviceRoles || {}).length > 0) return false;
      } else if (serviceFilter !== 'all') {
        if (!acc.serviceRoles || !(serviceFilter in acc.serviceRoles)) return false;
      }

      if (!q) return true;
      const roleTokens = Object.entries(acc.serviceRoles || {})
        .map(([k, v]) => `${k} ${v}`)
        .join(' ')
        .toLowerCase();

      return (
        String(acc.id).includes(q) ||
        acc.username.toLowerCase().includes(q) ||
        (acc.fullName || '').toLowerCase().includes(q) ||
        (acc.email || '').toLowerCase().includes(q) ||
        roleTokens.includes(q)
      );
    });

    return [...matched].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'id') {
        cmp = a.id - b.id;
      } else if (sortField === 'username') {
        cmp = a.username.localeCompare(b.username);
      } else {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        cmp = timeA - timeB;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [accounts, searchQuery, statusFilter, serviceFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 || statusFilter !== 'all' || serviceFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    onServiceFilterChange('all');
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 inline-block ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 inline-block ml-1" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Flat KPI strip with 1px hairline dividers (single elevation) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] divide-y lg:divide-y-0 divide-x divide-slate-200 dark:divide-slate-800">
        <div className="px-5 py-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Tổng tài khoản</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
            {loading && accounts.length === 0 ? '—' : stats.total}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Super Admin</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-blue-600 dark:text-blue-400">
            {loading && accounts.length === 0 ? '—' : stats.superAdmins}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Đang hoạt động</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
            {loading && accounts.length === 0 ? '—' : stats.active}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Dịch vụ đã gán quyền</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
            {loading && accounts.length === 0 ? '—' : stats.servicesCount}
          </p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo username, họ tên, email, ID hoặc role..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 transition-colors"
            />
          </div>

          {/* Interactive segmented filter control */}
          <div className="inline-flex items-center gap-1 rounded-lg bg-slate-200/70 dark:bg-slate-800/80 p-1 self-start sm:self-auto">
            {(
              [
                { id: 'all', label: 'Tất cả' },
                { id: 'active', label: 'Hoạt động' },
                { id: 'other', label: 'Khác' },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={serviceFilter}
            onChange={(e) => onServiceFilterChange(e.target.value)}
            aria-label="Lọc theo dịch vụ"
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
          >
            <option value="all">Tất cả dịch vụ</option>
            {knownServices.map((svc) => (
              <option key={svc} value={svc}>
                Dịch vụ: {svc}
              </option>
            ))}
            <option value="__unassigned__">Chưa gán dịch vụ nào</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <X className="h-3.5 w-3.5" />
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/75 dark:bg-red-950/35 px-4 py-3 text-xs text-red-900 dark:text-red-300"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Không thể tải danh sách tài khoản</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-red-300 dark:border-red-800 px-3 py-1.5 text-xs font-medium hover:bg-red-100/70 dark:hover:bg-red-900/40 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Thử lại
          </button>
        </div>
      )}

      {/* High-Density Data Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-xs font-medium text-slate-600 dark:text-slate-400">
                <th className="py-3 pl-5 pr-3 w-20 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('id')}
                    className="inline-flex items-center hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                  >
                    ID
                    {renderSortIcon('id')}
                  </button>
                </th>
                <th className="py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('username')}
                    className="inline-flex items-center hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                  >
                    Tài khoản
                    {renderSortIcon('username')}
                  </button>
                </th>
                <th className="py-3 px-4 whitespace-nowrap">Trạng thái</th>
                <th className="py-3 px-4 whitespace-nowrap">Phân quyền dịch vụ</th>
                <th className="py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('createdAt')}
                    className="inline-flex items-center hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                  >
                    Ngày tạo
                    {renderSortIcon('createdAt')}
                  </button>
                </th>
                <th className="py-3 pl-4 pr-5 text-right whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {loading && accounts.length === 0 ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="h-[52px]">
                    <td className="py-3 pl-5 pr-3 text-right">
                      <div className="ml-auto h-3.5 w-8 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-32 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                        <div className="h-3 w-48 rounded bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3.5 w-20 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3.5 w-44 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3.5 w-20 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                    </td>
                    <td className="py-3 pl-4 pr-5 text-right">
                      <div className="ml-auto h-3.5 w-16 rounded bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <p className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {hasActiveFilters
                        ? 'Không tìm thấy tài khoản khớp bộ lọc'
                        : 'Chưa có tài khoản nào trong hệ thống'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {hasActiveFilters
                        ? 'Thử điều chỉnh từ khóa tìm kiếm hoặc bỏ chọn bộ lọc dịch vụ/trạng thái.'
                        : 'Bắt đầu bằng cách tạo tài khoản mới qua API đăng ký trung tâm.'}
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2.5">
                      {hasActiveFilters ? (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          Xóa toàn bộ bộ lọc
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onOpenCreate}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-medium text-white transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Tạo tài khoản mới
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => {
                  const statusInfo = getStatusDisplay(acc.status);
                  const rolePairs = Object.entries(acc.serviceRoles || {});

                  return (
                    <tr
                      key={acc.id}
                      onClick={() => onSelectAccount(acc)}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/45 transition-colors"
                    >
                      <td className="py-3 pl-5 pr-3 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {acc.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {acc.username}
                          </span>
                          {acc.isSuperAdmin && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Super Admin
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                          {[acc.fullName, acc.email].filter(Boolean).join(' · ') || 'Chưa có thông tin bổ sung'}
                        </p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`font-medium ${statusInfo.textClass}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {rolePairs.length === 0 ? (
                          <span className="text-slate-400 dark:text-slate-500">
                            {acc.isSuperAdmin ? 'Toàn quyền SUPER_ADMIN' : 'Chưa gán dịch vụ'}
                          </span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                            {rolePairs.slice(0, 3).map(([svc, role], idx) => (
                              <span key={svc} className="inline-flex items-center gap-1">
                                {idx > 0 && (
                                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-600 mr-1">
                                    /
                                  </span>
                                )}
                                <span className="text-slate-500 dark:text-slate-400">{svc}:</span>
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                  {role}
                                </span>
                              </span>
                            ))}
                            {rolePairs.length > 3 && (
                              <span className="text-slate-500 dark:text-slate-400">
                                +{rolePairs.length - 3} dịch vụ khác
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatShortDate(acc.createdAt)}
                      </td>
                      <td className="py-3 pl-4 pr-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAccount(acc);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        >
                          Phân quyền
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer summary */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-5 py-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="tabular-nums">
            Hiển thị <strong className="font-semibold text-slate-800 dark:text-slate-200">{filteredAccounts.length}</strong> / {accounts.length} tài khoản
          </span>
          <span className="hidden sm:inline">Nhấp vào bất kỳ dòng nào để xem chi tiết &amp; gán quyền</span>
        </div>
      </div>
    </div>
  );
}
