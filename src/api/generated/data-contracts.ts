/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

/** Thông tin phản hồi tài khoản */
export interface AccountResponse {
  /**
   * Thời gian tạo
   * @format date-time
   */
  createdAt?: string;
  /**
   * Email
   * @example "vana@example.com"
   */
  email?: string;
  /**
   * Họ và tên
   * @example "Nguyễn Văn A"
   */
  fullName?: string;
  /**
   * ID tài khoản
   * @format int64
   * @example 1
   */
  id?: number;
  /**
   * Cờ đánh dấu tài khoản Super Admin duy nhất
   * @example false
   */
  isSuperAdmin?: boolean;
  /** Danh sách vai trò của tài khoản theo từng dịch vụ: { serviceCode: role } */
  serviceRoles?: Record<string, string>;
  /**
   * Trạng thái tài khoản
   * @example "ACTIVE"
   */
  status?: string;
  /**
   * Tên đăng nhập
   * @example "nguyen_van_a"
   */
  username?: string;
}

/** Yêu cầu gán vai trò cho tài khoản trên một dịch vụ cụ thể */
export interface AssignRoleRequest {
  /**
   * Vai trò muốn gán (ADMIN, MODERATOR, VIP, USER, ...)
   * @minLength 1
   * @example "VIP"
   */
  role: string;
  /**
   * Mã dịch vụ
   * @minLength 1
   * @example "VIDEOS_MANAGE"
   */
  serviceCode: string;
}

export interface AssignServiceRoleParams {
  /**
   * ID tài khoản
   * @format int64
   * @example 1
   */
  id: number;
}

/** Thông tin phản hồi đăng nhập thành công kèm Access Token */
export interface AuthResponse {
  /**
   * JWT Access Token
   * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   */
  accessToken?: string;
  /** Thông tin chi tiết tài khoản */
  account?: AccountResponse;
  /**
   * Vai trò của tài khoản trong dịch vụ hiện tại (nếu là SuperAdmin luôn là SUPER_ADMIN)
   * @example "VIP"
   */
  currentRole?: string;
  /**
   * Dịch vụ hiện tại đã yêu cầu khi login (nếu có)
   * @example "VIDEOS_MANAGE"
   */
  currentService?: string;
  /**
   * Thời gian hết hạn tính bằng giây
   * @format int64
   * @example 86400
   */
  expiresIn?: number;
  /**
   * Loại Token
   * @example "Bearer"
   */
  tokenType?: string;
}

export interface Author {
  name?: string;
  url?: string;
}

export interface AutoJoinOrganizationParams {
  /** ID ngẫu nhiên (UUID) của token đích cần được thêm vào organization */
  id: string;
  /** Tên (slug/login) của GitHub organization */
  org: string;
}

export interface CategoriesAllParams {
  /** @default "en" */
  lang?: string;
}

export interface CategoriesDto {
  id?: string;
  name?: string;
  urlImage?: string;
}

export interface CategoriesParams {
  categories: string;
  /** @default "en" */
  lang?: string;
  /**
   * @format int32
   * @default 1
   */
  page?: number;
  /** @default "relevance" */
  sort?: string;
}

export interface CategoryServiceModel {
  categoryId?: string;
  categoryTypeId?: string;
  describe?: string;
  name?: string;
  totalUse?: string;
}

export interface CategoryUpsertRequest {
  /** @minLength 1 */
  categoryId: string;
  categoryTypeId?: string;
  /** @format date-time */
  dateCreate?: string;
  describe?: string;
  name?: string;
  totalUse?: string;
}

export interface CheckTokenOrgAccessParams {
  /** ID ngẫu nhiên (UUID) của token cần kiểm tra */
  id: string;
  /** Tên (slug/login) của organization cần kiểm tra */
  org: string;
}

export interface CheckTokenRepoAccessParams {
  /** ID ngẫu nhiên (UUID) của token cần kiểm tra */
  id: string;
  /** Tên (slug/login) của organization chứa repository */
  org: string;
  /** Tên repository cần kiểm tra */
  repo: string;
}

export interface CommentDto {
  comment?: string;
  /** @format int32 */
  createDate?: number;
  /** @format int32 */
  like?: number;
  nameUser?: string;
  thumbUrlUser?: string;
}

export interface ConfigureDefaultRepoParams {
  /**
   * Tên organization sở hữu repo
   * @example "ABaiSt3LG9ALGNJD"
   */
  org: string;
  /**
   * Tên repository cần cấu hình mặc định
   * @example "my-repo"
   */
  repo: string;
}

export interface CountParams {
  category: string;
}

export interface CreateForkRepositoryParams {
  /**
   * Tên organization nhận bản fork (khớp với OrganizationRepo)
   * @example "ABaiSt3LG9ALGNJD"
   */
  org: string;
}

export interface CreateRepositoryParams {
  /**
   * Tên organization sở hữu (khớp với OrganizationRepo)
   * @example "ABaiSt3LG9ALGNJD"
   */
  org: string;
}

export interface CreateVideoRequest {
  m3u8url?: string;
  categoryServiceModels?: CategoryServiceModel[];
  description?: string;
  googleUrl?: string;
  /** @minLength 1 */
  id: string;
  imageUrl?: string;
  name?: string;
}

export interface DeleteParams {
  videoId: string;
  videoType: string;
}

export interface DeleteRootDomainParams {
  /**
   * ID của root domain cần xoá
   * @format int64
   * @example 1
   */
  id: number;
}

export interface DeleteTokenParams {
  /** ID ngẫu nhiên (UUID) của token cần xoá */
  id: string;
}

export interface DownloadVideoParams {
  /**
   * Tên file tải về tùy chỉnh
   * @example "my-video.mp4"
   */
  filename?: string;
  /**
   * Đường dẫn Google Blogger embed trực tiếp (tùy chọn thay cho 'video')
   * @example "https://www.blogger.com/video.g?token=..."
   */
  googleVideoUrl?: string;
  /**
   * Mã itag chất lượng mong muốn (mặc định chọn chất lượng cao nhất)
   * @format int32
   * @example 22
   */
  itag?: number;
  /**
   * Số luồng tải song song (mặc định 3)
   * @format int32
   * @min 1
   * @example 3
   */
  threads?: number;
  /**
   * URL đầy đủ hoặc slug của video Viet69
   * @example "https://viet69.be/clip-hot-sinh-vien-ha-noi/"
   */
  video?: string;
}

