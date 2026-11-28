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
  AuthResponse,
  CategoryServiceModel,
  CategoryUpsertRequest,
  CreateVideoRequest,
  GitHubAccessibleOrgResponse,
  GitHubCreateForkRepoRequest,
  GitHubCreateRepoRequest,
  GitHubCreateRepoResponse,
  GitHubFileContentResponse,
  GitHubImportOrganizationsRequest,
  GitHubImportOrganizationsResponse,
  GitHubOrgInvitationActionRequest,
  GitHubOrgInvitationActionResponse,
  GitHubOrgInvitationResponse,
  GitHubPullRepoDomainResponse,
  GitHubRepoCommitSummaryResponse,
  GitHubRepoDefaultConfigRequest,
  GitHubRepoDefaultConfigResponse,
  GitHubRootDomainRequest,
  GitHubSquashCommitsResponse,
  GitHubTokenAccessCheckResponse,
  GitHubTokenCreateRequest,
  GitHubTokenResponse,
  GitHubTokenUpdateRequest,
  GitHubUploadResponse,
  LoginRequest,
  OrganizationEntity,
  PageVideoSexRemoteGitlabServiceModel,
  PageVideoUrlDecodeWithIdModel,
  PostgresBackupResult,
  RegisterRequest,
  RepositoryEntity,
  RootDomainEntity,
  ServiceRolesCatalogResponse,
  StreamingResponseBody,
  UpdateVideoImageUrlRequest,
  UpdateVideoImageUrlResponse,
  UploadFilePayload,
  VideoSexRemoteGitlabServiceModel,
  VideoUrlDecodeModel,
  VideoUrlSaveRequest,
  Viet69ImportRequest,
  Viet69ImportResponse,
  Viet69PageResponse,
  Viet69VideoInfoResponse,
} from "./data-contracts";

export namespace V1 {
  /**
   * @description Cho phép Super Admin gán vai trò (ADMIN, MODERATOR, VIP, USER...) cho tài khoản ở một dịch vụ xác định.
   * @tags account
   * @name AssignServiceRole
   * @summary Gán hoặc cập nhật vai trò (Role) cho tài khoản trên dịch vụ cụ thể
   * @request PUT:/v1/account/{id}/roles
   * @secure
   */
  export namespace AssignServiceRole {
    export type RequestParams = {
      /**
       * ID tài khoản
       * @format int64
       * @example 1
       */
      id: number;
    };
    export type RequestQuery = {};
    export type RequestBody = AssignRoleRequest;
    export type RequestHeaders = {};
    export type ResponseBody = AccountResponse;
  }

  /**
   * @description Trả về toàn bộ category đang có trong hệ thống video manage.
   * @tags X-video manage
   * @name Categorys
   * @summary Lấy danh sách category
   * @request GET:/v1/api/category
   */
  export namespace Categorys {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CategoryServiceModel[];
  }

  /**
   * @description Trả về toàn bộ category hiện dùng trong kho video.
   * @tags X-video manage
   * @name Categorys1
   * @summary Lấy danh sách category video
   * @request GET:/v1/api/video_sex_remote_gitlab_db/categorys
   */
  export namespace Categorys1 {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CategoryServiceModel[];
  }

  /**
   * @description Nếu không truyền org: kiểm tra token với toàn bộ organizations và repositories đang có trong DB. Nếu truyền org: chỉ kiểm tra với organization đó và các repo thuộc org đó. Yêu cầu quyền SUPER_ADMIN.
   * @tags github-upload
   * @name CheckTokenAccess
   * @summary Kiểm tra quyền truy cập của token với toàn bộ hoặc 1 organization & repositories trong DB
   * @request GET:/v1/github/tokens/{id}/check-access
   * @secure
   */
  export namespace CheckTokenAccess {
    export type RequestParams = {
      /** ID ngẫu nhiên (UUID) của token cần kiểm tra */
      id: string;
    };
    export type RequestQuery = {
      /** Tên organization cần kiểm tra riêng (bỏ trống để kiểm tra tất cả org và repo trong DB) */
      org?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GitHubTokenAccessCheckResponse;
  }

