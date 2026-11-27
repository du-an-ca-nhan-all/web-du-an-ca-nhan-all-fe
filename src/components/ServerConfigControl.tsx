import { useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import type { ApiServerConfig, ServerPreset } from '../types/api';
import {
  ApiClientError,
  getServiceRolesCatalog,
  isLocalhostUrl,
  SERVER_PRESETS,
} from '../services/accountApi';

interface ServerConfigControlProps {
  value: ApiServerConfig;
  onChange: (next: ApiServerConfig) => void;
  compact?: boolean;
}

export function ServerConfigControl({ value, onChange, compact = false }: ServerConfigControlProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const selectPreset = (preset: ServerPreset) => {
    setTestResult(null);
    if (preset === 'staging') {
      onChange({
        preset: 'staging',
        baseUrl: SERVER_PRESETS.staging.url,
        useProxy: true,
      });
    } else if (preset === 'local') {
      onChange({
        preset: 'local',
        baseUrl: SERVER_PRESETS.local.url,
        useProxy: false,
      });
    } else {
      onChange({
        preset: 'custom',
        baseUrl: value.baseUrl,
        useProxy: !isLocalhostUrl(value.baseUrl),
      });
    }
  };

  const handleCustomUrlChange = (raw: string) => {
    setTestResult(null);
    onChange({
      preset: 'custom',
      baseUrl: raw,
      useProxy: !isLocalhostUrl(raw),
    });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const catalog = await getServiceRolesCatalog(value);
      const serviceCount = Object.keys(catalog.serviceRoles).length;
      setTestResult({
        ok: true,
        message: `Kết nối thành công · Role toàn cục: ${catalog.globalRole} · ${serviceCount} dịch vụ`,
      });
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Không thể kết nối tới máy chủ API.';
      setTestResult({ ok: false, message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
          Máy chủ API
        </label>
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={testing || !value.baseUrl.trim()}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
        >
          {testing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Kiểm tra kết nối
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 p-1">
        {(
          [
            { id: 'staging', label: 'Staging' },
            { id: 'local', label: 'Local' },
            { id: 'custom', label: 'Tùy chỉnh' },
          ] as const
        ).map((item) => {
          const active = value.preset === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectPreset(item.id)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div>
        <input
          type="url"
          value={value.baseUrl}
          onChange={(e) => handleCustomUrlChange(e.target.value)}
          readOnly={value.preset !== 'custom'}
          placeholder="https://be.quickgg.top"
          aria-label="Địa chỉ URL máy chủ API"
          className={`w-full rounded-lg border px-3 py-2 font-mono text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
            value.preset !== 'custom'
              ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] text-slate-900 dark:text-slate-100'
          }`}
        />
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={value.useProxy}
          onChange={(e) => {
            setTestResult(null);
            onChange({ ...value, useProxy: e.target.checked });
          }}
          className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 accent-blue-600"
        />
        <span className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          Chuyển tiếp qua máy chủ trung gian (tránh lỗi CORS cho Staging/Remote; nên tắt khi dùng{' '}
          <span className="font-mono text-slate-700 dark:text-slate-300">localhost</span>).
        </span>
      </label>

      {testResult && (
        <div
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
            testResult.ok
              ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
              : 'border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 text-red-800 dark:text-red-300'
          }`}
        >
          {testResult.ok ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <span className={compact ? 'leading-snug' : 'leading-relaxed'}>{testResult.message}</span>
        </div>
      )}
    </div>
  );
}