export interface ExistsByIdParams {
  id: string;
}

export interface FindById1Params {
  id: string;
}

export interface FindByIdParams {
  /** @default true */
  findSubVideo?: boolean;
  id: string;
  requireVideoType?: string;
}

export interface FindNotHaveTypeParams {
  /**
   * @format int32
   * @default 10
   */
  limit?: number;
  /**
   * @format int32
   * @default 0
   */
  page?: number;
  type: string;
}

export interface FindRandomParams {
  requireVideoType?: string;
}

export interface FindTypeParams {
  /**
   * @format int32
   * @default 10
   */
  limit?: number;
  /**
   * @format int32
   * @default 0
   */
  page?: number;
  type: string;
}

export interface GetAccessibleOrganizationsParams {
  /** ID ngẫu nhiên (UUID) của token */
  id: string;
}

export interface GetAccountByIdParams {
  /**
   * ID tài khoản
   * @format int64
   * @example 1
   */
  id: number;
}

export interface GetAllTokensParams {
  /**
   * Nếu true chỉ trả về các super token
   * @default false
   * @example false
   */
  superTokenOnly?: boolean;
}

export interface GetCommitsSummaryParams {
  /**
   * Repository cụ thể cần kiểm tra (owner/repo). Nếu bỏ trống sẽ kiểm tra toàn bộ danh sách repositories đã cấu hình.
   * @example "ABaiSt3LG9ALGNJD/jjjeJ4d8fsEc5M7g"
   */
  repository?: string;
}

export interface GetFileMetadataParams {
  path: string;
  /**
   * Repository theo định dạng 'owner/repo'
   * @example "ABaiSt3LG9ALGNJD/jjjeJ4d8fsEc5M7g"
   */
  repository?: string;
}

export interface GetOrganizationParams {
  /**
   * Tên / mã organization cần tìm
   * @example "ABaiSt3LG9ALGNJD"
   */
  org: string;
}

export interface GetRepositoriesByOrgParams {
  /**
   * Tên organization cần truy vấn
   * @example "ABaiSt3LG9ALGNJD"
   */
  org: string;
}

export interface GetServiceRolesCatalogParams {
  /**
   * Mã dịch vụ (bỏ trống để lấy tất cả)
   * @example "VIDEOS_MANAGE"
   */
  serviceCode?: string;
}

export interface GetTokenParams {
  /** ID ngẫu nhiên (UUID) của token */
  id: string;
}

export interface GetVideoInfoParams {
  /**
   * URL đầy đủ hoặc slug của video Viet69
   * @minLength 1
   * @example "https://viet69.be/clip-hot-sinh-vien-ha-noi/"
   */
  video: string;
}

export interface GetVideosByPageParams {
  /**
   * Số trang cần lấy danh sách video
   * @format int32
   * @min 0
   * @default 1
   * @example 1
   */
  page?: number;
}

export interface GitHubAccessibleOrgResponse {
  /** URL ảnh đại diện của organization */
  avatarUrl?: string;
  /** Mô tả của organization trên GitHub */
  description?: string;
  /**
   * GitHub numeric ID của organization
   * @format int64
   * @example 12345678
   */
  githubOrgId?: number;
  /**
   * Đánh dấu organization này đã được import vào hệ thống hay chưa
   * @example false
   */
  imported?: boolean;
  /**
   * Tên hiển thị của organization
   * @example "My Organization"
   */
  name?: string;
  /**
   * Slug / login của GitHub Organization (khóa chính trong bảng organizations)
   * @example "my-org"
   */
  org?: string;
}

export interface GitHubCommitInfo {
  /**
   * Commit HTML URL
   * @example "https://github.com/octocat/hello-world/commit/7638417db6d59f3c431d3e1f261cc637155684cd"
   */
  html_url?: string;
  /**
   * Commit message
   * @example "Upload sample.txt via API"
   */
  message?: string;
  /**
   * Commit SHA
   * @example "7638417db6d59f3c431d3e1f261cc637155684cd"
   */
  sha?: string;
}

export interface GitHubCreateForkRepoRequest {
  /**
   * Chỉ fork nhánh mặc định (default branch). Mặc định true để tối ưu tốc độ và dung lượng.
   * @example true
   */
  defaultBranchOnly?: boolean;
  /**
   * Domain tùy chỉnh gắn với repository này (lưu vào database bảng repositories)
   * @example "https://cdn.example.com"
   */
  domain?: string;
  /**
   * Tên repository mới do bạn tự đặt cho bản fork
   * @minLength 1
   * @pattern ^[a-zA-Z0-9_.-]+$
   * @example "my-kafka-broker"
   */
  name: string;
  /**
   * URL hoặc slug repository gốc cần fork. Mặc định là 'https://github.com/apache/kafka'
   * @example "https://github.com/apache/kafka"
   */
  sourceRepo?: string;
}

export interface GitHubCreateRepoRequest {
  /**
   * Tự động tạo commit khởi tạo kèm file README (dùng khi type = BLANK). Mặc định true.
   * @example true
   */
  autoInit?: boolean;
  /**
   * Chỉ fork nhánh mặc định (dùng khi type = FORK). Mặc định true.
   * @example true
   */
  defaultBranchOnly?: boolean;
  /**
   * Mô tả của repository (dùng khi type = BLANK)
   * @example "Mô tả repo"
   */
  description?: string;
  /**
   * Domain tùy chỉnh gắn với repository này để lưu vào database
   * @example "https://cdn.example.com"
   */
  domain?: string;
  /**
   * Mẫu .gitignore (ví dụ: 'Java', 'Node', 'Python', v.v., dùng khi type = BLANK)
   * @example "Java"
   */
  gitignoreTemplate?: string;
  /**
   * Chế độ riêng tư (private hay public, dùng khi type = BLANK). Mặc định false.
   * @example false
   */
  isPrivate?: boolean;
  /**
   * Mẫu License (ví dụ: 'mit', 'apache-2.0', v.v., dùng khi type = BLANK)
   * @example "mit"
   */
  licenseTemplate?: string;
  /**
   * Tên repository cần tạo mới
   * @minLength 1
   * @pattern ^[a-zA-Z0-9_.-]+$
   * @example "my-custom-repo"
   */
  name: string;
  /**
   * Nội dung tùy chỉnh cho file README.md (dùng khi type = BLANK)
   * @example "# Project Readme"
   */
  readmeContent?: string;
  /**
   * URL hoặc slug repository gốc cần fork (dùng khi type = FORK). Mặc định 'https://github.com/apache/kafka'
   * @example "https://github.com/apache/kafka"
   */
  sourceRepo?: string;
  /**
   * Loại tạo repo: BLANK (repo trắng có readme/gitignore/license) hoặc FORK (fork từ repo khác, mặc định apache/kafka). Mặc định BLANK.
   * @example "BLANK"
   */
  type?: GitHubCreateRepoRequestTypeEnum;
}

