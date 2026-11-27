import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LogOut,
  Menu,
  Moon,
  Plus,
  RefreshCw,
  Sun,
  X,
} from 'lucide-react';
import {
  ADMIN_MODULES,
  MODULE_GROUPS,
  type AdminModuleId,
  type ModuleGroupId,
} from '../config/modules';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  ApiClientError,
  getAllAccounts,
  getServiceRolesCatalog,
} from '../services/accountApi';
import type { AccountResponse, ServiceRolesCatalogResponse } from '../types/api';
import { AccountInspectorDrawer } from './AccountInspectorDrawer';
import { AccountsView } from './AccountsView';
import { ConnectionSettingsView } from './ConnectionSettingsView';
import { CreateAccountModal } from './CreateAccountModal';
import { GitHubUploadView } from './GitHubUploadView';
import { PlannedModuleView } from './PlannedModuleView';
import { RolesCatalogView } from './RolesCatalogView';

export function AdminShell() {
  const { session, serverConfig, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [activeModuleId, setActiveModuleId] = useState<AdminModuleId>('accounts');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Shared core data loaded from the OpenAPI backend
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<ServiceRolesCatalogResponse | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Cross-view filters & modals
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<AccountResponse | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleAuthFailure = useCallback(
    (message: string) => {
      logout(
        message ||
          'Phiên đăng nhập đã hết hạn hoặc không còn quyền Super Admin. Vui lòng đăng nhập lại.'
      );
    },
    [logout]
  );

  const fetchAccounts = useCallback(async () => {
    if (!session) return;
    setAccountsLoading(true);
    setAccountsError(null);
    try {
      const list = await getAllAccounts(serverConfig, session);
      setAccounts(list);
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        handleAuthFailure(err.message);
        return;
      }
      setAccountsError(
        err instanceof ApiClientError
          ? err.message
          : 'Không thể tải danh sách tài khoản từ máy chủ.'
      );
    } finally {
      setAccountsLoading(false);
    }
  }, [serverConfig, session, handleAuthFailure]);

  const fetchCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const data = await getServiceRolesCatalog(serverConfig, undefined, session);
      setCatalog(data);
    } catch (err) {
      setCatalogError(
        err instanceof ApiClientError
          ? err.message
          : 'Không thể tải danh mục vai trò theo dịch vụ.'
      );
    } finally {
      setCatalogLoading(false);
    }
  }, [serverConfig, session]);

  useEffect(() => {
    void fetchAccounts();
    void fetchCatalog();
  }, [fetchAccounts, fetchCatalog]);

  const knownServices = useMemo(() => {
    const set = new Set<string>();
    if (catalog?.serviceRoles) {
      Object.keys(catalog.serviceRoles).forEach((s) => set.add(s));
    }
    accounts.forEach((acc) => {
      Object.keys(acc.serviceRoles || {}).forEach((s) => set.add(s));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [accounts, catalog]);

  const activeModule = useMemo(
    () => ADMIN_MODULES.find((m) => m.id === activeModuleId) ?? ADMIN_MODULES[0],
    [activeModuleId]
  );

  const handleAccountUpdated = useCallback((updated: AccountResponse) => {
    setAccounts((prev) => {
      const exists = prev.some((item) => item.id === updated.id);
      if (!exists) return [updated, ...prev];
      return prev.map((item) => (item.id === updated.id ? updated : item));
    });
    setSelectedAccount((prev) => (prev && prev.id === updated.id ? updated : prev));
  }, []);

  const handleAccountCreated = useCallback(
    (created: AccountResponse) => {
      if (created.id) {
        setAccounts((prev) => {
          if (prev.some((item) => item.id === created.id)) return prev;
          return [...prev, created];
        });
      }
      void fetchAccounts();
    },
    [fetchAccounts]
  );

  const handleJumpToServiceAccounts = useCallback((serviceCode: string) => {
    setServiceFilter(serviceCode);
    setActiveModuleId('accounts');
  }, []);

  const handleRefreshActiveView = () => {
    if (activeModuleId === 'roles') {
      void fetchCatalog();
      void fetchAccounts();
    } else {
      void fetchAccounts();
      void fetchCatalog();
    }
  };

  const renderSidebarNavigation = () => {
    const groupOrder: ModuleGroupId[] = ['core', 'ecosystem'];

    return (
      <div className="flex h-full flex-col">
        {/* Sidebar Brand Zone — single clean wordmark */}
        <div className="flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5">
          <span className="font-display text-sm font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap shrink-0">
            Super Admin Console
          </span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Đóng thanh điều hướng"
            className="lg:hidden rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Grouped Modular Navigation */}
        <nav aria-label="Điều hướng phân hệ quản trị" className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {groupOrder.map((groupId) => {
            const items = ADMIN_MODULES.filter((mod) => mod.group === groupId);
            return (
              <div key={groupId} className="space-y-1">
                <p className="px-2.5 pb-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                  {MODULE_GROUPS[groupId].title}
                </p>
                {items.map((mod) => {
                  const Icon = mod.icon;
                  const active = mod.id === activeModuleId;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => {
                        setActiveModuleId(mod.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{mod.label}</span>
                      </span>
                      {mod.status === 'planned' && (
                        <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500 shrink-0">
                          Sắp tới
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer: Account Identity + Theme Toggle + Logout */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 space-y-2.5">
          <div className="px-2 py-1">
            <p className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
              {session?.account.username}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Super Admin · {serverConfig.preset === 'staging' ? 'Staging' : serverConfig.preset === 'local' ? 'Local' : 'Custom'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-3.5 w-3.5" />
                  Sáng
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5" />
                  Tối
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => logout('Bạn đã đăng xuất khỏi hệ thống.')}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:hover:border-red-900/60 dark:hover:bg-red-950/35 dark:hover:text-red-400 transition-colors whitespace-nowrap"
            >
              <LogOut className="h-3.5 w-3.5" />
              Thoát
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-slate-100 flex">
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:block w-[252px] shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] sticky top-0 h-screen">
        {renderSidebarNavigation()}
      </aside>

      {/* Mobile slide-over sidebar */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 flex lg:hidden bg-slate-950/45 dark:bg-black/65"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="w-[264px] max-w-[85vw] h-full border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-2xl"
          >
            {renderSidebarNavigation()}
          </aside>
        </div>
      )}

      {/* Main workspace viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on left, 1–2 primary actions on right */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xs px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Mở menu điều hướng"
              className="lg:hidden rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            >
              <Menu className="h-4 w-4" />
            </button>
            <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
              {activeModule.breadcrumb}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {(activeModuleId === 'accounts' || activeModuleId === 'roles') && (
              <button
                type="button"
                onClick={handleRefreshActiveView}
                disabled={accountsLoading || catalogLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    accountsLoading || catalogLoading ? 'animate-spin' : ''
                  }`}
                />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
            )}

            {activeModuleId === 'accounts' && (
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 px-3.5 py-1.5 text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Tạo tài khoản
              </button>
            )}
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          <div className="mx-auto max-w-6xl space-y-6">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                {activeModule.label}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {activeModule.description}
              </p>
            </div>

            {activeModuleId === 'accounts' && (
              <AccountsView
                accounts={accounts}
                loading={accountsLoading}
                error={accountsError}
                knownServices={knownServices}
                serviceFilter={serviceFilter}
                onServiceFilterChange={setServiceFilter}
                onSelectAccount={setSelectedAccount}
                onOpenCreate={() => setCreateModalOpen(true)}
                onRefresh={() => void fetchAccounts()}
              />
            )}

            {activeModuleId === 'roles' && (
              <RolesCatalogView
                catalog={catalog}
                accounts={accounts}
                loading={catalogLoading}
                error={catalogError}
                onRefresh={() => {
                  void fetchCatalog();
                  void fetchAccounts();
                }}
                onJumpToServiceAccounts={handleJumpToServiceAccounts}
              />
            )}

            {activeModuleId === 'github-upload' && (
              <GitHubUploadView onAuthFailure={handleAuthFailure} />
            )}

            {activeModuleId === 'connection-settings' && <ConnectionSettingsView />}

            {activeModule.status === 'planned' && (
              <PlannedModuleView
                moduleDef={activeModule}
                accounts={accounts}
                catalog={catalog}
                onJumpToServiceAccounts={handleJumpToServiceAccounts}
                onReturnToAccounts={() => setActiveModuleId('accounts')}
              />
            )}
          </div>
        </main>
      </div>

      {/* Account Inspector & Multi-Service Role Drawer */}
      <AccountInspectorDrawer
        account={selectedAccount}
        catalog={catalog}
        knownServices={knownServices}
        onClose={() => setSelectedAccount(null)}
        onAccountUpdated={handleAccountUpdated}
        onAuthFailure={handleAuthFailure}
      />

      {/* Create New Account Modal */}
      <CreateAccountModal
        open={createModalOpen}
        knownServices={knownServices}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleAccountCreated}
      />
    </div>
  );
}