  /**
   * @description Kiểm tra xem token (theo ID) có quyền truy cập organization chỉ định và các repository thuộc organization đó trong DB hay chưa. Yêu cầu quyền SUPER_ADMIN.
   * @tags github-upload
   * @name CheckTokenOrgAccess
   * @summary Kiểm tra quyền truy cập của token với 1 organization cụ thể
   * @request GET:/v1/github/tokens/{id}/organizations/{org}/check-access
   * @secure
   */
  export namespace CheckTokenOrgAccess {
    export type RequestParams = {
      /** ID ngẫu nhiên (UUID) của token cần kiểm tra */
      id: string;
      /** Tên (slug/login) của organization cần kiểm tra */
      org: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GitHubTokenAccessCheckResponse;
  }

  /**
   * @description Tự động tạo nhánh cấu hình (github.upload.branch) kèm trang 404.html theo logic hiện có, tạo/cập nhật file CNAME với nội dung '{repo}.{rootDomain}', cấu hình GitHub Pages trỏ vào branch cấu hình và cập nhật domain trong database.
   * @tags github-upload
   * @name ConfigureDefaultRepo
   * @summary Cấu hình mặc định cho repository (404.html, CNAME, GitHub Pages)
   * @request POST:/v1/github/orgs/{org}/repos/{repo}/default-config
   */
  export namespace ConfigureDefaultRepo {
    export type RequestParams = {
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
    };
    export type RequestQuery = {};
    export type RequestBody = GitHubRepoDefaultConfigRequest;
    export type RequestHeaders = {};
    export type ResponseBody = GitHubRepoDefaultConfigResponse;
  }

  /**
   * @description Trả về tổng số bản ghi video thuộc category chỉ định.
   * @tags X-video manage
   * @name Count
   * @summary Đếm số video theo category
   * @request GET:/v1/api/category_with_video/{category}/count
   */
  export namespace Count {
    export type RequestParams = {
      category: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = Record<string, number>;
  }

  /**
   * @description Fork một repository (mặc định là 'https://github.com/apache/kafka' hoặc repository URL bất kỳ) sang Organization và đặt tên mới theo ý muốn của bạn. Thông tin được lưu vào OrganizationRepo và RepositoryRepo. (Yêu cầu đăng nhập quyền SUPER_ADMIN).
   * @tags github-upload
   * @name CreateForkRepository
   * @summary Fork repository cho Organization với tên tự đặt (Loại 2)
   * @request POST:/v1/github/orgs/{org}/repos/fork
   * @secure
   */
  export namespace CreateForkRepository {
    export type RequestParams = {
      /**
       * Tên organization nhận bản fork (khớp với OrganizationRepo)
       * @example "ABaiSt3LG9ALGNJD"
       */
      org: string;
    };
    export type RequestQuery = {};
    export type RequestBody = GitHubCreateForkRepoRequest;
    export type RequestHeaders = {};
    export type ResponseBody = GitHubCreateRepoResponse;
  }

  /**
   * @description Endpoint hợp nhất cho phép tạo repo mới bằng cách chọn type: BLANK (repo trắng có readme/gitignore) hoặc FORK (fork từ https://github.com/apache/kafka hoặc repo khác với tên tự chọn). Tự động lưu vào OrganizationRepo và RepositoryRepo.
   * @tags github-upload
   * @name CreateRepository
   * @summary Tạo mới repository tổng hợp cho Organization (hỗ trợ BLANK hoặc FORK)
   * @request POST:/v1/github/orgs/{org}/repos
   */
  export namespace CreateRepository {
    export type RequestParams = {
      /**
       * Tên organization sở hữu (khớp với OrganizationRepo)
       * @example "ABaiSt3LG9ALGNJD"
       */
      org: string;
    };
    export type RequestQuery = {};
    export type RequestBody = GitHubCreateRepoRequest;
    export type RequestHeaders = {};
    export type ResponseBody = GitHubCreateRepoResponse;
  }

  /**
   * @description Thêm một root domain (ví dụ: quickgg.top) vào bảng github_upload.root_domains.
   * @tags github-upload
   * @name CreateRootDomain
   * @summary Thêm mới root domain
   * @request POST:/v1/github/root-domains
   */
  export namespace CreateRootDomain {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GitHubRootDomainRequest;
    export type RequestHeaders = {};
    export type ResponseBody = RootDomainEntity;
  }

