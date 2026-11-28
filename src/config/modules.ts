import type { LucideIcon } from 'lucide-react';
import { Film, GitFork, ShieldCheck, SlidersHorizontal, Users } from 'lucide-react';

export type AdminModuleId =
  | 'accounts'
  | 'roles'
  | 'github-upload'
  | 'videos-manage'
  | 'connection-settings';

export type ModuleGroupId = 'core' | 'ecosystem';

export interface AdminModuleDefinition {
  id: AdminModuleId;
  group: ModuleGroupId;
  label: string;
  breadcrumb: string;
  description: string;
  icon: LucideIcon;
  status: 'active' | 'planned';
  serviceCodeHint?: string;
}

export const MODULE_GROUPS: Record<ModuleGroupId, { title: string }> = {
  core: {
    title: 'Quản trị tài khoản',
  },
  ecosystem: {
    title: 'Hệ sinh thái & Hệ thống',
  },
};

/**
 * Central module registry.
 * To add future services (e.g. Videos Manage, Analytics, Billing), append a new module definition
 * and wire its view component inside the shell router.
 */
export const ADMIN_MODULES: AdminModuleDefinition[] = [
  {
    id: 'accounts',
    group: 'core',
    label: 'Tài khoản người dùng',
    breadcrumb: 'Quản trị tài khoản / Danh sách người dùng',
    description: 'Quản lý toàn bộ tài khoản trung tâm, trạng thái hoạt động và gán vai trò theo từng dịch vụ.',
    icon: Users,
    status: 'active',
  },
  {
    id: 'roles',
    group: 'core',
    label: 'Danh mục Role',
    breadcrumb: 'Quản trị tài khoản / Danh mục Role theo Service',
    description: 'Tra cứu quyền toàn cục SUPER_ADMIN và danh sách vai trò hợp lệ theo từng mã dịch vụ.',
    icon: ShieldCheck,
    status: 'active',
  },
  {
    id: 'github-upload',
    group: 'ecosystem',
    label: 'GitHub Upload',
    breadcrumb: 'Hệ sinh thái / GitHub Upload',
    description:
      'Quản lý kho lưu trữ GitHub, tải tệp lên CDN, cấu hình tên miền gốc và token truy cập.',
    icon: GitFork,
    status: 'active',
  },
  {
    id: 'videos-manage',
    group: 'ecosystem',
    label: 'Videos Manage',
    breadcrumb: 'Hệ sinh thái / Videos Manage',
    description: 'Phân hệ quản trị nội dung video dự kiến tích hợp tiếp theo theo kiến trúc đa dịch vụ.',
    icon: Film,
    status: 'planned',
    serviceCodeHint: 'VIDEOS_MANAGE',
  },
  {
    id: 'connection-settings',
    group: 'ecosystem',
    label: 'Kết nối & Phiên',
    breadcrumb: 'Hệ sinh thái / Kết nối & Phiên Super Admin',
    description: 'Kiểm tra máy chủ API đang kết nối, chế độ proxy CORS và thông tin phiên JWT hiện tại.',
    icon: SlidersHorizontal,
    status: 'active',
  },
];
