import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertCircle,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import type { AccountResponse, ServiceRolesCatalogResponse } from '../types/api';
import {
  ApiClientError,
  assignServiceRole,
  getAccountById,
  removeServiceRole,
} from '../services/accountApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDateTime, getStatusDisplay } from '../utils/format';

interface AccountInspectorDrawerProps {
  account: AccountResponse | null;
  catalog: ServiceRolesCatalogResponse | null;
  knownServices: string[];
  onClose: () => void;
  onAccountUpdated: (updated: AccountResponse) => void;
  onAuthFailure: (message: string) => void;
}

export function AccountInspectorDrawer({
  account,
  catalog,
  knownServices,
  onClose,
  onAccountUpdated,
  onAuthFailure,
}: AccountInspectorDrawerProps) {
  const { serverConfig, session } = useAuth();
  const { notify } = useToast();

  const [detail, setDetail] = useState<AccountResponse | null>(account);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Assign role form state
  const [useCustomService, setUseCustomService] = useState(false);
  const [selectedService, setSelectedService] = useState('');
  const [customService, setCustomService] = useState('');
  const [useCustomRole, setUseCustomRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Remove role confirmation state
  const [confirmRemoveService, setConfirmRemoveService] = useState<string | null>(null);
  const [removingService, setRemovingService] = useState<string | null>(null);

  const serviceOptions = useMemo(() => {
    const set = new Set<string>(knownServices);
    if (catalog?.serviceRoles) {
      Object.keys(catalog.serviceRoles).forEach((s) => set.add(s));
    }
    if (detail?.serviceRoles) {
      Object.keys(detail.serviceRoles).forEach((s) => set.add(s));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [catalog, detail, knownServices]);

  const activeServiceCode = useCustomService ? customService.trim() : selectedService;

  const roleOptionsForService = useMemo(() => {
    if (!activeServiceCode || !catalog?.serviceRoles) return [];
    return catalog.serviceRoles[activeServiceCode] ?? [];
  }, [activeServiceCode, catalog]);

  // Sync drawer when selected account changes and fetch latest from GET /v1/account/{id}
  useEffect(() => {
    if (!account) {
      setDetail(null);
      return;
    }
    setDetail(account);
    setFetchError(null);
    setAssignError(null);
    setConfirmRemoveService(null);

    if (!session) return;
    let cancelled = false;

    const loadFresh = async () => {
      setRefreshing(true);
      try {
        const fresh = await getAccountById(serverConfig, session, account.id);
        if (!cancelled) {
          setDetail(fresh);
          onAccountUpdated(fresh);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
          onAuthFailure(err.message);
          return;
        }
        setFetchError(
          err instanceof ApiClientError
            ? err.message
            : 'Không thể tải thông tin chi tiết mới nhất từ máy chủ.'
        );
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    };

    void loadFresh();
    return () => {
      cancelled = true;
    };
  }, [account?.id]);

  // Default service selection when options load
  useEffect(() => {
    if (!useCustomService && !selectedService && serviceOptions.length > 0) {
      setSelectedService(serviceOptions[0]);
    }
    if (serviceOptions.length === 0) {
      setUseCustomService(true);
    }
  }, [serviceOptions, selectedService, useCustomService]);

  // Sync role dropdown when selected service changes
  useEffect(() => {
    if (roleOptionsForService.length > 0) {
      setUseCustomRole(false);
      const currentAssigned = detail?.serviceRoles?.[activeServiceCode];
      if (currentAssigned && roleOptionsForService.includes(currentAssigned)) {
        setSelectedRole(currentAssigned);
      } else {
        setSelectedRole(roleOptionsForService[0]);
      }
    } else {
      setUseCustomRole(true);
      setSelectedRole('');
    }
  }, [activeServiceCode, roleOptionsForService, detail?.id]);

  // Close drawer on Escape
  useEffect(() => {
    if (!account) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [account, onClose]);

  if (!account || !detail) return null;

  const statusInfo = getStatusDisplay(detail.status);
  const roleEntries = Object.entries(detail.serviceRoles || {}).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  const handleManualRefresh = async () => {
    if (!session) return;
    setRefreshing(true);
    setFetchError(null);
    try {
      const fresh = await getAccountById(serverConfig, session, detail.id);
      setDetail(fresh);
      onAccountUpdated(fresh);
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      setFetchError(
        err instanceof ApiClientError ? err.message : 'Không thể làm mới chi tiết tài khoản.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleAssignSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!session) return;

    const targetService = (useCustomService ? customService : selectedService).trim();
    const targetRole = (useCustomRole ? customRole : selectedRole).trim();

    if (!targetService || !targetRole) {
      setAssignError('Vui lòng chọn hoặc nhập đầy đủ Mã dịch vụ và Vai trò.');
      return;
    }

    setAssigning(true);
    setAssignError(null);
    try {
      const updated = await assignServiceRole(serverConfig, session, detail.id, {
        serviceCode: targetService,
        role: targetRole,
      });
      setDetail(updated);
      onAccountUpdated(updated);
      setCustomService('');
      setCustomRole('');
      notify({
        tone: 'success',
        title: 'Đã cập nhật phân quyền',
        description: `${updated.username} · ${targetService} → ${targetRole}`,
      });
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      const message =
        err instanceof ApiClientError ? err.message : 'Không thể gán vai trò cho tài khoản.';
      setAssignError(message);
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveRole = async (serviceCode: string) => {
    if (!session) return;
    setRemovingService(serviceCode);
    setAssignError(null);
    try {
      const updated = await removeServiceRole(serverConfig, session, detail.id, serviceCode);
      setDetail(updated);
      onAccountUpdated(updated);
      setConfirmRemoveService(null);
      notify({
        tone: 'info',
        title: 'Đã gỡ quyền dịch vụ',
        description: `Đã xóa quyền trên ${serviceCode} của ${updated.username}.`,
      });
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        onAuthFailure(err.message);
        return;
      }
      const message =
        err instanceof ApiClientError ? err.message : 'Không thể gỡ vai trò của tài khoản.';
      setAssignError(message);
    } finally {
      setRemovingService(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-slate-950/40 dark:bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-account-title"
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-2xl"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="min-w-0">
            <h2
              id="drawer-account-title"
              className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 truncate"
            >
              {detail.username}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              ID #{detail.id}
              {detail.fullName ? ` · ${detail.fullName}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              title="Tải lại từ GET /v1/account/{id}"
              className="rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng chi tiết tài khoản"
              className="rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Drawer scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
          {fetchError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 px-3.5 py-2.5 text-xs text-red-800 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{fetchError}</span>
            </div>
          )}

          {/* Account metadata section */}
          <section className="space-y-3">
            <h3 className="font-display text-xs font-semibold text-slate-500 dark:text-slate-400">
              Thông tin tài khoản
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 border-y border-slate-200 dark:border-slate-800 py-4 text-sm">
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Tên đăng nhập</dt>
                <dd className="mt-0.5 font-mono text-xs font-medium text-slate-900 dark:text-slate-100">
                  {detail.username}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Trạng thái</dt>
                <dd className={`mt-0.5 text-xs font-semibold ${statusInfo.textClass}`}>
                  {statusInfo.label} ({detail.status})
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Họ và tên</dt>
                <dd className="mt-0.5 text-xs text-slate-900 dark:text-slate-100">
                  {detail.fullName || 'Chưa cập nhật'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Email</dt>
                <dd className="mt-0.5 text-xs text-slate-900 dark:text-slate-100 break-all">
                  {detail.email || 'Chưa cập nhật'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Cấp độ hệ thống</dt>
                <dd className="mt-0.5 text-xs font-medium text-slate-900 dark:text-slate-100">
                  {detail.isSuperAdmin ? (
                    <span className="inline-flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-semibold">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Super Admin (Toàn quyền)
                    </span>
                  ) : (
                    'Tài khoản tiêu chuẩn'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Thời gian tạo</dt>
                <dd className="mt-0.5 font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300">
                  {formatDateTime(detail.createdAt)}
                </dd>
              </div>
            </dl>
          </section>

          {/* Current service roles list */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xs font-semibold text-slate-500 dark:text-slate-400">
                Vai trò theo dịch vụ ({roleEntries.length})
              </h3>
              {detail.isSuperAdmin && (
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  Mặc định có quyền SUPER_ADMIN ở mọi dịch vụ
                </span>
              )}
            </div>

            {roleEntries.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 px-4 py-6 text-center">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Tài khoản này chưa được gán vai trò cụ thể trên dịch vụ nào.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
                {roleEntries.map(([serviceCode, role]) => {
                  const isConfirming = confirmRemoveService === serviceCode;
                  const isRemoving = removingService === serviceCode;
                  return (
                    <div
                      key={serviceCode}
                      className="flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-[#0F172A]"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {serviceCode}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                          Vai trò:{' '}
                          <span className="font-mono font-medium text-blue-700 dark:text-blue-400">
                            {role}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isConfirming ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRemoveRole(serviceCode)}
                              disabled={isRemoving}
                              className="inline-flex items-center gap-1 rounded-md bg-red-600 hover:bg-red-700 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-60 transition-colors whitespace-nowrap"
                            >
                              {isRemoving && <Loader2 className="h-3 w-3 animate-spin" />}
                              Xác nhận gỡ
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRemoveService(null)}
                              disabled={isRemoving}
                              className="rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                            >
                              Hủy
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setUseCustomService(!serviceOptions.includes(serviceCode));
                                if (serviceOptions.includes(serviceCode)) {
                                  setSelectedService(serviceCode);
                                } else {
                                  setCustomService(serviceCode);
                                }
                                const catalogRoles = catalog?.serviceRoles?.[serviceCode] ?? [];
                                if (catalogRoles.includes(role)) {
                                  setUseCustomRole(false);
                                  setSelectedRole(role);
                                } else {
                                  setUseCustomRole(true);
                                  setCustomRole(role);
                                }
                              }}
                              className="rounded-md border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                            >
                              Đổi role
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRemoveService(serviceCode)}
                              aria-label={`Gỡ quyền trên ${serviceCode}`}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors whitespace-nowrap"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Gỡ
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Assign / update service role form */}
          <section className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-6">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Gán hoặc cập nhật vai trò dịch vụ
              </h3>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                Gửi yêu cầu <span className="font-mono">PUT /v1/account/{detail.id}/roles</span>. Nếu dịch vụ đã có role, hệ thống sẽ cập nhật sang vai trò mới.
              </p>
            </div>

            {assignError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 px-3.5 py-2.5 text-xs text-red-800 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{assignError}</span>
              </div>
            )}

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Mã dịch vụ (serviceCode)
                  </label>
                  {serviceOptions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setUseCustomService((prev) => !prev)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
                      {useCustomService ? 'Chọn từ danh mục' : 'Nhập mã tùy chỉnh'}
                    </button>
                  )}
                </div>

                {useCustomService ? (
                  <input
                    type="text"
                    required
                    value={customService}
                    onChange={(e) => setCustomService(e.target.value)}
                    placeholder="Ví dụ: VIDEOS_MANAGE"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  />
                ) : (
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  >
                    {serviceOptions.map((svc) => (
                      <option key={svc} value={svc}>
                        {svc}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Vai trò muốn gán (role)
                  </label>
                  {roleOptionsForService.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setUseCustomRole((prev) => !prev)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
                      {useCustomRole ? 'Chọn từ danh mục' : 'Nhập vai trò khác'}
                    </button>
                  )}
                </div>

                {useCustomRole || roleOptionsForService.length === 0 ? (
                  <input
                    type="text"
                    required
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    placeholder="Ví dụ: ADMIN, MODERATOR, VIP, USER"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  />
                ) : (
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  >
                    {roleOptionsForService.map((roleName) => (
                      <option key={roleName} value={roleName}>
                        {roleName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button
                type="submit"
                disabled={assigning}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 px-4 py-2.5 text-xs font-medium text-white disabled:opacity-60 transition-colors"
              >
                {assigning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {assigning ? 'Đang lưu phân quyền...' : 'Lưu phân quyền'}
              </button>
            </form>
          </section>
        </div>
      </aside>
    </div>
  );
}