/**
 * Loại tạo repo: BLANK (repo trắng có readme/gitignore/license) hoặc FORK (fork từ repo khác, mặc định apache/kafka). Mặc định BLANK.
 * @example "BLANK"
 */
export enum GitHubCreateRepoRequestTypeEnum {
  BLANK = "BLANK",
  FORK = "FORK",
}

export interface GitHubCreateRepoResponse {
  /**
   * URL clone Git qua HTTPS
   * @example "https://github.com/ABaiSt3LG9ALGNJD/my-blank-repo.git"
   */
  cloneUrl?: string;
  /**
   * Thời gian tạo
   * @format date-time
   * @example "2026-11-12T19:42:13+07:00"
   */
  createdAt?: string;
  /**
   * ID bản ghi trong bảng cơ sở dữ liệu github_upload.repositories
   * @format int64
   * @example 1
   */
  dbId?: number;
  /**
   * Nhánh mặc định của repository
   * @example "main"
   */
  defaultBranch?: string;
  /**
   * Mô tả repository
   * @example "Kho lưu trữ dữ liệu trống với tài liệu README"
   */
  description?: string;
  /**
   * Domain tùy chỉnh gắn với repository
   * @example "https://cdn.example.com"
   */
  domain?: string;
  /**
   * Slug đầy đủ dạng 'owner/repo'
   * @example "ABaiSt3LG9ALGNJD/my-blank-repo"
   */
  fullRepository?: string;
  /**
   * URL Git SSH / protocol
   * @example "git://github.com/ABaiSt3LG9ALGNJD/my-blank-repo.git"
   */
  gitUrl?: string;
  /**
   * URL giao diện GitHub của repository
   * @example "https://github.com/ABaiSt3LG9ALGNJD/my-blank-repo"
   */
  htmlUrl?: string;
  /**
   * Cờ đánh dấu có phải là bản fork từ repo khác hay không
   * @example false
   */
  isFork?: boolean;
  /**
   * Trạng thái repository là riêng tư (private) hay công khai (public)
   * @example false
   */
  isPrivate?: boolean;
  /**
   * Thông báo kết quả xử lý
   * @example "Tạo mới repository thành công"
   */
  message?: string;
  /**
   * Tên organization sở hữu
   * @example "ABaiSt3LG9ALGNJD"
   */
  org?: string;
  /**
   * Tên repository
   * @example "my-blank-repo"
   */
  repoName?: string;
  /**
   * Repository gốc nguồn (nếu là bản fork)
   * @example "apache/kafka"
   */
  sourceRepo?: string;
}

export interface GitHubFileContentResponse {
  /** Base64 content if retrieved from GET endpoint */
  content?: string;
  /**
   * Public domain URL (domain + path)
   * @example "https://cdn.myhost.com/docs/sample.txt"
   */
  domain_url?: string;
  /**
   * Direct download raw URL
   * @example "https://raw.githubusercontent.com/octocat/hello-world/main/docs/sample.txt"
   */
  download_url?: string;
  /**
   * Encoding type
   * @example "base64"
   */
  encoding?: string;
  /**
   * Web URL on GitHub
   * @example "https://github.com/octocat/hello-world/blob/main/docs/sample.txt"
   */
  html_url?: string;
  /**
   * File name
   * @example "sample.txt"
   */
  name?: string;
  /**
   * Path in repository
   * @example "docs/sample.txt"
   */
  path?: string;
  /**
   * Git blob SHA
   * @example "3a06dc643a2269834f4710206b43d4949ac756ae"
   */
  sha?: string;
  /**
   * File size in bytes
   * @format int64
   * @example 1024
   */
  size?: number;
}

export interface GitHubImportOrganizationsRequest {
  /**
   * Danh sách tên (login/slug) các GitHub organizations được chọn để import
   * @minItems 1
   * @example ["my-org-1","my-org-2"]
   */
  orgs: string[];
}

export interface GitHubImportOrganizationsResponse {
  /** Danh sách organization mới đã được import */
  imported?: ImportedOrganizationItem[];
  /**
   * Số lượng organization mới đã được import thành công
   * @format int32
   */
  importedCount?: number;
  /**
   * Số lượng organization được chọn nhưng token không có quyền truy cập
   * @format int32
   */
  notAccessibleCount?: number;
  /** Danh sách tên organization token không có quyền truy cập */
  notAccessibleOrgs?: string[];
  /**
   * Số lượng organization được chọn nhưng đã tồn tại trong hệ thống nên bỏ qua
   * @format int32
   */
  skippedCount?: number;
  /** Danh sách tên organization đã tồn tại trước đó và bị bỏ qua */
  skippedExistingOrgs?: string[];
}

export interface GitHubInviteOrgMemberRequest {
  /**
   * ID (UUID) của token đích trong hệ thống để tự động lấy username cần mời (dùng thay cho username nếu muốn chọn từ danh sách token)
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  targetTokenId?: string;
  /**
   * GitHub username của user cần mời vào organization (bắt buộc nếu không truyền targetTokenId)
   * @example "octocat"
   */
  username?: string;
}

export interface GitHubOrgAutoJoinResponse {
  /** ID (UUID) của token quản trị (admin) đã dùng để gửi lời mời (null nếu đã có sẵn lời mời/quyền) */
  managerTokenId?: string;
  /** GitHub username của tài khoản quản trị đã gửi lời mời */
  managerUsername?: string;
  /** Thông báo chi tiết kết quả thực hiện */
  message?: string;
  /**
   * Tên (slug/login) của GitHub Organization
   * @example "my-org"
   */
  org?: string;
  /**
   * Vai trò trong organization sau khi hoàn tất
   * @example "member"
   */
  role?: string;
  /**
   * Trạng thái membership sau khi hoàn tất
   * @example "active"
   */
  state?: string;
  /**
   * Kết quả xử lý: JOINED, ACCEPTED_EXISTING_INVITATION, hoặc ALREADY_MEMBER
   * @example "JOINED"
   */
  status?: string;
  /** ID (UUID) của token đích được thêm vào organization */
  targetTokenId?: string;
  /**
   * GitHub username của user đích
   * @example "member-user"
   */
  targetUsername?: string;
}