  /**
   * @description Lưu GitHub token mới vào bảng github_upload.tokens với token và cờ isSuperToken. Tự động sinh ID ngẫu nhiên (UUID), mặc định isActive = true và tự động fetch thông tin account từ GitHub API /user. Yêu cầu quyền SUPER_ADMIN.
   * @tags github-upload
   * @name CreateToken
   * @summary Thêm mới GitHub token
   * @request POST:/v1/github/tokens
   * @secure
   */
  export namespace CreateToken {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GitHubTokenCreateRequest;
    export type RequestHeaders = {};
    export type ResponseBody = GitHubTokenResponse;
  }

  /**
   * @description Lưu mới thông tin video vào kho `video_sex_remote_gitlab_db` cùng metadata category.
   * @tags X-video manage
   * @name CreateVideo
   * @summary Tạo mới video
   * @request POST:/v1/api/video_sex_remote_gitlab_db
   */
  export namespace CreateVideo {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CreateVideoRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CreateVideoRequest;
  }

  /**
   * @description Xoá video theo `video_id` và `video_type`. Dùng cho tác vụ quản trị dữ liệu.
   * @tags X-video manage
   * @name Delete
   * @summary Xoá video theo id và loại
   * @request DELETE:/v1/api/video_sex_remote_gitlab_db/{video_id}/{video_type}
   */
  export namespace Delete {
    export type RequestParams = {
      videoId: string;
      videoType: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = string;
  }

  /**
   * @description Xoá một root domain khỏi bảng github_upload.root_domains.
   * @tags github-upload
   * @name DeleteRootDomain
   * @summary Xoá root domain theo ID
   * @request DELETE:/v1/github/root-domains/{id}
   */
  export namespace DeleteRootDomain {
    export type RequestParams = {
      /**
       * ID của root domain cần xoá
       * @format int64
       * @example 1
       */
      id: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = unknown;
  }

  /**
   * @description Xoá một GitHub token khỏi bảng github_upload.tokens theo ID. Yêu cầu quyền SUPER_ADMIN.
   * @tags github-upload
   * @name DeleteToken
   * @summary Xoá GitHub token
   * @request DELETE:/v1/github/tokens/{id}
   * @secure
   */
  export namespace DeleteToken {
    export type RequestParams = {
      /** ID ngẫu nhiên (UUID) của token cần xoá */
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = unknown;
  }

  /**
   * @description Tải video từ Viet69 (truyền 'video' hoặc 'googleVideoUrl'), hỗ trợ chọn chất lượng qua 'itag', tải song song N luồng qua 'threads' (mặc định 3) và HTTP Range.
   * @tags viet69
   * @name DownloadVideo
   * @summary Tải video trực tiếp (streaming song song nhiều luồng)
   * @request GET:/v1/viet69/download
   */
  export namespace DownloadVideo {
    export type RequestParams = {};
    export type RequestQuery = {
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
    };
    export type RequestBody = never;
    export type RequestHeaders = {
      Range?: string;
    };
    export type ResponseBody = StreamingResponseBody;
  }

  /**
   * @description Kiểm tra nhanh video có tồn tại theo id hay không. Trả về 404 nếu không tìm thấy.
   * @tags X-video manage
   * @name ExistsById
   * @summary Kiểm tra tồn tại video (HEAD)
   * @request HEAD:/v1/api/video_sex_remote_gitlab_db/{id}
   */
  export namespace ExistsById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = string;
  }

  /**
   * @description Trả về thông tin video theo id, có thể lọc theo requireVideoType và bật/tắt truy vấn sub video.
   * @tags X-video manage
   * @name FindById
   * @summary Lấy chi tiết video theo id
   * @request GET:/v1/api/video_sex_remote_gitlab_db/{id}
   */
  export namespace FindById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {
      /** @default true */
      findSubVideo?: boolean;
      requireVideoType?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = VideoSexRemoteGitlabServiceModel;
  }

  /**
   * @description Trả về các URL phát video đã giải mã cho một video cụ thể.
   * @tags X-video manage
   * @name FindById1
   * @summary Lấy danh sách URL theo video id
   * @request GET:/v1/api/videos/urls/{id}
   */
  export namespace FindById1 {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = VideoUrlDecodeModel[];
  }

