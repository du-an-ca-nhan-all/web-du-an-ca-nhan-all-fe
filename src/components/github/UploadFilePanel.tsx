import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, FormEvent } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  File as FileIcon,
  Image as ImageIcon,
  Loader2,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  ApiClientError,
  executeApi,
  useBackendClient,
  type GitHubUploadResponse,
  type RepositoryEntity,
  type UploadFileParams,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDateTime, formatFileSize } from '../../utils/format';

interface UploadFilePanelProps {
  repos: RepositoryEntity[];
  activeOrg: string;
  onAuthFailure: (message: string) => void;
}

interface UploadedHistoryEntry {
  id: string;
  uploadedAt: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  repositoryRequested?: string;
  response: GitHubUploadResponse;
}

const HISTORY_STORAGE_KEY = 'sac_github_upload_history';
const MAX_HISTORY_ITEMS = 25;

function loadUploadHistory(): UploadedHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUploadHistory(items: UploadedHistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items.slice(0, MAX_HISTORY_ITEMS)));
  } catch {
    // Ignore storage quota errors
  }
}

function isImageMimeOrName(mime?: string, name?: string): boolean {
  if (mime && mime.startsWith('image/')) return true;
  if (!name) return false;
  return /\.(png|jpe?g|gif|webp|avif|svg|bmp|ico)$/i.test(name);
}

function getPrimaryAccessUrl(response: GitHubUploadResponse): string | null {
  return (
    response.content?.domain_url ||
    response.content?.download_url ||
    response.content?.html_url ||
    null
  );
}