export interface GitHubOrgInvitationActionRequest {
  /**
   * Lựa chọn xử lý lời mời vào organization: ACCEPT (đồng ý) hoặc DECLINE (từ chối)
   * @example "ACCEPT"
   */
  action: GitHubOrgInvitationActionRequestActionEnum;
}

/**
 * Lựa chọn xử lý lời mời vào organization: ACCEPT (đồng ý) hoặc DECLINE (từ chối)
 * @example "ACCEPT"
 */
export enum GitHubOrgInvitationActionRequestActionEnum {
  ACCEPT = "ACCEPT",
  DECLINE = "DECLINE",
}

export interface GitHubOrgInvitationActionResponse {
  /**
   * Hành động đã thực hiện (ACCEPT hoặc DECLINE)
   * @example "ACCEPT"
   */
  action?: GitHubOrgInvitationActionResponseActionEnum;
  /** Thông báo kết quả xử lý */
  message?: string;
  /**
   * Slug / login của GitHub Organization
   * @example "my-org"
   */
  org?: string;
  /**
   * Vai trò trong organization (nếu đồng ý)
   * @example "member"
   */
  role?: string;
  /**
   * Trạng thái sau khi xử lý (active hoặc declined)
   * @example "active"
   */
  state?: string;
  /**
   * Username GitHub của tài khoản xử lý
   * @example "octocat"
   */
  username?: string;
}

/**
 * Hành động đã thực hiện (ACCEPT hoặc DECLINE)
 * @example "ACCEPT"
 */
export enum GitHubOrgInvitationActionResponseActionEnum {
  ACCEPT = "ACCEPT",
  DECLINE = "DECLINE",
}

export interface GitHubOrgInvitationResponse {
  /** URL ảnh đại diện của organization */
  avatarUrl?: string;
  /** Mô tả của organization trên GitHub */
  description?: string;
  /**
   * GitHub numeric ID của organization
   * @format int64
   * @example 12345678
   */
  githubOrgId?: number;
  /**
   * Đường dẫn web GitHub để xem/xử lý lời mời trực tiếp
   * @example "https://github.com/orgs/my-org/invitation"
   */
  invitationUrl?: string;
  /** URL API membership trả về từ GitHub */
  membershipApiUrl?: string;
  /**
   * Slug / login của GitHub Organization
   * @example "my-org"
   */
  org?: string;
  /**
   * Vai trò được mời trong organization (member, admin)
   * @example "member"
   */
  role?: string;
  /**
   * Trạng thái membership trên GitHub (pending, active)
   * @example "pending"
   */
  state?: string;
  /**
   * Username GitHub của user nhận lời mời
   * @example "octocat"
   */
  username?: string;
}

export interface GitHubOrgInviteMemberResponse {
  /**
   * Đường dẫn web GitHub để user xem/chấp nhận lời mời
   * @example "https://github.com/orgs/my-org/invitation"
   */
  invitationUrl?: string;
  /** URL API membership trả về từ GitHub */
  membershipApiUrl?: string;
  /** Thông báo kết quả gửi lời mời */
  message?: string;
  /**
   * Tên (slug/login) của GitHub Organization
   * @example "my-org"
   */
  org?: string;
  /**
   * Vai trò được gán trong organization
   * @example "member"
   */
  role?: string;
  /**
   * Trạng thái membership trả về từ GitHub (pending nếu mới gửi lời mời, active nếu đã là thành viên)
   * @example "pending"
   */
  state?: string;
  /**
   * GitHub username của user được mời
   * @example "octocat"
   */
  username?: string;
}

export interface GitHubPullRepoDomainResponse {
  /**
   * Domain hiện tại trong database sau khi pull
   * @example "https://my-repo.quickgg.top"
   */
  currentDomain?: string;
  /**
   * Đường dẫn đầy đủ org/repo
   * @example "ABaiSt3LG9ALGNJD/my-repo"
   */
  fullRepository?: string;
  /** Thông báo kết quả */
  message?: string;
  /**
   * Tên organization sở hữu repository
   * @example "ABaiSt3LG9ALGNJD"
   */
  org?: string;
  /**
   * Domain trước đó lưu trong database
   * @example "https://old.example.com"
   */
  previousDomain?: string;
  /**
   * Domain lấy được từ GitHub (sau chuẩn hoá https://)
   * @example "https://my-repo.quickgg.top"
   */
  pulledDomain?: string;
  /**
   * Tên repository
   * @example "my-repo"
   */
  repoName?: string;
  /**
   * Nguồn phát hiện domain trên GitHub: GITHUB_PAGES, CNAME_FILE hoặc NONE
   * @example "GITHUB_PAGES"
   */
  source?: string;
  /** Có cập nhật dữ liệu mới vào database hay không */
  updated?: boolean;
}

export interface GitHubRepoCommitSummaryResponse {
  /**
   * Tên nhánh git kiểm tra
   * @example "main"
   */
  branch?: string;
  /**
   * Domain cấu hình
   * @example "https://cdn1.example.com"
   */
  domain?: string;
  /**
   * SHA của commit mới nhất (HEAD)
   * @example "7638417db6d59f3c431d3e1f261cc637155684cd"
   */
  latestCommitSha?: string;
  /**
   * Repository slug (owner/repo)
   * @example "ABaiSt3LG9ALGNJD/jjjeJ4d8fsEc5M7g"
   */
  repository?: string;
  /**
   * Số lượng commit hiện tại trên nhánh
   * @format int64
   * @example 42
   */
  totalCommits?: number;
}

export interface GitHubRepoDefaultConfigRequest {
  /**
   * Tên root domain trong bảng github_upload.root_domains (ví dụ: quickgg.top). Dùng khi không truyền rootDomainId.
   * @example "quickgg.top"
   */
  rootDomain?: string;
  /**
   * ID của root domain trong bảng github_upload.root_domains (ưu tiên nếu truyền cả id và domain)
   * @format int64
   * @example 1
   */
  rootDomainId?: number;
}