  /**
   * @description Trả về các video chưa có bản ghi URL cho type chỉ định, hỗ trợ phân trang.
   * @tags X-video manage
   * @name FindNotHaveType
   * @summary Lấy danh sách video chưa có URL theo type
   * @request GET:/v1/api/videos/urls/types/{type}/NotHave
   */
  export namespace FindNotHaveType {
    export type RequestParams = {
      type: string;
    };
    export type RequestQuery = {
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
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PageVideoUrlDecodeWithIdModel;
  }

  /**
   * @description Trả về 1 phần tử video ngẫu nhiên (Page) có thể lọc theo loại video.
   * @tags X-video manage
   * @name FindRandom
   * @summary Lấy ngẫu nhiên 1 video
   * @request GET:/v1/api/video_sex_remote_gitlab_db/random
   */
  export namespace FindRandom {
    export type RequestParams = {};
    export type RequestQuery = {
      requireVideoType?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PageVideoSexRemoteGitlabServiceModel;
  }

  /**
   * @description Trả về các video URL theo loại (type), hỗ trợ phân trang.
   * @tags X-video manage
   * @name FindType
   * @summary Lấy danh sách URL theo type
   * @request GET:/v1/api/videos/urls/types/{type}
   */
  export namespace FindType {
    export type RequestParams = {
      type: string;
    };
    export type RequestQuery = {
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
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PageVideoUrlDecodeWithIdModel;
  }

  /**
   * @description Gọi GitHub API /user/orgs bằng token tương ứng với ID để trả về danh sách organizations có thể truy cập kèm trạng thái đã import hay chưa. Yêu cầu quyền SUPER_ADMIN.
   * @tags github-upload
   * @name GetAccessibleOrganizations
   * @summary Lấy danh sách GitHub organizations mà token có quyền truy cập
   * @request GET:/v1/github/tokens/{id}/organizations
   * @secure
   */
  export namespace GetAccessibleOrganizations {
    export type RequestParams = {
      /** ID ngẫu nhiên (UUID) của token */
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GitHubAccessibleOrgResponse[];
  }

  /**
   * @description Truy vấn thông tin tài khoản và toàn bộ danh sách role theo từng service mà tài khoản sở hữu.
   * @tags account
   * @name GetAccountById
   * @summary Lấy thông tin chi tiết tài khoản theo ID
   * @request GET:/v1/account/{id}
   * @secure
   */
  export namespace GetAccountById {
    export type RequestParams = {
      /**
       * ID tài khoản
       * @format int64
       * @example 1
       */
      id: number;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = AccountResponse;
  }

  /**
   * @description Truy vấn danh sách tất cả tài khoản cùng toàn bộ role theo từng service (chỉ dành cho Super Admin).
   * @tags account
   * @name GetAllAccounts
   * @summary Lấy danh sách toàn bộ tài khoản
   * @request GET:/v1/account
   * @secure
   */
  export namespace GetAllAccounts {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = AccountResponse[];
  }

  /**
   * @description Truy vấn danh sách toàn bộ organization được lưu trong cơ sở dữ liệu thông qua OrganizationRepo.
   * @tags github-upload
   * @name GetAllOrganizations
   * @summary Lấy danh sách tất cả các Organization
   * @request GET:/v1/github/orgs
   */
  export namespace GetAllOrganizations {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = OrganizationEntity[];
  }

  /**
   * @description Truy vấn danh sách các root domain dùng để cấu hình CNAME cho GitHub Pages từ bảng github_upload.root_domains.
   * @tags github-upload
   * @name GetAllRootDomains
   * @summary Lấy danh sách root domain
   * @request GET:/v1/github/root-domains
   */
  export namespace GetAllRootDomains {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RootDomainEntity[];
  }

  /**
   * @description Truy vấn danh sách các GitHub token trong bảng github_upload.tokens (có thể lọc riêng super token). Yêu cầu quyền SUPER_ADMIN.
   * @tags github-upload
   * @name GetAllTokens
   * @summary Lấy danh sách GitHub tokens
   * @request GET:/v1/github/tokens
   * @secure
   */
  export namespace GetAllTokens {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Nếu true chỉ trả về các super token
       * @default false
       * @example false
       */
      superTokenOnly?: boolean;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GitHubTokenResponse[];
  }

