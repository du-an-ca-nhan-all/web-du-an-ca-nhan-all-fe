export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatShortDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function formatDurationSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 giây';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return remHours > 0 ? `${days} ngày ${remHours} giờ` : `${days} ngày`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
  }
  if (minutes > 0) {
    return `${minutes} phút`;
  }
  return `${Math.floor(seconds)} giây`;
}

export function getStatusDisplay(status?: string | null): {
  label: string;
  textClass: string;
} {
  const normalized = (status || 'UNKNOWN').toUpperCase();
  switch (normalized) {
    case 'ACTIVE':
      return {
        label: 'Hoạt động',
        textClass: 'text-emerald-700 dark:text-emerald-400',
      };
    case 'INACTIVE':
    case 'PENDING':
      return {
        label: normalized === 'PENDING' ? 'Chờ kích hoạt' : 'Ngừng hoạt động',
        textClass: 'text-amber-700 dark:text-amber-400',
      };
    case 'LOCKED':
    case 'SUSPENDED':
    case 'BANNED':
    case 'DISABLED':
      return {
        label: normalized === 'LOCKED' ? 'Đã khóa' : 'Bị đình chỉ',
        textClass: 'text-red-700 dark:text-red-400',
      };
    default:
      return {
        label: status || 'Không xác định',
        textClass: 'text-slate-600 dark:text-slate-400',
      };
  }
}

export function generateStrongPassword(length = 14): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*?';
  const all = upper + lower + digits + symbols;

  const mandatory = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  const chars = [...mandatory];
  while (chars.length < length) {
    chars.push(all[Math.floor(Math.random() * all.length)]);
  }

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

const REPO_NAME_ALPHABET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateRandomRepoName(length = 16): string {
  const result: string[] = [];
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint32Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i += 1) {
      result.push(REPO_NAME_ALPHABET[bytes[i] % REPO_NAME_ALPHABET.length]);
    }
    return result.join('');
  }

  for (let i = 0; i < length; i += 1) {
    const idx = Math.floor(Math.random() * REPO_NAME_ALPHABET.length);
    result.push(REPO_NAME_ALPHABET[idx]);
  }
  return result.join('');
}

export function formatFileSize(bytes?: number | null): string {
  if (bytes === undefined || bytes === null || !Number.isFinite(bytes) || bytes < 0) {
    return '—';
  }
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} ${units[unitIndex]}`;
}