export interface GitHubRepoDefaultConfigResponse {
  /** Đã đảm bảo trang 404.html trên branch cấu hình */
  page404Ready?: boolean;
  /**
   * Nhánh được cấu hình (theo github.upload.branch)
   * @example "upload"
   */
  branch?: string;
  /**
   * Nội dung file CNAME đã tạo (repoName.rootDomain)
   * @example "my-repo.quickgg.top"
   */
  cname?: string;
  /** Đã tạo/cập nhật file CNAME trên branch cấu hình */
  cnameConfigured?: boolean;
  /**
   * URL đầy đủ được lưu vào bảng repositories
   * @example "https://my-repo.quickgg.top"
   */
  domainUrl?: string;
  /**
   * Đường dẫn đầy đủ org/repo
   * @example "ABaiSt3LG9ALGNJD/my-repo"
   */
  fullRepository?: string;
  /** Đã bật/cập nhật cấu hình GitHub Pages trỏ vào branch cấu hình */
  githubPagesConfigured?: boolean;
  /** Thông báo kết quả */
  message?: string;
  /**
   * Tên organization sở hữu repository
   * @example "ABaiSt3LG9ALGNJD"
   */
  org?: string;
  /**
   * Tên repository
   * @example "my-repo"
   */
  repoName?: string;
  /**
   * Root domain đã chọn
   * @example "quickgg.top"
   */
  rootDomain?: string;
}

export interface GitHubRootDomainRequest {
  /**
   * Mô tả cho root domain
   * @example "Default root domain"
   */
  description?: string;
  /**
   * Root domain dùng để gắn CNAME cho GitHub Pages (ví dụ: quickgg.top)
   * @minLength 1
   * @example "quickgg.top"
   */
  domain: string;
}

export interface GitHubSquashCommitsResponse {
  /**
   * Tên nhánh git sau khi gộp
   * @example "main"
   */
  branch?: string;
  /**
   * Số lượng commit sau khi gộp (luôn là 2 commit duy nhất)
   * @format int32
   * @example 2
   */
  currentCommitsCount?: number;
  /**
   * SHA của commit HEAD gộp toàn bộ dữ liệu (Squashed State Commit)
   * @example "9f8e7d6c5b..."
   */
  headCommitSha?: string;
  /**
   * Thông báo kết quả gộp
   * @example "Successfully squashed repository history into exactly 2 commits while preserving all files."
   */
  message?: string;
  /**
   * Số lượng commit trước khi gộp
   * @format int64
   * @example 42
   */
  previousCommitsCount?: number;
  /**
   * Repository slug (owner/repo)
   * @example "ABaiSt3LG9ALGNJD/jjjeJ4d8fsEc5M7g"
   */
  repository?: string;
  /**
   * SHA của commit gốc khởi tạo (Initial Root Commit)
   * @example "1a2b3c4d5e..."
   */
  rootCommitSha?: string;
}

export interface GitHubTokenCreateRequest {
  /**
   * Đánh dấu là super token (có quyền truy cập toàn bộ repository). Có thể có nhiều super token.
   * @example true
   */
  isSuperToken?: boolean;
  /**
   * GitHub Personal Access Token hoặc Fine-grained token (khóa chính)
   * @minLength 1
   * @example "ghp_xxxxxxxxxxxxxxxxxxxx"
   */
  token: string;
}

export interface GitHubTokenOrgAccessCheckResponse {
  /**
   * Token có quyền truy cập organization này hay không
   * @example true
   */
  accessible?: boolean;
  /** Thông báo lỗi nếu không thể truy cập */
  error?: string;
  /** Token có đang active hay không */
  isActive?: boolean;
  /** Token có đang được đánh dấu là super token hay không */
  isSuperToken?: boolean;
  /**
   * Tên (login/slug) của GitHub Organization được kiểm tra
   * @example "my-org"
   */
  org?: string;
  /**
   * Vai trò của tài khoản trong organization (admin, member, hoặc null)
   * @example "admin"
   */
  role?: string;
  /**
   * Trạng thái membership trong organization (active, pending, hoặc null)
   * @example "active"
   */
  state?: string;
  /** ID ngẫu nhiên (UUID) của token được kiểm tra */
  tokenId?: string;
  /** Chuỗi token đã che bớt ký tự */
  tokenPreview?: string;
}

export interface GitHubTokenRepoAccessCheckResponse {
  /**
   * Token có quyền truy cập repository này hay không
   * @example true
   */
  accessible?: boolean;
  /**
   * Token có quyền admin trên repository hay không
   * @example false
   */
  canAdmin?: boolean;
  /**
   * Token có quyền ghi (push) vào repository hay không
   * @example true
   */
  canPush?: boolean;
  /** Thông báo lỗi nếu không thể truy cập hoặc thiếu quyền ghi */
  error?: string;
  /**
   * Tên đầy đủ của repository dạng org/repo
   * @example "my-org/my-repo"
   */
  fullRepository?: string;
  /** Token có đang active hay không */
  isActive?: boolean;
  /** Token có đang được đánh dấu là super token hay không */
  isSuperToken?: boolean;
  /**
   * Tên organization chứa repository
   * @example "my-org"
   */
  org?: string;
  /**
   * Tên repository
   * @example "my-repo"
   */
  repoName?: string;
  /** ID ngẫu nhiên (UUID) của token được kiểm tra */
  tokenId?: string;
  /** Chuỗi token đã che bớt ký tự */
  tokenPreview?: string;
}

export interface GitHubTokenResponse {
  /**
   * Email của tài khoản GitHub
   * @example "octocat@github.com"
   */
  accountEmail?: string;
  /**
   * Tên hiển thị của tài khoản GitHub
   * @example "The Octocat"
   */
  accountName?: string;
  /**
   * Loại tài khoản GitHub (User, Organization, Bot)
   * @example "User"
   */
  accountType?: string;
  /**
   * GitHub username (login)
   * @example "octocat"
   */
  accountUsername?: string;
  /**
   * Thời điểm tạo bản ghi
   * @format date-time
   */
  createdAt?: string;
  /** Mô tả / ghi chú cho token */
  description?: string;
  /**
   * Thời điểm hết hạn token
   * @format date-time
   */
  expiresAt?: string;
  /**
   * GitHub numeric user ID của tài khoản sở hữu token
   * @format int64
   * @example 583231
   */
  githubAccountId?: number;
  /**
   * ID ngẫu nhiên (UUID) định danh cho token, dùng để gọi các API thay vì truyền trực tiếp token
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  id?: string;
  /**
   * Trạng thái kích hoạt
   * @example true
   */
  isActive?: boolean;
  /**
   * Có phải là super token (truy cập tất cả repo) hay không
   * @example true
   */
  isSuperToken?: boolean;
  /**
   * Chuỗi token đã che bớt ký tự ở giữa để đảm bảo an toàn
   * @example "ghp_****R1pr"
   */
  tokenPreview?: string;
  /**
   * Thời điểm cập nhật gần nhất
   * @format date-time
   */
  updatedAt?: string;
}

