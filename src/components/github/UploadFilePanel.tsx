import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, FormEvent } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  File as FileIcon,
  Image as ImageIcon,
  Loader2,
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

  // UploadFileParams options
  const [useCustomRepo, setUseCustomRepo] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(''); // '' = backend auto-random
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

  // Local object URL preview for first selected image before upload
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

  // Support Ctrl+V clipboard paste for quick image/file upload
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
          title: `Đã dán ${files.length} tệp từ khay nhớ tạm`,
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

  const latestPrimaryUrl = latestEntry ? getPrimaryAccessUrl(latestEntry.response) : null;
  const latestIsImage = latestEntry
    ? isImageMimeOrName(latestEntry.mimeType, latestEntry.response.content?.name || latestEntry.originalFileName)
    : false;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left column: Upload File Form */}
      <section className="xl:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-6 space-y-5">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Tải file lên GitHub Repository
          </h2>
          <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            POST /v1/github/upload/file · multipart/form-data
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
          {/* Drag & drop / Click / Paste zone */}
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
            className={`cursor-pointer rounded-lg border border-dashed px-4 py-6 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
              isDragging
                ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30'
                : 'border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-[#090D16]/70 hover:border-blue-400 dark:hover:border-blue-700'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
            <Upload className="mx-auto h-5 w-5 text-slate-500 dark:text-slate-400" />
            <p className="mt-2 text-xs font-medium text-slate-800 dark:text-slate-200">
              Kéo thả tệp vào đây, nhấn để chọn hoặc dán ảnh (<span className="font-mono">Ctrl+V</span>)
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Hỗ trợ tải 1 hoặc nhiều tệp nhị phân/văn bản cùng lúc
            </p>
          </div>

          {/* Selected files queue */}
          {selectedFiles.length > 0 && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
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
                          className="h-9 w-9 rounded object-cover border border-slate-200 dark:border-slate-800 shrink-0"
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
                          {file.type ? ` · ${file.type}` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSelectedFile(index)}
                      disabled={uploading}
                      aria-label={`Bỏ chọn ${file.name}`}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400 disabled:opacity-50 transition-colors shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Target repository */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="upload-repo"
                className="text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Repository đích (repository)
              </label>
              {repoOptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setUseCustomRepo((prev) => !prev)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
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
                placeholder="Để trống để backend tự random 1 repo trong cấu hình"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
            ) : (
              <select
                id="upload-repo"
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              >
                <option value="">Tự động chọn ngẫu nhiên (mặc định backend)</option>
                {repoOptions.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.slug}
                    {item.domain ? ` — ${item.domain}` : ' (chưa có domain)'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Folder path & Commit message */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label
                htmlFor="upload-path"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Thư mục lưu (path)
              </label>
              <input
                id="upload-path"
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="assets/images (trống = root)"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="upload-commit"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Commit message
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

          {/* randomFileName option */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={randomFileName}
              onChange={(e) => setRandomFileName(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 accent-blue-600"
            />
            <span className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              Tự động đổi tên file ngẫu nhiên (<span className="font-mono">randomFileName</span> · prefix{' '}
              <span className="font-mono">yyyyMMddHHmmss</span> + UUID tránh trùng lặp)
            </span>
          </label>

          <button
            type="submit"
            disabled={uploading || selectedFiles.length === 0}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 px-4 py-2.5 text-xs font-medium text-white disabled:opacity-60 transition-colors"
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
                : 'Tải file lên & nhận link'}
          </button>
        </form>
      </section>

      {/* Right column: Latest Uploaded Access Link + History */}
      <div className="xl:col-span-7 space-y-6">
        {latestEntry ? (
          <section className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-[#0F172A] p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {latestEntry.response.content?.name || latestEntry.originalFileName}
                  </h3>
                  <p className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                    {formatFileSize(latestEntry.fileSize)} ·{' '}
                    {formatDateTime(latestEntry.uploadedAt)}
                  </p>
                </div>
              </div>
              {latestPrimaryUrl && (
                <button
                  type="button"
                  onClick={() => void handleCopy(latestPrimaryUrl, `latest-primary-${latestEntry.id}`)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0"
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

            {/* Primary Access URL box */}
            {latestPrimaryUrl && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090D16] px-3.5 py-3 space-y-1">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {latestEntry.response.content?.domain_url
                    ? 'Link truy cập công khai (Domain URL)'
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

            {/* Image preview if uploaded file is an image */}
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

            {/* Secondary links & metadata */}
            <dl className="grid grid-cols-1 gap-y-2.5 border-t border-slate-200 dark:border-slate-800 pt-4 text-xs">
              {latestEntry.response.content?.download_url && (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <dt className="text-[11px] text-slate-500 dark:text-slate-400">Raw Download URL</dt>
                    <dd className="mt-0.5 truncate">
                      <a
                        href={latestEntry.response.content.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                      >
                        {latestEntry.response.content.download_url}
                      </a>
                    </dd>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void handleCopy(
                        latestEntry.response.content!.download_url!,
                        `raw-${latestEntry.id}`
                      )
                    }
                    className="rounded border border-slate-200 dark:border-slate-800 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
                  >
                    {copiedKey === `raw-${latestEntry.id}` ? 'Đã chép' : 'Chép'}
                  </button>
                </div>
              )}

              {latestEntry.response.content?.html_url && (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <dt className="text-[11px] text-slate-500 dark:text-slate-400">GitHub File URL</dt>
                    <dd className="mt-0.5 truncate">
                      <a
                        href={latestEntry.response.content.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                      >
                        {latestEntry.response.content.html_url}
                      </a>
                    </dd>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void handleCopy(
                        latestEntry.response.content!.html_url!,
                        `html-${latestEntry.id}`
                      )
                    }
                    className="rounded border border-slate-200 dark:border-slate-800 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
                  >
                    {copiedKey === `html-${latestEntry.id}` ? 'Đã chép' : 'Chép'}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <dt className="text-[11px] text-slate-500 dark:text-slate-400">Đường dẫn trên repo</dt>
                  <dd className="mt-0.5 font-mono text-slate-800 dark:text-slate-200 break-all">
                    {latestEntry.response.content?.path || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500 dark:text-slate-400">Commit SHA</dt>
                  <dd className="mt-0.5 font-mono text-slate-800 dark:text-slate-200">
                    {latestEntry.response.commit?.html_url && latestEntry.response.commit?.sha ? (
                      <a
                        href={latestEntry.response.commit.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {latestEntry.response.commit.sha.slice(0, 10)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      latestEntry.response.commit?.sha?.slice(0, 10) || '—'
                    )}
                  </dd>
                </div>
              </div>
            </dl>
          </section>
        ) : (
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] px-6 py-10 text-center">
            <Upload className="mx-auto h-5 w-5 text-slate-400" />
            <p className="mt-2 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Chưa có tệp nào được tải lên
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Chọn tệp bên trái và nhấn tải lên để nhận ngay Domain URL, Raw URL và liên kết GitHub.
            </p>
          </section>
        )}

        {/* Recent Uploads History Table */}
        <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-3.5">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Lịch sử file đã tải lên
              </h3>
              <p className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                Lưu tối đa {MAX_HISTORY_ITEMS} tệp gần nhất trên trình duyệt · {history.length} bản ghi
              </p>
            </div>
            {history.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:hover:border-red-900/60 dark:hover:bg-red-950/35 dark:hover:text-red-400 transition-colors whitespace-nowrap shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Xóa lịch sử
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="px-6 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              Các link truy cập sau khi tải lên sẽ được lưu tạm tại đây để tiện sao chép lại.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {history.map((item) => {
                const accessUrl = getPrimaryAccessUrl(item.response);
                const isActive = latestEntry?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setLatestEntry(item)}
                    className={`cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 transition-colors ${
                      isActive
                        ? 'bg-blue-50/50 dark:bg-blue-950/25'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/45'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.response.content?.name || item.originalFileName}
                      </p>
                      {accessUrl ? (
                        <a
                          href={accessUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-blue-600 dark:text-blue-400 hover:underline max-w-full truncate"
                        >
                          <span className="truncate">{accessUrl}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-slate-400">Không có link trả về</p>
                      )}
                      <p className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                        {formatFileSize(item.fileSize)} · {formatDateTime(item.uploadedAt)}
                      </p>
                    </div>

                    <div
                      className="flex items-center gap-1.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {accessUrl && (
                        <button
                          type="button"
                          onClick={() => void handleCopy(accessUrl, `hist-${item.id}`)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                        >
                          {copiedKey === `hist-${item.id}` ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" />
                              Đã chép
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Chép link
                            </>
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveHistoryItem(item.id)}
                        aria-label="Xóa khỏi lịch sử"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400 transition-colors"
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