export function UploadFilePanel({ repos, activeOrg, onAuthFailure }: UploadFilePanelProps) {
  const { serverConfig } = useAuth();
  const { v1 } = useBackendClient();
  const { notify } = useToast();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Collapsible advanced upload options
  const [showOptions, setShowOptions] = useState(false);
  const [useCustomRepo, setUseCustomRepo] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [customRepo, setCustomRepo] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [randomFileName, setRandomFileName] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(
    null
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [history, setHistory] = useState<UploadedHistoryEntry[]>(loadUploadHistory);
  const [latestEntry, setLatestEntry] = useState<UploadedHistoryEntry | null>(() => {
    const initial = loadUploadHistory();
    return initial[0] ?? null;
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [brokenPreviewIds, setBrokenPreviewIds] = useState<Record<string, boolean>>({});

  const firstFilePreviewUrl = useMemo(() => {
    const first = selectedFiles[0];
    if (!first || !isImageMimeOrName(first.type, first.name)) return null;
    return URL.createObjectURL(first);
  }, [selectedFiles]);

  useEffect(() => {
    return () => {
      if (firstFilePreviewUrl) {
        URL.revokeObjectURL(firstFilePreviewUrl);
      }
    };
  }, [firstFilePreviewUrl]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      const files = Array.from(event.clipboardData?.files || []);
      if (files.length > 0) {
        setUploadError(null);
        setSelectedFiles((prev) => [...prev, ...files]);
        notify({
          tone: 'info',
          title: `Đã dán ${files.length} tệp từ clipboard`,
          description: files[0].name || 'clipboard-file',
        });
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [notify]);

  const repoOptions = useMemo(() => {
    return repos
      .map((repo) => {
        const slug =
          repo.fullRepository ||
          (repo.org && repo.repoName
            ? `${repo.org}/${repo.repoName}`
            : activeOrg && repo.repoName
              ? `${activeOrg}/${repo.repoName}`
              : '');
        return {
          slug,
          domain: repo.domain?.trim() || '',
        };
      })
      .filter((item) => item.slug.length > 0);
  }, [repos, activeOrg]);

  const addFiles = (incoming: FileList | File[]) => {
    const list = Array.from(incoming);
    if (list.length === 0) return;
    setUploadError(null);
    setSelectedFiles((prev) => [...prev, ...list]);
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      addFiles(event.target.files);
      event.target.value = '';
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files) {
      addFiles(event.dataTransfer.files);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      notify({
        tone: 'info',
        title: 'Đã sao chép liên kết',
        description: text,
      });
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 1800);
    } catch {
      notify({
        tone: 'error',
        title: 'Không thể sao chép vào khay nhớ tạm',
      });
    }
  };

  const handleUploadSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setUploadError(null);

    if (selectedFiles.length === 0) {
      setUploadError('Vui lòng chọn ít nhất một tệp để tải lên.');
      return;
    }

    const repositoryTarget = (useCustomRepo ? customRepo : selectedRepo).trim();
    const cleanPath = folderPath.trim().replace(/^\/+|\/+$/g, '');
    const cleanMessage = commitMessage.trim();

    const queryParams: UploadFileParams = {
      randomFileName,
      ...(cleanPath ? { path: cleanPath } : {}),
      ...(cleanMessage ? { commitMessage: cleanMessage } : {}),
      ...(repositoryTarget ? { repository: repositoryTarget } : {}),
    };

    setUploading(true);
    setUploadProgress({ current: 0, total: selectedFiles.length });

    const createdEntries: UploadedHistoryEntry[] = [];
    const failedFiles: File[] = [];
    let lastErrorMsg: string | null = null;

    for (let i = 0; i < selectedFiles.length; i += 1) {
      const file = selectedFiles[i];
      setUploadProgress({ current: i + 1, total: selectedFiles.length });

      try {
        const response = await executeApi(
          v1.uploadFile(queryParams, { file }),
          serverConfig.useProxy
        );

        const entry: UploadedHistoryEntry = {
          id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
          uploadedAt: new Date().toISOString(),
          originalFileName: file.name,
          mimeType: file.type,
          fileSize: response.content?.size ?? file.size,
          repositoryRequested: repositoryTarget || undefined,
          response,
        };
        createdEntries.push(entry);
      } catch (err) {
        if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
          onAuthFailure(err.message);
          setUploading(false);
          setUploadProgress(null);
          return;
        }
        failedFiles.push(file);
        lastErrorMsg =
          err instanceof ApiClientError
            ? `${file.name}: ${err.message}`
            : `${file.name}: Tải lên thất bại.`;
      }
    }

    if (createdEntries.length > 0) {
      const newestFirst = [...createdEntries].reverse();
      setLatestEntry(newestFirst[0]);
      setHistory((prev) => {
        const next = [...newestFirst, ...prev].slice(0, MAX_HISTORY_ITEMS);
        saveUploadHistory(next);
        return next;
      });

      const primaryUrl = getPrimaryAccessUrl(newestFirst[0].response);
      notify({
        tone: 'success',
        title:
          createdEntries.length === 1
            ? 'Tải file lên thành công'
            : `Đã tải lên ${createdEntries.length}/${selectedFiles.length} tệp`,
        description: primaryUrl || newestFirst[0].originalFileName,
      });
    }

    if (failedFiles.length > 0 && lastErrorMsg) {
      setUploadError(lastErrorMsg);
      setSelectedFiles(failedFiles);
    } else {
      setSelectedFiles([]);
    }

    setUploading(false);
    setUploadProgress(null);
  };

  const handleClearHistory = () => {
    setHistory([]);
    setLatestEntry(null);
    saveUploadHistory([]);
  };

  const handleRemoveHistoryItem = (id: string) => {
    setHistory((prev) => {
      const next = prev.filter((item) => item.id !== id);
      saveUploadHistory(next);
      if (latestEntry?.id === id) {
        setLatestEntry(next[0] ?? null);
      }
      return next;
    });
  };

  const activeRepoSummary = (useCustomRepo ? customRepo : selectedRepo).trim() || 'Tự động';
  const activePathSummary = folderPath.trim().replace(/^\/+|\/+$/g, '') || '/';

  const latestPrimaryUrl = latestEntry ? getPrimaryAccessUrl(latestEntry.response) : null;
  const latestIsImage = latestEntry
    ? isImageMimeOrName(
        latestEntry.mimeType,
        latestEntry.response.content?.name || latestEntry.originalFileName
      )
    : false;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left: Focused Upload Zone */}
      <section className="xl:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-4">
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Tải tệp lên CDN GitHub
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Kéo thả, chọn tệp hoặc dán trực tiếp bằng <kbd className="rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[10px]">Ctrl+V</kbd>
          </p>
        </div>

        {uploadError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/75 dark:bg-red-950/35 px-3.5 py-2.5 text-xs text-red-900 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
              isDragging
                ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 scale-[1.01]'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-[#090D16]/60 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/30 dark:hover:bg-blue-950/15'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Upload className="h-5 w-5" />
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-900 dark:text-slate-100">
              Nhấn để chọn tệp hoặc kéo thả vào đây
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Hỗ trợ tải nhiều tệp cùng lúc · Tự động sinh link công khai
            </p>
          </div>

          {/* Selected files queue */}
          {selectedFiles.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
              {selectedFiles.map((file, index) => {
                const isImg = isImageMimeOrName(file.type, file.name);
                return (
                  <div
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white dark:bg-[#090D16]/50"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {index === 0 && firstFilePreviewUrl ? (
                        <img
                          src={firstFilePreviewUrl}
                          alt={file.name}
                          referrerPolicy="no-referrer"
                          className="h-9 w-9 rounded-lg object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                        />
                      ) : isImg ? (
                        <ImageIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      ) : (
                        <FileIcon className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                          {file.name}
                        </p>
                        <p className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSelectedFile(index)}
                      disabled={uploading}
                      aria-label={`Bỏ chọn ${file.name}`}
                      className="cursor-pointer rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400 disabled:opacity-50 transition-colors shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Collapsible Advanced Options */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowOptions((prev) => !prev)}
              className="cursor-pointer w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors"
            >
              <span className="flex items-center gap-2 min-w-0">
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Tùy chọn lưu trữ</span>
                <span className="truncate font-mono text-[11px] font-normal text-slate-500 dark:text-slate-400">
                  ({activeRepoSummary} · {activePathSummary}
                  {randomFileName ? ' · đổi tên ngẫu nhiên' : ''})
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-150 ${
                  showOptions ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showOptions && (
              <div className="border-t border-slate-200 dark:border-slate-800 px-3.5 py-3.5 space-y-3.5 bg-white dark:bg-[#0F172A]/60">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="upload-repo"
                      className="text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Repository đích
                    </label>
                    {repoOptions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setUseCustomRepo((prev) => !prev)}
                        className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {useCustomRepo ? 'Chọn từ danh sách' : 'Nhập tay'}
                      </button>
                    )}
                  </div>

                  {useCustomRepo || repoOptions.length === 0 ? (
                    <input
                      id="upload-repo"
                      type="text"
                      value={customRepo}
                      onChange={(e) => setCustomRepo(e.target.value)}
                      placeholder="Để trống = hệ thống tự chọn ngẫu nhiên"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                    />
                  ) : (
                    <select
                      id="upload-repo"
                      value={selectedRepo}
                      onChange={(e) => setSelectedRepo(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                    >
                      <option value="">Tự động chọn ngẫu nhiên (mặc định)</option>
                      {repoOptions.map((item) => (
                        <option key={item.slug} value={item.slug}>
                          {item.slug}
                          {item.domain ? ` — ${item.domain}` : ' (chưa có domain)'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="upload-path"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Thư mục lưu
                    </label>
                    <input
                      id="upload-path"
                      type="text"
                      value={folderPath}
                      onChange={(e) => setFolderPath(e.target.value)}
                      placeholder="assets/images"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="upload-commit"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Ghi chú commit
                    </label>
                    <input
                      id="upload-commit"
                      type="text"
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      placeholder="Upload file via Admin"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={randomFileName}
                    onChange={(e) => setRandomFileName(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 accent-blue-600"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    Tự động đổi tên tệp ngẫu nhiên để tránh trùng lặp
                  </span>
                </label>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={uploading || selectedFiles.length === 0}
            className="cursor-pointer w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 px-4 py-2.5 text-xs font-medium text-white shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading && uploadProgress
              ? `Đang tải lên (${uploadProgress.current}/${uploadProgress.total})...`
              : selectedFiles.length > 1
                ? `Tải lên ${selectedFiles.length} tệp`
                : 'Tải lên & Lấy link'}
          </button>
        </form>
      </section>

      {/* Right: Instant Link Result + History */}
      <div className="xl:col-span-7 space-y-5">
        {latestEntry ? (
          <section className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-[#0F172A] p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {latestEntry.response.content?.name || latestEntry.originalFileName}
                  </h3>
                  <p className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                    {formatFileSize(latestEntry.fileSize)} · {formatDateTime(latestEntry.uploadedAt)}
                  </p>
                </div>
              </div>
              {latestPrimaryUrl && (
                <button
                  type="button"
                  onClick={() => void handleCopy(latestPrimaryUrl, `latest-primary-${latestEntry.id}`)}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0"
                >
                  {copiedKey === `latest-primary-${latestEntry.id}` ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Đã sao chép
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Sao chép link
                    </>
                  )}
                </button>
              )}
            </div>

            {latestPrimaryUrl && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090D16] px-3.5 py-3 space-y-1">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {latestEntry.response.content?.domain_url
                    ? 'Link truy cập công khai (Domain CDN)'
                    : 'Link truy cập trực tiếp (Raw URL)'}
                </p>
                <a
                  href={latestPrimaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline break-all"
                >
                  <span>{latestPrimaryUrl}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              </div>
            )}

            {latestIsImage && latestPrimaryUrl && !brokenPreviewIds[latestEntry.id] && (
              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090D16] flex items-center justify-center max-h-56 p-2">
                <img
                  src={latestEntry.response.content?.download_url || latestPrimaryUrl}
                  alt={latestEntry.response.content?.name || latestEntry.originalFileName}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setBrokenPreviewIds((prev) => ({ ...prev, [latestEntry.id]: true }))
                  }
                  className="max-h-52 w-auto rounded object-contain"
                />
              </div>
            )}

            {/* Compact secondary links */}
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-[11px]">
              {latestEntry.response.content?.download_url && (
                <button
                  type="button"
                  onClick={() =>
                    void handleCopy(
                      latestEntry.response.content!.download_url!,
                      `raw-${latestEntry.id}`
                    )
                  }
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {copiedKey === `raw-${latestEntry.id}` ? (
                    <Check className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  Copy Raw URL
                </button>
              )}
              {latestEntry.response.content?.html_url && (
                <a
                  href={latestEntry.response.content.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Xem trên GitHub
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {latestEntry.response.content?.path && (
                <span className="ml-auto font-mono text-slate-400 dark:text-slate-500 truncate max-w-[220px]">
                  {latestEntry.response.content.path}
                </span>
              )}
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] px-6 py-10 text-center">
            <Upload className="mx-auto h-5 w-5 text-slate-400" />
            <p className="mt-2 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Sẵn sàng tải tệp lên
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Link truy cập công khai và ảnh xem trước sẽ xuất hiện ngay tại đây sau khi tải lên.
            </p>
          </section>
        )}

        {/* Recent Uploads History */}
        <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-3.5">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Lịch sử tải lên gần đây ({history.length})
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Lưu tối đa {MAX_HISTORY_ITEMS} tệp trên trình duyệt để tiện sao chép lại
              </p>
            </div>
            {history.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:hover:border-red-900/60 dark:hover:bg-red-950/35 dark:hover:text-red-400 transition-colors whitespace-nowrap shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Xóa tất cả
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="px-6 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              Chưa có lịch sử tải tệp nào.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs max-h-80 overflow-y-auto">
              {history.map((item) => {
                const accessUrl = getPrimaryAccessUrl(item.response);
                const isActive = latestEntry?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setLatestEntry(item)}
                    className={`cursor-pointer flex items-center justify-between gap-3 px-5 py-3 transition-colors ${
                      isActive
                        ? 'bg-blue-50/60 dark:bg-blue-950/25'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/45'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.response.content?.name || item.originalFileName}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {accessUrl || 'Không có link trả về'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {accessUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleCopy(accessUrl, `hist-${item.id}`);
                          }}
                          title="Sao chép link"
                          className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          {copiedKey === `hist-${item.id}` ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          Chép
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveHistoryItem(item.id);
                        }}
                        aria-label="Xóa khỏi lịch sử"
                        className="cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