  /**
   * @description Trả về tổng số commit hiện có và latest commit SHA trên branch cấu hình của từng repository (hoặc 1 repository cụ thể nếu truyền param).
   * @tags github-upload
   * @name GetCommitsSummary
   * @summary Lấy số lượng commit hiện tại của các repository
   * @request GET:/v1/github/commits/summary
   */
  export namespace GetCommitsSummary {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Repository cụ thể cần kiểm tra (owner/repo). Nếu bỏ trống sẽ kiểm tra toàn bộ danh sách repositories đã cấu hình.
       * @example "ABaiSt3LG9ALGNJD/jjjeJ4d8fsEc5M7g"
       */
      repository?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GitHubRepoCommitSummaryResponse[];
  }

  /**
   * @description Truy xuất metadata của file trên repository (SHA, kích thước, download URL) bằng đường dẫn file đầy đủ.
   * @tags github-upload
   * @name GetFileMetadata
   * @summary Lấy thông tin và SHA file trên GitHub
   * @request GET:/v1/github/contents/{path}
   */
  export namespace GetFileMetadata {
    export type RequestParams = {
      path: string;
    };
    export type RequestQuery = {
      /**
       * Repository theo định dạng 'owner/repo'
       * @example "ABaiSt3LG9ALGNJD/jjjeJ4d8fsEc5M7g"
       */
      repository?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GitHubFileContentResponse;
  }

  /**
   * @description Truy vấn thông tin chi tiết của organization theo tên org (mã định danh) từ OrganizationRepo.
   * @tags github-upload
   * @name GetOrganization
   * @summary Lấy thông tin chi tiết một Organization
   * @request GET:/v1/github/orgs/{org}
   */
  export namespace GetOrganization {
    export type RequestParams = {
      /**
       * Tên / mã organization cần tìm
       * @example "ABaiSt3LG9ALGNJD"
       */
      org: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = OrganizationEntity;
  }

  /**
   * @description Trả về danh sách các repository (dạng owner/repo) được cấu hình sẵn trong hệ thống.
   * @tags github-upload
   * @name GetRepositories
   * @summary Lấy danh sách các repository đã cấu hình
   * @request GET:/v1/github/repositories
   */
  export namespace GetRepositories {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = string[];
  }

  /**
   * @description Truy vấn danh sách tất cả các repository thuộc một organization từ database thông qua RepositoryRepo.
   * @tags github-upload
   * @name GetRepositoriesByOrg
   * @summary Lấy danh sách các repository của Organization trong database
   * @request GET:/v1/github/orgs/{org}/repos
   */
  export namespace GetRepositoriesByOrg {
    export type RequestParams = {
      /**
       * Tên organization cần truy vấn
       * @example "ABaiSt3LG9ALGNJD"
       */
      org: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RepositoryEntity[];
  }

  /**
   * @description Truyền query param serviceCode (ví dụ: VIDEOS_MANAGE) để lấy danh sách role của riêng service đó, hoặc bỏ trống để lấy toàn bộ.
   * @tags account
   * @name GetServiceRolesCatalog
   * @summary Lấy danh sách role theo service hoặc toàn bộ hệ thống
   * @request GET:/v1/account/roles
   */
  export namespace GetServiceRolesCatalog {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Mã dịch vụ (bỏ trống để lấy tất cả)
       * @example "VIDEOS_MANAGE"
       */
      serviceCode?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = ServiceRolesCatalogResponse;
  }

  /**
   * @description Truy vấn thông tin chi tiết của một token và thông tin account sở hữu theo ID ngẫu nhiên (UUID). Yêu cầu quyền SUPER_ADMIN.
   * @tags github-upload
   * @name GetToken
   * @summary Lấy chi tiết GitHub token
   * @request GET:/v1/github/tokens/{id}
   * @secure
   */
  export namespace GetToken {
    export type RequestParams = {
      /** ID ngẫu nhiên (UUID) của token */
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GitHubTokenResponse;
  }

  /**
   * @description Truyền vào URL hoặc slug video Viet69 để lấy title, mô tả, ảnh thumbnail, danh sách tag (URL và tên hiển thị), đường dẫn Google Blogger và danh sách luồng tải trực tiếp.
   * @tags viet69
   * @name GetVideoInfo
   * @summary Lấy thông tin chi tiết video
   * @request GET:/v1/viet69/video
   */
  export namespace GetVideoInfo {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * URL đầy đủ hoặc slug của video Viet69
       * @minLength 1
       * @example "https://viet69.be/clip-hot-sinh-vien-ha-noi/"
       */
      video: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = Viet69VideoInfoResponse;
  }

