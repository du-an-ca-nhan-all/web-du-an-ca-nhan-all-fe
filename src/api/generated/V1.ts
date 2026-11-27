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

import {
  AccountResponse,
  AssignRoleRequest,
  AssignServiceRoleParams,
  AuthResponse,
  CategoryEntity,
  CategoryServiceModel,
  ConfigureDefaultRepoParams,
  CountParams,
  CreateForkRepositoryParams,
  CreateRepositoryParams,
  DeleteParams,
  DeleteRootDomainParams,
  ExistsByIdParams,
  FindById1Params,
  FindById2Params,
  FindNotHaveTypeParams,
  FindRandomParams,
  FindTypeParams,
  GetAccountByIdParams,
  GetCommitsSummaryParams,
  GetFileMetadataParams,
  GetOrganizationParams,
  GetRepositoriesByOrgParams,
  GetServiceRolesCatalogParams,
  GitHubCreateForkRepoRequest,
  GitHubCreateRepoRequest,
  GitHubCreateRepoResponse,
  GitHubFileContentResponse,
  GitHubPullRepoDomainResponse,
  GitHubRepoCommitSummaryResponse,
  GitHubRepoDefaultConfigRequest,
  GitHubRepoDefaultConfigResponse,
  GitHubRootDomainRequest,
  GitHubSquashCommitsResponse,
  GitHubUploadResponse,
  LoginRequest,
  NewVideoParams,
  OrganizationEntity,
  PageVideoSexRemoteGitlabServiceModel,
  PageVideoUrlDecodeWithIdModel,
  PostgresBackupResult,
  PullOrgRepoDomainsParams,
  PullRepoDomainParams,
  RegisterRequest,
  RemoveServiceRoleParams,
  RepositoryEntity,
  Request,
  RootDomainEntity,
  ServiceRolesCatalogResponse,
  SquashCommitsParams,
  UpdateImageUrlRequest,
  UploadFileParams,
  UploadFilePayload,
  VideoByCategoryParams,
  VideoSexRemoteGitlabEntity,
  VideoSexRemoteGitlabServiceModel,
  VideoSexRemoteGitlabVideoUrlEntity,
  VideoUrlDecodeModel,
} from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class V1<SecurityDataType = unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  /**
   * @description Cho phép Super Admin gán vai trò (ADMIN, MODERATOR, VIP, USER...) cho tài khoản ở một dịch vụ xác định.
   *
   * @tags account
   * @name AssignServiceRole
   * @summary Gán hoặc cập nhật vai trò (Role) cho tài khoản trên dịch vụ cụ thể
   * @request PUT:/v1/account/{id}/roles
   * @secure
   */
  assignServiceRole = (
    { id }: AssignServiceRoleParams,
    data: AssignRoleRequest,
    params: RequestParams = {},
  ) =>
    this.http.request<AccountResponse, any>({
      path: `/v1/account/${id}/roles`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * @description Trả về toàn bộ category đang có trong hệ thống video manage.
   *
   * @tags X-video manage
   * @name Categorys
   * @summary Lấy danh sách category
   * @request GET:/v1/api/category
   */
  categorys = (params: RequestParams = {}) =>
    this.http.request<CategoryServiceModel[], any>({
      path: `/v1/api/category`,
      method: "GET",
      ...params,
    });
  /**
   * @description Trả về toàn bộ category hiện dùng trong kho video.
   *
   * @tags X-video manage
   * @name Categorys1
   * @summary Lấy danh sách category video
   * @request GET:/v1/api/video_sex_remote_gitlab_db/categorys
   */
  categorys1 = (params: RequestParams = {}) =>
    this.http.request<CategoryServiceModel[], any>({
      path: `/v1/api/video_sex_remote_gitlab_db/categorys`,
      method: "GET",
      ...params,
    });
  /**
   * @description Tự động tạo nhánh cấu hình (github.upload.branch) kèm trang 404.html theo logic hiện có, tạo/cập nhật file CNAME với nội dung '{repo}.{rootDomain}', cấu hình GitHub Pages trỏ vào branch cấu hình và cập nhật domain trong database.
   *
   * @tags github-upload
   * @name ConfigureDefaultRepo
   * @summary Cấu hình mặc định cho repository (404.html, CNAME, GitHub Pages)
   * @request POST:/v1/github/orgs/{org}/repos/{repo}/default-config
   */
  configureDefaultRepo = (
    { org, repo }: ConfigureDefaultRepoParams,
    data: GitHubRepoDefaultConfigRequest,
    params: RequestParams = {},
  ) =>
    this.http.request<GitHubRepoDefaultConfigResponse, any>({
      path: `/v1/github/orgs/${org}/repos/${repo}/default-config`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * @description Trả về tổng số bản ghi video thuộc category chỉ định.
   *
   * @tags X-video manage
   * @name Count
   * @summary Đếm số video theo category
   * @request GET:/v1/api/category_with_video/{category}/count
   */
  count = ({ category }: CountParams, params: RequestParams = {}) =>
    this.http.request<object, any>({
      path: `/v1/api/category_with_video/${category}/count`,
      method: "GET",
      ...params,
    });
  /**
   * @description Fork một repository (mặc định là 'https://github.com/apache/kafka' hoặc repository URL bất kỳ) sang Organization và đặt tên mới theo ý muốn của bạn. Thông tin được lưu vào OrganizationRepo và RepositoryRepo. (Yêu cầu đăng nhập quyền SUPER_ADMIN).
   *
   * @tags github-upload
   * @name CreateForkRepository
   * @summary Fork repository cho Organization với tên tự đặt (Loại 2)
   * @request POST:/v1/github/orgs/{org}/repos/fork
   * @secure
   */
  createForkRepository = (
    { org }: CreateForkRepositoryParams,
    data: GitHubCreateForkRepoRequest,
    params: RequestParams = {},
  ) =>
    this.http.request<GitHubCreateRepoResponse, any>({
      path: `/v1/github/orgs/${org}/repos/fork`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * @description Endpoint hợp nhất cho phép tạo repo mới bằng cách chọn type: BLANK (repo trắng có readme/gitignore) hoặc FORK (fork từ https://github.com/apache/kafka hoặc repo khác với tên tự chọn). Tự động lưu vào OrganizationRepo và RepositoryRepo.
   *
   * @tags github-upload
   * @name CreateRepository
   * @summary Tạo mới repository tổng hợp cho Organization (hỗ trợ BLANK hoặc FORK)
   * @request POST:/v1/github/orgs/{org}/repos
   */
  createRepository = (
    { org }: CreateRepositoryParams,
    data: GitHubCreateRepoRequest,
    params: RequestParams = {},
  ) =>
    this.http.request<GitHubCreateRepoResponse, any>({
      path: `/v1/github/orgs/${org}/repos`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * @description Thêm một root domain (ví dụ: quickgg.top) vào bảng github_upload.root_domains.
   *
   * @tags github-upload
   * @name CreateRootDomain
   * @summary Thêm mới root domain
   * @request POST:/v1/github/root-domains
   */
  createRootDomain = (
    data: GitHubRootDomainRequest,
    params: RequestParams = {},
  ) =>
    this.http.request<RootDomainEntity, any>({
      path: `/v1/github/root-domains`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * @description Xoá video theo `video_id` và `video_type`. Dùng cho tác vụ quản trị dữ liệu.
   *
   * @tags X-video manage
   * @name Delete
   * @summary Xoá video theo id và loại
   * @request DELETE:/v1/api/video_sex_remote_gitlab_db/{video_id}/{video_type}
   */
  delete = ({ videoId, videoType }: DeleteParams, params: RequestParams = {}) =>
    this.http.request<string, any>({
      path: `/v1/api/video_sex_remote_gitlab_db/${videoId}/${videoType}`,
      method: "DELETE",
      ...params,
    });
  /**
   * @description Xoá một root domain khỏi bảng github_upload.root_domains.
   *
   * @tags github-upload
   * @name DeleteRootDomain
   * @summary Xoá root domain theo ID
   * @request DELETE:/v1/github/root-domains/{id}
   */
  deleteRootDomain = (
    { id }: DeleteRootDomainParams,
    params: RequestParams = {},
  ) =>
    this.http.request<unknown, any>({
      path: `/v1/github/root-domains/${id}`,
      method: "DELETE",
      ...params,
    });
  /**
   * @description Kiểm tra nhanh video có tồn tại theo id hay không. Trả về 404 nếu không tìm thấy.
   *
   * @tags X-video manage
   * @name ExistsById
   * @summary Kiểm tra tồn tại video (HEAD)
   * @request HEAD:/v1/api/video_sex_remote_gitlab_db/{id}
   */
  existsById = ({ id }: ExistsByIdParams, params: RequestParams = {}) =>
    this.http.request<string, any>({
      path: `/v1/api/video_sex_remote_gitlab_db/${id}`,
      method: "HEAD",
      ...params,
    });
  /**
   * @description Lưu mới thông tin video vào kho `video_sex_remote_gitlab_db` cùng metadata category.
   *
   * @tags X-video manage
   * @name FindById
   * @summary Tạo mới video
   * @request POST:/v1/api/video_sex_remote_gitlab_db
   */
  findById = (data: Request, params: RequestParams = {}) =>
    this.http.request<Request, any>({
      path: `/v1/api/video_sex_remote_gitlab_db`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * @description Trả về thông tin video theo id, có thể lọc theo requireVideoType và bật/tắt truy vấn sub video.
   *
   * @tags X-video manage
   * @name FindById1
   * @summary Lấy chi tiết video theo id
   * @request GET:/v1/api/video_sex_remote_gitlab_db/{id}
   */
  findById1 = ({ id, ...query }: FindById1Params, params: RequestParams = {}) =>
    this.http.request<VideoSexRemoteGitlabServiceModel, any>({
      path: `/v1/api/video_sex_remote_gitlab_db/${id}`,
      method: "GET",
      query: query,
      ...params,
    });
  /**
   * @description Trả về các URL phát video đã giải mã cho một video cụ thể.
   *
   * @tags X-video manage
   * @name FindById2
   * @summary Lấy danh sách URL theo video id
   * @request GET:/v1/api/videos/urls/{id}
   */
  findById2 = ({ id }: FindById2Params, params: RequestParams = {}) =>
    this.http.request<VideoUrlDecodeModel[], any>({
      path: `/v1/api/videos/urls/${id}`,
      method: "GET",
      ...params,
    });
  /**
   * @description Trả về các video chưa có bản ghi URL cho type chỉ định, hỗ trợ phân trang.
   *
   * @tags X-video manage
   * @name FindNotHaveType
   * @summary Lấy danh sách video chưa có URL theo type
   * @request GET:/v1/api/videos/urls/types/{type}/NotHave
   */
  findNotHaveType = (
    { type, ...query }: FindNotHaveTypeParams,
    params: RequestParams = {},
  ) =>
    this.http.request<PageVideoUrlDecodeWithIdModel, any>({
      path: `/v1/api/videos/urls/types/${type}/NotHave`,
      method: "GET",
      query: query,
      ...params,
    });
  /**
   * @description Trả về 1 phần tử video ngẫu nhiên (Page) có thể lọc theo loại video.
   *
   * @tags X-video manage
   * @name FindRandom
   * @summary Lấy ngẫu nhiên 1 video
   * @request GET:/v1/api/video_sex_remote_gitlab_db/random
   */
  findRandom = (query: FindRandomParams = {}, params: RequestParams = {}) =>
    this.http.request<PageVideoSexRemoteGitlabServiceModel, any>({
      path: `/v1/api/video_sex_remote_gitlab_db/random`,
      method: "GET",
      query: query,
      ...params,
    });
  /**
   * @description Trả về các video URL theo loại (type), hỗ trợ phân trang.
   *
   * @tags X-video manage
   * @name FindType
   * @summary Lấy danh sách URL theo type
   * @request GET:/v1/api/videos/urls/types/{type}
   */
  findType = ({ type, ...query }: FindTypeParams, params: RequestParams = {}) =>
    this.http.request<PageVideoUrlDecodeWithIdModel, any>({
      path: `/v1/api/videos/urls/types/${type}`,
      method: "GET",
      query: query,
      ...params,
    });
  /**
   * @description Truy vấn thông tin tài khoản và toàn bộ danh sách role theo từng service mà tài khoản sở hữu.
   *
   * @tags account
   * @name GetAccountById
   * @summary Lấy thông tin chi tiết tài khoản theo ID
   * @request GET:/v1/account/{id}
   * @secure
   */
  getAccountById = ({ id }: GetAccountByIdParams, params: RequestParams = {}) =>
    this.http.request<AccountResponse, any>({
      path: `/v1/account/${id}`,
      method: "GET",
      secure: true,
      ...params,
    });
  /**
   * @description Truy vấn danh sách tất cả tài khoản cùng toàn bộ role theo từng service (chỉ dành cho Super Admin).
   *
   * @tags account
   * @name GetAllAccounts
   * @summary Lấy danh sách toàn bộ tài khoản
   * @request GET:/v1/account
   * @secure
   */
  getAllAccounts = (params: RequestParams = {}) =>
    this.http.request<AccountResponse[], any>({
      path: `/v1/account`,
      method: "GET",
      secure: true,
      ...params,
    });
  /**
   * @description Truy vấn danh sách toàn bộ organization được lưu trong cơ sở dữ liệu thông qua OrganizationRepo.
   *
   * @tags github-upload
   * @name GetAllOrganizations
   * @summary Lấy danh sách tất cả các Organization
   * @request GET:/v1/github/orgs
   */
  getAllOrganizations = (params: RequestParams = {}) =>
    this.http.request<OrganizationEntity[], any>({
      path: `/v1/github/orgs`,
      method: "GET",
      ...params,
    });
  /**
   * @description Truy vấn danh sách các root domain dùng để cấu hình CNAME cho GitHub Pages từ bảng github_upload.root_domains.
   *
   * @tags github-upload
   * @name GetAllRootDomains
   * @summary Lấy danh sách root domain
   * @request GET:/v1/github/root-domains
   */
  getAllRootDomains = (params: RequestParams = {}) =>
    this.http.request<RootDomainEntity[], any>({
      path: `/v1/github/root-domains`,
      method: "GET",
      ...params,
    });
  /**
   * @description Trả về tổng số commit hiện có và latest commit SHA trên branch cấu hình của từng repository (hoặc 1 repository cụ thể nếu truyền param).
   *
   * @tags github-upload
   * @name GetCommitsSummary
   * @summary Lấy số lượng commit hiện tại của các repository
   * @request GET:/v1/github/commits/summary
   */
  getCommitsSummary = (
    query: GetCommitsSummaryParams = {},
    params: RequestParams = {},
  ) =>
    this.http.request<GitHubRepoCommitSummaryResponse[], any>({
      path: `/v1/github/commits/summary`,
      method: "GET",
      query: query,
      ...params,
    });
  /**
   * @description Truy xuất metadata của file trên repository (SHA, kích thước, download URL) bằng đường dẫn file đầy đủ.
   *
   * @tags github-upload
   * @name GetFileMetadata
   * @summary Lấy thông tin và SHA file trên GitHub
   * @request GET:/v1/github/contents/{path}
   */
  getFileMetadata = (
    { path, ...query }: GetFileMetadataParams,
    params: RequestParams = {},
  ) =>
    this.http.request<GitHubFileContentResponse, any>({
      path: `/v1/github/contents/${path}`,
      method: "GET",
      query: query,
      ...params,
    });
  /**
   * @description Truy vấn thông tin chi tiết của organization theo tên org (mã định danh) từ OrganizationRepo.
   *
   * @tags github-upload
   * @name GetOrganization
   * @summary Lấy thông tin chi tiết một Organization
   * @request GET:/v1/github/orgs/{org}
   */
  getOrganization = (
    { org }: GetOrganizationParams,
    params: RequestParams = {},
  ) =>
    this.http.request<OrganizationEntity, any>({
      path: `/v1/github/orgs/${org}`,
      method: "GET",
      ...params,
    });
  /**
   * @description Trả về danh sách các repository (dạng owner/repo) được cấu hình sẵn trong hệ thống.
   *
   * @tags github-upload
   * @name GetRepositories
   * @summary Lấy danh sách các repository đã cấu hình
   * @request GET:/v1/github/repositories
   */
  getRepositories = (params: RequestParams = {}) =>
    this.http.request<string[], any>({
      path: `/v1/github/repositories`,
      method: "GET",
      ...params,
    });
  /**
   * @description Truy vấn danh sách tất cả các repository thuộc một organization từ database thông qua RepositoryRepo.
   *
   * @tags github-upload
   * @name GetRepositoriesByOrg
   * @summary Lấy danh sách các repository của Organization trong database
   * @request GET:/v1/github/orgs/{org}/repos
   */
  getRepositoriesByOrg = (
    { org }: GetRepositoriesByOrgParams,
    params: RequestParams = {},
  ) =>
    this.http.request<RepositoryEntity[], any>({
      path: `/v1/github/orgs/${org}/repos`,
      method: "GET",
      ...params,
    });
  /**
   * @description Truyền query param serviceCode (ví dụ: VIDEOS_MANAGE) để lấy danh sách role của riêng service đó, hoặc bỏ trống để lấy toàn bộ.
   *
   * @tags account
   * @name GetServiceRolesCatalog
   * @summary Lấy danh sách role theo service hoặc toàn bộ hệ thống
   * @request GET:/v1/account/roles
   */
  getServiceRolesCatalog = (
    query: GetServiceRolesCatalogParams = {},
    params: RequestParams = {},
  ) =>
    this.http.request<ServiceRolesCatalogResponse, any>({
      path: `/v1/account/roles`,
      method: "GET",
      query: query,
      ...params,
    });
  /**
   * @description Xác thực tài khoản bằng username/email + password. Nếu truyền serviceCode, token sẽ tự động resolve role của service đó (nếu là SuperAdmin sẽ luôn có quyền tối cao SUPER_ADMIN).
   *
   * @tags account
   * @name Login
   * @summary Đăng nhập tài khoản đa hệ thống
   * @request POST:/v1/account/login
   */
  login = (data: LoginRequest, params: RequestParams = {}) =>
    this.http.request<AuthResponse, any>({
      path: `/v1/account/login`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * @description Trả về danh sách video mới theo phân trang, hỗ trợ lọc requireVideoType.
   *
   * @tags X-video manage
   * @name NewVideo
   * @summary Lấy danh sách video mới
   * @request GET:/v1/api/video_sex_remote_gitlab_db
   */
  newVideo = (query: NewVideoParams = {}, params: RequestParams = {}) =>
    this.http.request<PageVideoSexRemoteGitlabServiceModel, any>({
      path: `/v1/api/video_sex_remote_gitlab_db`,
      method: "GET",
      query: query,
      ...params,
    });
  /**
   * @description Duyệt toàn bộ repository thuộc Organization trong database, đọc domain đang cấu hình trên GitHub (GitHub Pages / file CNAME) và đồng bộ lại vào database nếu có sự khác biệt.
   *
   * @tags github-upload
   * @name PullOrgRepoDomains
   * @summary Pull lại cấu hình domain từ GitHub cho toàn bộ repository của Organization
   * @request POST:/v1/github/orgs/{org}/repos/domain/pull
   */
  pullOrgRepoDomains = (
    { org }: PullOrgRepoDomainsParams,
    params: RequestParams = {},
  ) =>
    this.http.request<GitHubPullRepoDomainResponse[], any>({
      path: `/v1/github/orgs/${org}/repos/domain/pull`,
      method: "POST",
      ...params,
    });
  /**
   * @description Đọc domain đang cấu hình trên GitHub (ưu tiên GitHub Pages CNAME, fallback sang file CNAME trên branch cấu hình) và đồng bộ lại vào database nếu khác với dữ liệu hiện tại.
   *
   * @tags github-upload
   * @name PullRepoDomain
   * @summary Pull lại cấu hình domain từ GitHub cho một repository
   * @request POST:/v1/github/orgs/{org}/repos/{repo}/domain/pull
   */
  pullRepoDomain = (
    { org, repo }: PullRepoDomainParams,
    params: RequestParams = {},
  ) =>
    this.http.request<GitHubPullRepoDomainResponse, any>({
      path: `/v1/github/orgs/${org}/repos/${repo}/domain/pull`,
      method: "POST",
      ...params,
    });
  /**
   * @description Tạo tài khoản dùng chung cho toàn bộ hệ sinh thái (web, mobile app). Có thể truyền serviceCode để tự động gắn quyền USER ban đầu.
   *
   * @tags account
   * @name Register
   * @summary Đăng ký tài khoản mới
   * @request POST:/v1/account/register
   */
  register = (data: RegisterRequest, params: RequestParams = {}) =>
    this.http.request<AuthResponse, any>({
      path: `/v1/account/register`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * @description Gỡ bỏ phân quyền của tài khoản trên một dịch vụ xác định.
   *
   * @tags account
   * @name RemoveServiceRole
   * @summary Xóa vai trò của tài khoản trên dịch vụ cụ thể
   * @request DELETE:/v1/account/{id}/roles/{serviceCode}
   * @secure
   */
  removeServiceRole = (
    { id, serviceCode }: RemoveServiceRoleParams,
    params: RequestParams = {},
  ) =>
    this.http.request<AccountResponse, any>({
      path: `/v1/account/${id}/roles/${serviceCode}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * @description Lưu một bản ghi `video_url` vào bảng `video_sex_remote_gitlab_db_video_url`.
   *
   * @tags X-video manage
   * @name Save
   * @summary Lưu URL video
   * @request POST:/v1/api/video_sex_remote_gitlab_db_video_url
   */
  save = (
    data: VideoSexRemoteGitlabVideoUrlEntity,
    params: RequestParams = {},
  ) =>
    this.http.request<string, any>({
      path: `/v1/api/video_sex_remote_gitlab_db_video_url`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * @description Thu gọn toàn bộ lịch sử commit về đúng 2 commit (Commit #1: Root 404.html; Commit #2: Squashed state commit chứa toàn bộ 100% dữ liệu file hiện tại). Đảm bảo không mất bất kỳ file nào. (Yêu cầu đăng nhập quyền SUPER_ADMIN).
   *
   * @tags github-upload
   * @name SquashCommits
   * @summary Gộp toàn bộ commit của repository về đúng 2 commit duy nhất
   * @request POST:/v1/github/commits/squash
   * @secure
   */
  squashCommits = (
    query: SquashCommitsParams = {},
    params: RequestParams = {},
  ) =>
    this.http.request<GitHubSquashCommitsResponse, any>({
      path: `/v1/github/commits/squash`,
      method: "POST",
      query: query,
      secure: true,
      ...params,
    });
  /**
   * @description Tạo bản sao lưu gộp tất cả schema của PostgreSQL (.sql.gz) và upload trực tiếp lên repository GitHub đã cấu hình.
   *
   * @tags postgres-backup
   * @name TriggerBackupNow
   * @summary Kích hoạt sao lưu toàn bộ PostgreSQL và upload lên GitHub
   * @request POST:/v1/github/backup/postgres
   */
  triggerBackupNow = (params: RequestParams = {}) =>
    this.http.request<PostgresBackupResult, any>({
      path: `/v1/github/backup/postgres`,
      method: "POST",
      ...params,
    });
  /**
   * @description Cập nhật thông tin category dựa trên payload truyền vào.
   *
   * @tags X-video manage
   * @name Update
   * @summary Cập nhật category
   * @request PATCH:/v1/api/category
   */
  update = (data: CategoryEntity, params: RequestParams = {}) =>
    this.http.request<boolean, any>({
      path: `/v1/api/category`,
      method: "PATCH",
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * @description Cập nhật trường `imageUrl` cho video theo `id`.
   *
   * @tags X-video manage
   * @name UpdateImageUrl
   * @summary Cập nhật image URL của video
   * @request PATCH:/v1/api/video_sex_remote_gitlab_db/image_url
   */
  updateImageUrl = (data: UpdateImageUrlRequest, params: RequestParams = {}) =>
    this.http.request<VideoSexRemoteGitlabEntity, any>({
      path: `/v1/api/video_sex_remote_gitlab_db/image_url`,
      method: "PATCH",
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * @description Tải file lên thư mục GitHub repository bằng multipart/form-data. Nếu không truyền repository sẽ tự động chọn ngẫu nhiên 1 repository từ danh sách cấu hình. Cờ randomFileName cho phép tự động tạo tên file ngẫu nhiên với prefix yyyyMMddHHmmss.
   *
   * @tags github-upload
   * @name UploadFile
   * @summary Upload file nhị phân/văn bản (Multipart)
   * @request POST:/v1/github/upload/file
   */
  uploadFile = (
    query: UploadFileParams = {},
    data: UploadFilePayload,
    params: RequestParams = {},
  ) =>
    this.http.request<GitHubUploadResponse, any>({
      path: `/v1/github/upload/file`,
      method: "POST",
      query: query,
      body: data,
      type: ContentType.FormData,
      ...params,
    });
  /**
   * @description Upsert category theo dữ liệu gửi lên. Nếu đã tồn tại sẽ cập nhật thông tin hiện có.
   *
   * @tags X-video manage
   * @name Upsert
   * @summary Tạo hoặc cập nhật category
   * @request POST:/v1/api/category
   */
  upsert = (data: CategoryEntity, params: RequestParams = {}) =>
    this.http.request<object, any>({
      path: `/v1/api/category`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * @description Trả về video thuộc một category, hỗ trợ page/limit và lọc theo requireVideoType.
   *
   * @tags X-video manage
   * @name VideoByCategory
   * @summary Lấy video theo category
   * @request GET:/v1/api/video_sex_remote_gitlab_db/category/{category}
   */
  videoByCategory = (
    { category, ...query }: VideoByCategoryParams,
    params: RequestParams = {},
  ) =>
    this.http.request<PageVideoSexRemoteGitlabServiceModel, any>({
      path: `/v1/api/video_sex_remote_gitlab_db/category/${category}`,
      method: "GET",
      query: query,
      ...params,
    });
}