export interface GitHubTokenUpdateRequest {
  /**
   * Trạng thái kích hoạt token
   * @example true
   */
  isActive?: boolean;
  /**
   * Đánh dấu là super token (có quyền truy cập toàn bộ repository)
   * @example true
   */
  isSuperToken?: boolean;
}

export interface GitHubUploadResponse {
  /** Commit details created on GitHub */
  commit?: GitHubCommitInfo;
  /** Uploaded file metadata */
  content?: GitHubFileContentResponse;
}

export interface ImportSelectedOrganizationsParams {
  /** ID ngẫu nhiên (UUID) của token */
  id: string;
}

export interface ImportedOrganizationItem {
  description?: string;
  name?: string;
  org?: string;
}

export interface InviteMemberToOrgParams {
  /** ID ngẫu nhiên (UUID) của token có quyền quản trị organization */
  id: string;
  /** Tên (slug/login) của GitHub organization */
  org: string;
}

export interface ListOrgInvitationsParams {
  /** ID ngẫu nhiên (UUID) của token */
  id: string;
  /**
   * Lọc theo trạng thái lời mời: pending (mặc định), active, hoặc all
   * @default "pending"
   * @example "pending"
   */
  state?: string;
}

/** Yêu cầu đăng nhập tài khoản */
export interface LoginRequest {
  /**
   * Mật khẩu
   * @minLength 1
   * @example "SecurePassword123!"
   */
  password: string;
  /**
   * Mã dịch vụ / ứng dụng đang gọi đăng nhập (để cấp role cụ thể trong token)
   * @example "VIDEOS_MANAGE"
   */
  serviceCode?: string;
  /**
   * Tên đăng nhập hoặc Email
   * @minLength 1
   * @example "nguyen_van_a"
   */
  usernameOrEmail: string;
}

export interface MenuParams {
  /** @default "domain" */
  domain?: string;
  /** @default "en" */
  lang?: string;
  /**
   * @format int32
   * @default 8
   */
  size?: number;
}

export interface NewVideo1Params {
  /**
   * @format int32
   * @default 1
   */
  page?: number;
}

export interface NewVideoParams {
  /**
   * @format int32
   * @default 10
   */
  limit?: number;
  /**
   * @format int32
   * @default 0
   */
  page?: number;
  requireVideoType?: string;
}

export interface OrganizationEntity {
  /** @format date-time */
  createdAt?: string;
  description?: string;
  name?: string;
  org?: string;
}

export interface PageResponseBEListVideoDto {
  data?: VideoDto[];
  paging?: Paging;
}

export interface PageVideoSexRemoteGitlabServiceModel {
  content?: VideoSexRemoteGitlabServiceModel[];
  empty?: boolean;
  first?: boolean;
  last?: boolean;
  /** @format int32 */
  number?: number;
  /** @format int32 */
  numberOfElements?: number;
  pageable?: PageableObject;
  /** @format int32 */
  size?: number;
  sort?: SortObject;
  /** @format int64 */
  totalElements?: number;
  /** @format int32 */
  totalPages?: number;
}

export interface PageVideoUrlDecodeWithIdModel {
  content?: VideoUrlDecodeWithIdModel[];
  empty?: boolean;
  first?: boolean;
  last?: boolean;
  /** @format int32 */
  number?: number;
  /** @format int32 */
  numberOfElements?: number;
  pageable?: PageableObject;
  /** @format int32 */
  size?: number;
  sort?: SortObject;
  /** @format int64 */
  totalElements?: number;
  /** @format int32 */
  totalPages?: number;
}

export interface PageableObject {
  /** @format int64 */
  offset?: number;
  /** @format int32 */
  pageNumber?: number;
  /** @format int32 */
  pageSize?: number;
  paged?: boolean;
  sort?: SortObject;
  unpaged?: boolean;
}

export interface Paging {
  /** @format int32 */
  maxPage?: number;
}

export interface PostgresBackupResult {
  branch?: string;
  commitSha?: string;
  /** @format date-time */
  completedAt?: string;
  engine?: string;
  fileDownloadUrl?: string;
  fileName?: string;
  /** @format int64 */
  fileSizeBytes?: number;
  message?: string;
  repository?: string;
  schemas?: string[];
  success?: boolean;
}

export interface Proxy1Params {
  /** @default "https://example.com" */
  url?: string;
}

/** @format byte */
export type Proxy1Payload = Blob;

export interface Proxy2Params {
  /** @default "https://example.com" */
  url?: string;
}

/** @format byte */
export type Proxy2Payload = Blob;

export interface Proxy3Params {
  /** @default "https://example.com" */
  url?: string;
}

/** @format byte */
export type Proxy3Payload = Blob;

export interface Proxy4Params {
  /** @default "https://example.com" */
  url?: string;
}

/** @format byte */
export type Proxy4Payload = Blob;

export interface Proxy5Params {
  /** @default "https://example.com" */
  url?: string;
}

/** @format byte */
export type Proxy5Payload = Blob;

export interface Proxy6Params {
  /** @default "https://example.com" */
  url?: string;
}

/** @format byte */
export type Proxy6Payload = Blob;

export interface ProxyParams {
  /** @default "https://example.com" */
  url?: string;
}

/** @format byte */
export type ProxyPayload = Blob;

export interface PullOrgRepoDomainsParams {
  /**
   * Tên organization cần đồng bộ domain
   * @example "ABaiSt3LG9ALGNJD"
   */
  org: string;
}

export interface PullRepoDomainParams {
  /**
   * Tên organization sở hữu repo
   * @example "ABaiSt3LG9ALGNJD"
   */
  org: string;
  /**
   * Tên repository cần pull domain
   * @example "my-repo"
   */
  repo: string;
}

