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
  CategoriesAllParams,
  CategoriesDto,
  CategoriesParams,
  MenuParams,
  NewVideo1Params,
  PageResponseBEListVideoDto,
  Search1Params,
  SearchParams,
  TagParams,
  TagsParams,
  UrlVideoDto,
  Video1Params,
  VideoDetailDto,
  VideoInfoDto,
  VideoInfoParams,
  VideoParams,
  VideoUrlParams,
} from "./data-contracts";
import { HttpClient, RequestParams } from "./http-client";

export class Api<SecurityDataType = unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  /**
   * @description Trả về danh sách video theo categories cụ thể, hỗ trợ lang, sort và page.
   *
   * @tags megaxh
   * @name Categories
   * @summary Lấy video theo danh mục
   * @request GET:/api/megaxh/categories
   */
  categories = (query: CategoriesParams, params: RequestParams = {}) =>
    this.http.request<PageResponseBEListVideoDto, any>({
      path: `/api/megaxh/categories`,
      method: "GET",
      query: query,
      ...params,
    });
  /**
   * @description Trả về danh sách category khả dụng theo ngôn ngữ để phục vụ filter hoặc menu frontend.
   *
   * @tags megaxh
   * @name CategoriesAll
   * @summary Lấy toàn bộ danh mục
   * @request GET:/api/megaxh/categories-all
   */
  categoriesAll = (
    query: CategoriesAllParams = {},
    params: RequestParams = {},
  ) =>
    this.http.request<CategoriesDto[], any>({
      path: `/api/megaxh/categories-all`,
      method: "GET",
      query: query,
      ...params,
    });
  /**
   * @description Trả về danh sách category ngẫu nhiên có tính quyết định theo domain, dùng để hiển thị menu frontend.
   *
   * @tags megaxh
   * @name Menu
   * @summary Lấy menu danh mục gợi ý
   * @request GET:/api/megaxh/menu
   */
  menu = (query: MenuParams = {}, params: RequestParams = {}) =>
    this.http.request<CategoriesDto[], any>({
      path: `/api/megaxh/menu`,
      method: "GET",
      query: query,
      ...params,
    });
  /**
   * @description Trả về danh sách video mới nhất theo trang. Dữ liệu được cache Redis để giảm thời gian phản hồi.
   *
   * @tags Xvideos
   * @name NewVideo1
   * @summary Lấy danh sách video mới
   * @request GET:/api/xvideos/new
   */
  newVideo1 = (query: NewVideo1Params = {}, params: RequestParams = {}) =>
    this.http.request<PageResponseBEListVideoDto, any>({
      path: `/api/xvideos/new`,
      method: "GET",
      query: query,
      ...params,
    });
  /**
   * @description Tìm kiếm video theo từ khóa với tùy chọn sắp xếp và phân trang. Tham số search sẽ được encode trước khi truy vấn nguồn dữ liệu.
   *
   * @tags Xvideos
   * @name Search
   * @summary Tìm kiếm video theo từ khóa
   * @request GET:/api/xvideos/search
   */
  search = (query: SearchParams, params: RequestParams = {}) =>
    this.http.request<PageResponseBEListVideoDto, any>({
      path: `/api/xvideos/search`,
      method: "GET",
      query: query,
      ...params,
    });
  /**
   * @description Tìm kiếm video theo từ khóa, ngôn ngữ, sắp xếp và phân trang.
   *
   * @tags megaxh
   * @name Search1
   * @summary Tìm kiếm video
   * @request GET:/api/megaxh/search
   */
  search1 = (query: Search1Params, params: RequestParams = {}) =>
    this.http.request<PageResponseBEListVideoDto, any>({
      path: `/api/megaxh/search`,
      method: "GET",
      query: query,
      ...params,
    });
  /**
   * @description Trả về danh sách video theo tag cụ thể, hỗ trợ sort và phân trang.
   *
   * @tags Xvideos
   * @name Tag
   * @summary Lấy video theo tag
   * @request GET:/api/xvideos/tag
   */
  tag = (query: TagParams, params: RequestParams = {}) =>
    this.http.request<PageResponseBEListVideoDto, any>({
      path: `/api/xvideos/tag`,
      method: "GET",
      query: query,
      ...params,
    });
  /**
   * @description Trả về danh sách video theo tag, hỗ trợ ngôn ngữ và phân trang.
   *
   * @tags megaxh
   * @name Tags
   * @summary Tìm kiếm video theo tag
   * @request GET:/api/megaxh/tags
   */
  tags = (query: TagsParams, params: RequestParams = {}) =>
    this.http.request<PageResponseBEListVideoDto, any>({
      path: `/api/megaxh/tags`,
      method: "GET",
      query: query,
      ...params,
    });
  /**
   * @description Trả về đầy đủ thông tin video theo id, bao gồm metadata và danh sách stream/video URL nếu có.
   *
   * @tags Xvideos
   * @name Video
   * @summary Lấy chi tiết video
   * @request GET:/api/xvideos/video
   */
  video = (query: VideoParams, params: RequestParams = {}) =>
    this.http.request<VideoInfoDto, any>({
      path: `/api/xvideos/video`,
      method: "GET",
      query: query,
      ...params,
    });
  /**
   * @description Trả về thông tin chi tiết một video theo id và ngôn ngữ.
   *
   * @tags megaxh
   * @name Video1
   * @summary Lấy chi tiết video
   * @request GET:/api/megaxh/video
   */
  video1 = (query: Video1Params, params: RequestParams = {}) =>
    this.http.request<VideoDetailDto, any>({
      path: `/api/megaxh/video`,
      method: "GET",
      query: query,
      ...params,
    });
  /**
   * @description Giống endpoint chi tiết video nhưng loại bỏ danh sách stream URL (videos) để giảm kích thước payload.
   *
   * @tags Xvideos
   * @name VideoInfo
   * @summary Lấy metadata video rút gọn
   * @request GET:/api/xvideos/video_info
   */
  videoInfo = (query: VideoInfoParams, params: RequestParams = {}) =>
    this.http.request<VideoInfoDto, any>({
      path: `/api/xvideos/video_info`,
      method: "GET",
      query: query,
      ...params,
    });
  /**
   * @description Trả về tập hợp URL stream/video trực tiếp theo id. Endpoint này dùng cho lớp player.
   *
   * @tags megaxh
   * @name VideoUrl
   * @summary Lấy URL phát video
   * @request GET:/api/megaxh/video_url
   */
  videoUrl = (query: VideoUrlParams, params: RequestParams = {}) =>
    this.http.request<UrlVideoDto, any>({
      path: `/api/megaxh/video_url`,
      method: "GET",
      query: query,
      ...params,
    });
}