  /**
   * @description Truyền vào số trang (page) để lấy danh sách video trên trang tương ứng của Viet69.
   * @tags viet69
   * @name GetVideosByPage
   * @summary Lấy danh sách video theo trang
   * @request GET:/v1/viet69/page
   */
  export namespace GetVideosByPage {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Số trang cần lấy danh sách video
       * @format int32
       * @min 0
       * @default 1
       * @example 1
       */
      page?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = Viet69PageResponse;
  }

  /**
   * @description Kiểm tra tồn tại theo slug. Nếu chưa tồn tại, tải chất lượng cao nhất (song song N luồng), tách thành các file nhỏ HLS fMP4 (init.mp4 + seg_XXXX.m4s + index.m3u8) thuần Java không cần ffmpeg, upload toàn bộ cùng thumbnail vào 1 GitHub repository ngẫu nhiên theo đường dẫn slug trong 1 commit duy nhất và lưu vào hệ thống với type HUB_SERVER_M3U8_CUSTOM_DOMAIN và GOOGLE.
   * @tags X-video manage
   * @name ImportFromViet69
   * @summary Import video từ slug Viet69 sang HLS fMP4 (.m3u8) trên GitHub & lưu hệ thống
   * @request POST:/v1/api/viet69/import
   */
  export namespace ImportFromViet69 {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = Viet69ImportRequest;
    export type RequestHeaders = {};
    export type ResponseBody = Viet69ImportResponse;
  }

  /**
   * @description Chỉ import các organizations nằm trong danh sách orgs gửi lên và token tương ứng với ID thực sự có quyền truy cập vào bảng github_upload.organizations. Yêu cầu quyền SUPER_ADMIN.
   * @tags github-upload
   * @name ImportSelectedOrganizations
   * @summary Import các GitHub organizations được chọn từ token
   * @request POST:/v1/github/tokens/{id}/organizations/import
   * @secure
   */
  export namespace ImportSelectedOrganizations {
    export type RequestParams = {
      /** ID ngẫu nhiên (UUID) của token */
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = GitHubImportOrganizationsRequest;
    export type RequestHeaders = {};
    export type ResponseBody = GitHubImportOrganizationsResponse;
  }

  /**
   * @description Gọi GitHub API /user/memberships/orgs bằng token tương ứng với ID để lấy danh sách lời mời tham gia organization (mặc định state=pending; hỗ trợ pending, active, all). Yêu cầu quyền SUPER_ADMIN.
   * @tags github-upload
   * @name ListOrgInvitations
   * @summary Lấy danh sách yêu cầu/lời mời thêm vào GitHub Organization của user
   * @request GET:/v1/github/tokens/{id}/org-invitations
   * @secure
   */
  export namespace ListOrgInvitations {
    export type RequestParams = {
      /** ID ngẫu nhiên (UUID) của token */
      id: string;
    };
    export type RequestQuery = {
      /**
       * Lọc theo trạng thái lời mời: pending (mặc định), active, hoặc all
       * @default "pending"
       * @example "pending"
       */
      state?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GitHubOrgInvitationResponse[];
  }

  /**
   * @description Xác thực tài khoản bằng username/email + password. Nếu truyền serviceCode, token sẽ tự động resolve role của service đó (nếu là SuperAdmin sẽ luôn có quyền tối cao SUPER_ADMIN).
   * @tags account
   * @name Login
   * @summary Đăng nhập tài khoản đa hệ thống
   * @request POST:/v1/account/login
   */
  export namespace Login {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = LoginRequest;
    export type RequestHeaders = {};
    export type ResponseBody = AuthResponse;
  }

  /**
   * @description Trả về danh sách video mới theo phân trang, hỗ trợ lọc requireVideoType.
   * @tags X-video manage
   * @name NewVideo
   * @summary Lấy danh sách video mới
   * @request GET:/v1/api/video_sex_remote_gitlab_db
   */
  export namespace NewVideo {
    export type RequestParams = {};
    export type RequestQuery = {
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
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PageVideoSexRemoteGitlabServiceModel;
  }

