import { useState } from 'react';
import { Check, Copy, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDateTime, formatDurationSeconds } from '../utils/format';
import { ServerConfigControl } from './ServerConfigControl';

export function ConnectionSettingsView() {
  const { serverConfig, session, updateServerConfig, logout } = useAuth();
  const { notify } = useToast();
  const [copiedToken, setCopiedToken] = useState(false);

  if (!session) return null;

  const remainingSeconds = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
  const maskedToken =
    session.accessToken.length > 28
      ? `${session.accessToken.slice(0, 18)}••••••••••••${session.accessToken.slice(-10)}`
      : '••••••••••••••••';

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(session.accessToken);
      setCopiedToken(true);
      notify({
        tone: 'info',
        title: 'Đã sao chép JWT Access Token',
        description: 'Chỉ sử dụng token này để kiểm thử nội bộ với quyền Super Admin.',
      });
      window.setTimeout(() => setCopiedToken(false), 2000);
    } catch {
      notify({
        tone: 'error',
        title: 'Không thể sao chép vào khay nhớ tạm',
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Active API server configuration */}
      <section className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-6 space-y-5">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Cấu hình máy chủ API
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Thay đổi địa chỉ URL máy chủ sẽ tự động kết thúc phiên hiện tại để bạn đăng nhập lại bằng JWT của môi trường mới.
          </p>
        </div>

        <ServerConfigControl value={serverConfig} onChange={updateServerConfig} />
      </section>

      {/* Current Super Admin session details */}
      <section className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Phiên Super Admin hiện tại
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Thông tin xác thực được cấp từ <span className="font-mono">POST /v1/account/login</span>
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap shrink-0">
            <ShieldCheck className="h-4 w-4" />
            SUPER_ADMIN
          </span>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 border-y border-slate-200 dark:border-slate-800 py-4 text-xs">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Tài khoản đăng nhập</dt>
            <dd className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-slate-100">
              {session.account.username} (#{session.account.id})
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Email</dt>
            <dd className="mt-0.5 text-slate-900 dark:text-slate-100 break-all">
              {session.account.email || 'Chưa cập nhật'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Dịch vụ phiên (currentService)</dt>
            <dd className="mt-0.5 font-mono text-slate-900 dark:text-slate-100">
              {session.currentService || 'Toàn hệ thống'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Vai trò phiên (currentRole)</dt>
            <dd className="mt-0.5 font-mono font-semibold text-blue-600 dark:text-blue-400">
              {session.currentRole || 'SUPER_ADMIN'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Thời hạn còn lại ước tính</dt>
            <dd className="mt-0.5 font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {formatDurationSeconds(remainingSeconds)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Hết hạn lúc</dt>
            <dd className="mt-0.5 font-mono tabular-nums text-slate-700 dark:text-slate-300">
              {formatDateTime(new Date(session.expiresAt).toISOString())}
            </dd>
          </div>
        </dl>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              JWT Bearer Token
            </span>
            <button
              type="button"
              onClick={handleCopyToken}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              {copiedToken ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Đã sao chép
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Sao chép token
                </>
              )}
            </button>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-400 truncate">
            {session.tokenType} {maskedToken}
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => logout('Bạn đã đăng xuất khỏi phiên Super Admin.')}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/60 px-4 py-2 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/35 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Đăng xuất khỏi phiên này
          </button>
        </div>
      </section>
    </div>
  );
}
