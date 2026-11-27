import { ArrowRight, Layers } from 'lucide-react';
import type { AdminModuleDefinition } from '../config/modules';
import type { AccountResponse, ServiceRolesCatalogResponse } from '../types/api';

interface PlannedModuleViewProps {
  moduleDef: AdminModuleDefinition;
  accounts: AccountResponse[];
  catalog: ServiceRolesCatalogResponse | null;
  onJumpToServiceAccounts: (serviceCode: string) => void;
  onReturnToAccounts: () => void;
}

export function PlannedModuleView({
  moduleDef,
  accounts,
  catalog,
  onJumpToServiceAccounts,
  onReturnToAccounts,
}: PlannedModuleViewProps) {
  const serviceCode = moduleDef.serviceCodeHint;
  const assignedAccountsCount = serviceCode
    ? accounts.filter((acc) => acc.serviceRoles && serviceCode in acc.serviceRoles).length
    : 0;
  const catalogRoles = serviceCode ? catalog?.serviceRoles?.[serviceCode] ?? [] : [];

  return (
    <div className="max-w-3xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-6 sm:p-8 space-y-6">
      <div className="flex items-start gap-3.5">
        <div className="mt-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2.5 text-slate-700 dark:text-slate-300 shrink-0">
          <Layers className="h-5 w-5" />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
            Module mở rộng sẵn sàng tích hợp
          </p>
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
            {moduleDef.label}
          </h2>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {moduleDef.description} Khung điều hướng và phiên xác thực JWT Super Admin đã được tách
            module sẵn; khi bạn bổ sung tài liệu OpenAPI của dịch vụ này, các màn hình nghiệp vụ có
            thể gắn trực tiếp vào đây mà không ảnh hưởng tới phần quản trị tài khoản.
          </p>
        </div>
      </div>

      {serviceCode && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-y border-slate-200 dark:border-slate-800 py-5 text-xs">
          <div>
            <p className="text-slate-500 dark:text-slate-400">Tài khoản đang có quyền trên {serviceCode}</p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {assignedAccountsCount}
            </p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Vai trò khai báo trong Catalog</p>
            <p className="mt-1.5 font-mono text-xs text-slate-800 dark:text-slate-200">
              {catalogRoles.length > 0 ? catalogRoles.join(' · ') : 'Chưa có trong danh mục trả về'}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {serviceCode && (
          <button
            type="button"
            onClick={() => onJumpToServiceAccounts(serviceCode)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-medium text-white transition-colors whitespace-nowrap"
          >
            Xem tài khoản thuộc {serviceCode}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onReturnToAccounts}
          className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
        >
          Quay lại Quản lý tài khoản
        </button>
      </div>
    </div>
  );
}