  /**
   * @description Duyệt toàn bộ repository thuộc Organization trong database, đọc domain đang cấu hình trên GitHub (GitHub Pages / file CNAME) và đồng bộ lại vào database nếu có sự khác biệt.
   * @tags github-upload
   * @name PullOrgRepoDomains
   * @summary Pull lại cấu hình domain từ GitHub cho toàn bộ repository của Organization
   * @request POST:/v1/github/orgs/{org}/repos/domain/pull
   */
  export namespace PullOrgRepoDomains {
    export type RequestParams = {
      /**
       * Tên organization cần đồng bộ domain
       * @example "ABaiSt3LG9ALGNJD"
       */
      org: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GitHubPullRepoDomainResponse[];
  }

  /**
   * @description Đọc domain đang cấu hình trên GitHub (ưu tiên GitHub Pages CNAME, fallback sang file CNAME trên branch cấu hình) và đồng bộ lại vào database nếu khác với dữ liệu hiện tại.
   * @tags github-upload
   * @name PullRepoDomain
   * @summary Pull lại cấu hình domain từ GitHub cho một repository
   * @request POST:/v1/github/orgs/{org}/repos/{repo}/domain/pull
   */
  export namespace PullRepoDomain {
    export type RequestParams = {
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
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GitHubPullRepoDomainResponse;
  }

  /**
   * @description Tạo tài khoản dùng chung cho toàn bộ hệ sinh thái (web, mobile app). Có thể truyền serviceCode để tự động gắn quyền USER ban đầu.
   * @tags account
   * @name Register
   * @summary Đăng ký tài khoản mới
   * @request POST:/v1/account/register
   */
  export namespace Register {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = RegisterRequest;
    export type RequestHeaders = {};
    export type ResponseBody = AuthResponse;
  }

  /**
   * @description Gỡ bỏ phân quyền của tài khoản trên một dịch vụ xác định.
   * @tags account
   * @name RemoveServiceRole
   * @summary Xóa vai trò của tài khoản trên dịch vụ cụ thể
   * @request DELETE:/v1/account/{id}/roles/{serviceCode}
   * @secure
   */
  export namespace RemoveServiceRole {
    export type RequestParams = {
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
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = AccountResponse;
  }

  /**
   * @description Cho phép user chọn ACCEPT (đồng ý qua PATCH /user/memberships/orgs/{org} với state=active) hoặc DECLINE (từ chối/hủy lời mời qua DELETE /orgs/{org}/memberships/{username}). Yêu cầu quyền SUPER_ADMIN.
   * @tags github-upload
   * @name RespondToOrgInvitation
   * @summary Đồng ý hoặc từ chối yêu cầu thêm vào GitHub Organization
   * @request POST:/v1/github/tokens/{id}/org-invitations/{org}/respond
   * @secure
   */
  export namespace RespondToOrgInvitation {
    export type RequestParams = {
      /** ID ngẫu nhiên (UUID) của token */
      id: string;
      /** Tên (slug/login) của GitHub organization */
      org: string;
    };
    export type RequestQuery = {};
    export type RequestBody = GitHubOrgInvitationActionRequest;
    export type RequestHeaders = {};
    export type ResponseBody = GitHubOrgInvitationActionResponse;
  }

  /**
   * @description Lưu một bản ghi `video_url` vào bảng `video_sex_remote_gitlab_db_video_url`.
   * @tags X-video manage
   * @name Save
   * @summary Lưu URL video
   * @request POST:/v1/api/video_sex_remote_gitlab_db_video_url
   */
  export namespace Save {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = VideoUrlSaveRequest;
    export type RequestHeaders = {};
    export type ResponseBody = string;
  }

  /**
   * @description Thu gọn toàn bộ lịch sử commit về đúng 2 commit (Commit #1: Root 404.html; Commit #2: Squashed state commit chứa toàn bộ 100% dữ liệu file hiện tại). Đảm bảo không mất bất kỳ file nào. (Yêu cầu đăng nhập quyền SUPER_ADMIN).
   * @tags github-upload
   * @name SquashCommits
   * @summary Gộp toàn bộ commit của repository về đúng 2 commit duy nhất
   * @request POST:/v1/github/commits/squash
   * @secure
   */
  export namespace SquashCommits {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * Repository cần gộp (owner/repo). Nếu bỏ trống sẽ tự động chọn ngẫu nhiên từ danh sách cấu hình.
       * @example "ABaiSt3LG9ALGNJD/jjjeJ4d8fsEc5M7g"
       */
      repository?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GitHubSquashCommitsResponse;
  }