/** Yêu cầu đăng ký tài khoản mới */
export interface RegisterRequest {
  /**
   * Email (tùy chọn)
   * @format email
   * @example "vana@example.com"
   */
  email?: string;
  /**
   * Họ và tên đầy đủ
   * @example "Nguyễn Văn A"
   */
  fullName?: string;
  /**
   * Mật khẩu (ít nhất 6 ký tự)
   * @minLength 6
   * @maxLength 100
   * @example "SecurePassword123!"
   */
  password: string;
  /**
   * Mã service ban đầu muốn gán quyền (mặc định role USER nếu bỏ trống)
   * @example "GLOBAL_PORTAL"
   */
  serviceCode?: string;
  /**
   * Tên đăng nhập (4-50 ký tự)
   * @minLength 4
   * @maxLength 50
   * @example "nguyen_van_a"
   */
  username: string;
}

export interface RemoveServiceRoleParams {
  /**
   * ID tài khoản
   * @format int64
   * @example 1
   */
  id: number;
  /**
   * Mã dịch vụ
   * @example "VIDEOS_MANAGE"
   */
  serviceCode: string;
}

export interface RepositoryEntity {
  /** @format date-time */
  createdAt?: string;
  domain?: string;
  fullRepository?: string;
  /** @format int64 */
  id?: number;
  org?: string;
  repoName?: string;
}

export interface RespondToOrgInvitationParams {
  /** ID ngẫu nhiên (UUID) của token */
  id: string;
  /** Tên (slug/login) của GitHub organization */
  org: string;
}

export interface RootDomainEntity {
  /** @format date-time */
  createdAt?: string;
  description?: string;
  domain?: string;
  /** @format int64 */
  id?: number;
}

export interface Search1Params {
  /** @default "en" */
  lang?: string;
  /**
   * @format int32
   * @default 1
   */
  page?: number;
  search: string;
  /** @default "relevance" */
  sort?: string;
}

export interface SearchParams {
  /**
   * @format int32
   * @default 1
   */
  page?: number;
  search: string;
  /** @default "relevance" */
  sort?: string;
}

/** Danh sách các role được định nghĩa theo từng service và role toàn cục */
export interface ServiceRolesCatalogResponse {
  /**
   * Role toàn cục duy nhất áp dụng cho mọi service
   * @example "SUPER_ADMIN"
   */
  globalRole?: string;
  /** Danh sách role theo từng mã service */
  serviceRoles?: Record<string, string[]>;
}

export interface SortObject {
  empty?: boolean;
  sorted?: boolean;
  unsorted?: boolean;
}

export interface SquashCommitsParams {
  /**
   * Repository cần gộp (owner/repo). Nếu bỏ trống sẽ tự động chọn ngẫu nhiên từ danh sách cấu hình.
   * @example "ABaiSt3LG9ALGNJD/jjjeJ4d8fsEc5M7g"
   */
  repository?: string;
}

export type StreamingResponseBody = any;

export interface SyncAccountInfoParams {
  /** ID ngẫu nhiên (UUID) của token cần đồng bộ thông tin account */
  id: string;
}

export interface TagDto {
  id?: string;
  name?: string;
}

export interface TagParams {
  /**
   * @format int32
   * @default 1
   */
  page?: number;
  /** @default "uploaddate" */
  sort?: string;
  tag: string;
}

export interface TagsParams {
  /** @default "en" */
  lang?: string;
  /**
   * @format int32
   * @default 1
   */
  page?: number;
  tag: string;
}

export interface UpdateTokenParams {
  /** ID ngẫu nhiên (UUID) của token cần cập nhật */
  id: string;
}

export interface UpdateVideoImageUrlRequest {
  /** @minLength 1 */
  id: string;
  /** @minLength 1 */
  imageUrl: string;
}

export interface UpdateVideoImageUrlResponse {
  m3u8Url?: string;
  /** @format date-time */
  dateCreate?: string;
  /** @format int32 */
  deploy?: number;
  describe?: string;
  id?: string;
  imageUrl?: string;
  title?: string;
}

export interface UploadFileParams {
  /**
   * Commit message mô tả lần tải lên
   * @example "Upload image via API"
   */
  commitMessage?: string;
  /**
   * Thư mục lưu trữ trên repo (ví dụ: 'assets/images' hoặc để trống lưu tại root)
   * @example "assets/images"
   */
  path?: string;
  /**
   * Cờ cho phép tạo tên file ngẫu nhiên (prefix ngày giờ phút giây yyyyMMddHHmmss + random uuid) tránh trùng lặp
   * @default false
   * @example false
   */
  randomFileName?: boolean;
  /**
   * Repository đích theo định dạng 'owner/repo'. Nếu để trống hoặc null sẽ tự động random chọn 1 repo trong cấu hình.
   * @example "ABaiSt3LG9ALGNJD/jjjeJ4d8fsEc5M7g"
   */
  repository?: string;
}

export interface UploadFilePayload {
  /** @format binary */
  file: File;
}

export interface UrlVideoDto {
  urlVideo?: string;
}

export interface Video1Params {
  id: string;
  /** @default "en" */
  lang?: string;
}

export interface VideoByCategoryParams {
  category: string;
  /**
   * @format int32
   * @default 10
   */
  limit?: number;
  /**
   * @format int32
   * @default 0
   */
  page?: number;
  requireVideoType?: string;
}

export interface VideoDetailDto {
  top20comments?: CommentDto[];
  id?: string;
  like?: string;
  min?: string;
  name?: string;
  tags?: TagDto[];
  urlImage?: string;
  urlVideo?: string;
  videos?: VideoDto[];
  viewNumber?: string;
}

export interface VideoDto {
  author?: Author;
  id?: string;
  min?: string;
  name?: string;
  nameUrl?: string;
  quality?: string;
  urlImage?: string;
  urmPreview?: string;
  viewNumber?: string;
}

export interface VideoInfoDto {
  id?: string;
  name?: string;
  tags?: string[];
  urlImage?: string;
  videoUrls?: VideoXvideosUrl[];
  videos?: VideoDto[];
}

export interface VideoInfoParams {
  id: string;
}

export interface VideoParams {
  id: string;
}

export interface VideoSexRemoteGitlabServiceModel {
  m3u8Url?: string;
  categoryes?: CategoryServiceModel[];
  /** @format date-time */
  dateCreate?: string;
  describe?: string;
  id?: string;
  imageUrl?: string;
  title?: string;
  videoTypes?: VideoTypeServiceModel[];
}

export interface VideoTypeServiceModel {
  name?: string;
  nameEncode?: string;
  nameUrl?: string;
  videoTypeId?: string;
}

export interface VideoUrlDecodeModel {
  type?: string;
  urlVideo?: string;
}