  /**
   * @description Gọi GitHub API /user bằng token tương ứng với ID để cập nhật lại thông tin account (id, username, name, email, type). Yêu cầu quyền SUPER_ADMIN.
   * @tags github-upload
   * @name SyncAccountInfo
   * @summary Đồng bộ lại thông tin GitHub account cho token
   * @request POST:/v1/github/tokens/{id}/sync-account
   * @secure
   */
  export namespace SyncAccountInfo {
    export type RequestParams = {
      /** ID ngẫu nhiên (UUID) của token cần đồng bộ thông tin account */
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GitHubTokenResponse;
  }

  /**
   * @description Tạo bản sao lưu gộp tất cả schema của PostgreSQL (.sql.gz) và upload trực tiếp lên repository GitHub đã cấu hình.
   * @tags postgres-backup
   * @name TriggerBackupNow
   * @summary Kích hoạt sao lưu toàn bộ PostgreSQL và upload lên GitHub
   * @request POST:/v1/github/backup/postgres
   */
  export namespace TriggerBackupNow {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PostgresBackupResult;
  }

  /**
   * @description Cập nhật thông tin category dựa trên payload truyền vào.
   * @tags X-video manage
   * @name Update
   * @summary Cập nhật category
   * @request PATCH:/v1/api/category
   */
  export namespace Update {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CategoryUpsertRequest;
    export type RequestHeaders = {};
    export type ResponseBody = boolean;
  }

  /**
   * @description Cập nhật trường `imageUrl` cho video theo `id`.
   * @tags X-video manage
   * @name UpdateImageUrl
   * @summary Cập nhật image URL của video
   * @request PATCH:/v1/api/video_sex_remote_gitlab_db/image_url
   */
  export namespace UpdateImageUrl {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = UpdateVideoImageUrlRequest;
    export type RequestHeaders = {};
    export type ResponseBody = UpdateVideoImageUrlResponse;
  }

  /**
   * @description Cập nhật cờ isSuperToken và trạng thái kích hoạt isActive của token theo ID. Yêu cầu quyền SUPER_ADMIN.
   * @tags github-upload
   * @name UpdateToken
   * @summary Cập nhật thông tin GitHub token
   * @request PUT:/v1/github/tokens/{id}
   * @secure
   */
  export namespace UpdateToken {
    export type RequestParams = {
      /** ID ngẫu nhiên (UUID) của token cần cập nhật */
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = GitHubTokenUpdateRequest;
    export type RequestHeaders = {};
    export type ResponseBody = GitHubTokenResponse;
  }

  /**
   * @description Tải file lên thư mục GitHub repository bằng multipart/form-data. Nếu không truyền repository sẽ tự động chọn ngẫu nhiên 1 repository từ danh sách cấu hình. Cờ randomFileName cho phép tự động tạo tên file ngẫu nhiên với prefix yyyyMMddHHmmss.
   * @tags github-upload
   * @name UploadFile
   * @summary Upload file nhị phân/văn bản (Multipart)
   * @request POST:/v1/github/upload/file
   */
  export namespace UploadFile {
    export type RequestParams = {};
    export type RequestQuery = {
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
    };
    export type RequestBody = UploadFilePayload;
    export type RequestHeaders = {};
    export type ResponseBody = GitHubUploadResponse;
  }

  /**
   * @description Upsert category theo dữ liệu gửi lên. Nếu đã tồn tại sẽ cập nhật thông tin hiện có.
   * @tags X-video manage
   * @name Upsert
   * @summary Tạo hoặc cập nhật category
   * @request POST:/v1/api/category
   */
  export namespace Upsert {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CategoryUpsertRequest;
    export type RequestHeaders = {};
    export type ResponseBody = Record<string, number>;
  }

  /**
   * @description Trả về video thuộc một category, hỗ trợ page/limit và lọc theo requireVideoType.
   * @tags X-video manage
   * @name VideoByCategory
   * @summary Lấy video theo category
   * @request GET:/v1/api/video_sex_remote_gitlab_db/category/{category}
   */
  export namespace VideoByCategory {
    export type RequestParams = {
      category: string;
    };
    export type RequestQuery = {
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
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PageVideoSexRemoteGitlabServiceModel;
  }
}