export interface VideoUrlDecodeWithIdModel {
  id?: string;
  type?: string;
  urlVideo?: string;
}

export interface VideoUrlParams {
  id: string;
}

export interface VideoUrlSaveRequest {
  /** @format date-time */
  createDate?: string;
  extraData?: string;
  /** @minLength 1 */
  idVideo: string;
  /** @minLength 1 */
  typeVideoUrl: string;
  /** @minLength 1 */
  urlVideo: string;
}

export interface VideoXvideosUrl {
  label?: string;
  type?: string;
  url?: string;
}

export interface Viet69ImportRequest {
  /**
   * Mã itag chất lượng mong muốn (mặc định tự chọn chất lượng cao nhất)
   * @format int32
   * @example 22
   */
  itag?: number;
  /**
   * Slug hoặc URL đầy đủ của video Viet69
   * @minLength 1
   * @example "em-2k3-xuat-khau-lao-dong-nhat-ban"
   */
  slug: string;
  /**
   * Số luồng tải song song (mặc định 3)
   * @format int32
   * @min 1
   * @example 3
   */
  threads?: number;
}

export interface Viet69ImportResponse {
  /** Danh sách category_id đã gắn cho video */
  categoryIds?: string[];
  /** Mô tả video */
  description?: string;
  /** URL Google Blogger gốc (type = GOOGLE) */
  googleUrl?: string;
  /** URL ảnh thumbnail dạng custom domain sau khi upload GitHub */
  imageUrl?: string;
  /** Thông điệp chi tiết */
  message?: string;
  /** Repository GitHub ngẫu nhiên đã upload bộ HLS */
  repository?: string;
  /**
   * Số lượng segment .ts đã tách
   * @format int32
   */
  segmentCount?: number;
  /** Trạng thái kết quả import */
  status?: Viet69ImportResponseStatusEnum;
  /** Tiêu đề video */
  title?: string;
  /** ID/Slug của video trong hệ thống */
  videoId?: string;
  /**
   * Dung lượng video MP4 gốc đã tải (bytes)
   * @format int64
   */
  videoSizeBytes?: number;
  /** URL playlist M3U8 dạng custom domain (type = HUB_SERVER_M3U8_CUSTOM_DOMAIN) */
  videoUrl?: string;
}

/** Trạng thái kết quả import */
export enum Viet69ImportResponseStatusEnum {
  IMPORTED = "IMPORTED",
  ALREADY_EXISTS = "ALREADY_EXISTS",
}

/** Kết quả danh sách video lấy theo số trang từ Viet69 */
export interface Viet69PageResponse {
  /**
   * Số trang đã truy vấn
   * @format int32
   * @example 1
   */
  page?: number;
  /**
   * URL trang nguồn đã scrape
   * @example "https://viet69.be/page/1/"
   */
  pageUrl?: string;
  /**
   * Tổng số video tìm thấy trong trang
   * @format int32
   * @example 24
   */
  total?: number;
  /** Danh sách video trong trang */
  videos?: Viet69PageVideoItem[];
}

/** Thông tin tóm tắt một video trong danh sách trang Viet69 */
export interface Viet69PageVideoItem {
  /**
   * Slug / mã định danh video
   * @example "clip-hot-sinh-vien-ha-noi"
   */
  id?: string;
  /**
   * Ảnh đại diện (thumbnail) nếu có trên trang danh sách
   * @example "https://viet69.be/wp-content/uploads/thumb.jpg"
   */
  thumbnailUrl?: string;
  /**
   * Tiêu đề hiển thị của video
   * @example "Clip hot sinh viên Hà Nội"
   */
  title?: string;
  /**
   * Đường dẫn chi tiết video trên Viet69
   * @example "https://viet69.be/clip-hot-sinh-vien-ha-noi/"
   */
  url?: string;
}

/** Thông tin tag gắn với video Viet69 */
export interface Viet69TagDto {
  /**
   * Tên hiển thị của tag
   * @example "Sinh viên"
   */
  display?: string;
  /**
   * Slug / mã định danh tag
   * @example "sinh-vien"
   */
  id?: string;
  /**
   * Đường dẫn URL của tag
   * @example "https://viet69.be/tag/sinh-vien/"
   */
  url?: string;
}

/** Thông tin chi tiết một video Viet69 bao gồm metadata, tags và đường dẫn video Google */
export interface Viet69VideoInfoResponse {
  /**
   * Mô tả video
   * @example "Mô tả chi tiết nội dung video"
   */
  description?: string;
  /**
   * Đường dẫn trực tiếp chất lượng cao nhất (googlevideo.com) trích xuất từ Google Blogger
   * @example "https://rr1---sn-xxx.googlevideo.com/videoplayback?itag=22..."
   */
  directVideoUrl?: string;
  /**
   * Đường dẫn Google Blogger embed video
   * @example "https://www.blogger.com/video.g?token=AD6v5dw..."
   */
  googleVideoUrl?: string;
  /**
   * Slug / mã định danh video
   * @example "clip-hot-sinh-vien-ha-noi"
   */
  id?: string;
  /** Danh sách các luồng video trực tiếp sắp xếp theo chất lượng giảm dần */
  streams?: Viet69VideoStreamDto[];
  /** Danh sách tag (bao gồm id, tag hiển thị và tag URL) */
  tags?: Viet69TagDto[];
  /**
   * Đường dẫn ảnh đại diện (thumbnail)
   * @example "https://viet69.be/wp-content/uploads/thumb.jpg?width=500"
   */
  thumbnailUrl?: string;
  /**
   * Tiêu đề video
   * @example "Clip hot sinh viên Hà Nội"
   */
  title?: string;
  /**
   * Đường dẫn trang video Viet69 đã truy vấn
   * @example "https://viet69.be/clip-hot-sinh-vien-ha-noi/"
   */
  videoUrl?: string;
}

/** Định dạng luồng video trực tiếp trích xuất từ Google Blogger */
export interface Viet69VideoStreamDto {
  /**
   * Mã itag của luồng video Google
   * @format int32
   * @example 22
   */
  itag?: number;
  /**
   * Nhãn chất lượng video
   * @example "720p"
   */
  qualityLabel?: string;
  /**
   * Đường dẫn trực tiếp (googlevideo.com) để phát hoặc tải video
   * @example "https://rr1---sn-xxx.googlevideo.com/videoplayback?itag=22..."
   */
  url?: string;
}
