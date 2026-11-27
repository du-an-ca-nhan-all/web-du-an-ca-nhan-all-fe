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
  CategoriesDto,
  PageResponseBEListVideoDto,
  UrlVideoDto,
  VideoDetailDto,
  VideoInfoDto,
} from "./data-contracts";

export namespace Api {
  /**
   * @description Trả về danh sách video theo categories cụ thể, hỗ trợ lang, sort và page.
   * @tags megaxh
   * @name Categories
   * @summary Lấy video theo danh mục
   * @request GET:/api/megaxh/categories
   */
  export namespace Categories {
    export type RequestParams = {};
    export type RequestQuery = {
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
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PageResponseBEListVideoDto;
  }

  /**
   * @description Trả về danh sách category khả dụng theo ngôn ngữ để phục vụ filter hoặc menu frontend.
   * @tags megaxh
   * @name CategoriesAll
   * @summary Lấy toàn bộ danh mục
   * @request GET:/api/megaxh/categories-all
   */
  export namespace CategoriesAll {
    export type RequestParams = {};
    export type RequestQuery = {
      /** @default "en" */
      lang?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CategoriesDto[];
  }

  /**
   * @description Trả về danh sách category ngẫu nhiên có tính quyết định theo domain, dùng để hiển thị menu frontend.
   * @tags megaxh
   * @name Menu
   * @summary Lấy menu danh mục gợi ý
   * @request GET:/api/megaxh/menu
   */
  export namespace Menu {
    export type RequestParams = {};
    export type RequestQuery = {
      /** @default "domain" */
      domain?: string;
      /** @default "en" */
      lang?: string;
      /**
       * @format int32
       * @default 8
       */
      size?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CategoriesDto[];
  }

  /**
   * @description Trả về danh sách video mới nhất theo trang. Dữ liệu được cache Redis để giảm thời gian phản hồi.
   * @tags Xvideos
   * @name NewVideo1
   * @summary Lấy danh sách video mới
   * @request GET:/api/xvideos/new
   */
  export namespace NewVideo1 {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * @format int32
       * @default 1
       */
      page?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PageResponseBEListVideoDto;
  }

  /**
   * @description Tìm kiếm video theo từ khóa với tùy chọn sắp xếp và phân trang. Tham số search sẽ được encode trước khi truy vấn nguồn dữ liệu.
   * @tags Xvideos
   * @name Search
   * @summary Tìm kiếm video theo từ khóa
   * @request GET:/api/xvideos/search
   */
  export namespace Search {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * @format int32
       * @default 1
       */
      page?: number;
      search: string;
      /** @default "relevance" */
      sort?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PageResponseBEListVideoDto;
  }

  /**
   * @description Tìm kiếm video theo từ khóa, ngôn ngữ, sắp xếp và phân trang.
   * @tags megaxh
   * @name Search1
   * @summary Tìm kiếm video
   * @request GET:/api/megaxh/search
   */
  export namespace Search1 {
    export type RequestParams = {};
    export type RequestQuery = {
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
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PageResponseBEListVideoDto;
  }

  /**
   * @description Trả về danh sách video theo tag cụ thể, hỗ trợ sort và phân trang.
   * @tags Xvideos
   * @name Tag
   * @summary Lấy video theo tag
   * @request GET:/api/xvideos/tag
   */
  export namespace Tag {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * @format int32
       * @default 1
       */
      page?: number;
      /** @default "uploaddate" */
      sort?: string;
      tag: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PageResponseBEListVideoDto;
  }

  /**
   * @description Trả về danh sách video theo tag, hỗ trợ ngôn ngữ và phân trang.
   * @tags megaxh
   * @name Tags
   * @summary Tìm kiếm video theo tag
   * @request GET:/api/megaxh/tags
   */
  export namespace Tags {
    export type RequestParams = {};
    export type RequestQuery = {
      /** @default "en" */
      lang?: string;
      /**
       * @format int32
       * @default 1
       */
      page?: number;
      tag: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PageResponseBEListVideoDto;
  }

  /**
   * @description Trả về đầy đủ thông tin video theo id, bao gồm metadata và danh sách stream/video URL nếu có.
   * @tags Xvideos
   * @name Video
   * @summary Lấy chi tiết video
   * @request GET:/api/xvideos/video
   */
  export namespace Video {
    export type RequestParams = {};
    export type RequestQuery = {
      id: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = VideoInfoDto;
  }

  /**
   * @description Trả về thông tin chi tiết một video theo id và ngôn ngữ.
   * @tags megaxh
   * @name Video1
   * @summary Lấy chi tiết video
   * @request GET:/api/megaxh/video
   */
  export namespace Video1 {
    export type RequestParams = {};
    export type RequestQuery = {
      id: string;
      /** @default "en" */
      lang?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = VideoDetailDto;
  }

  /**
   * @description Giống endpoint chi tiết video nhưng loại bỏ danh sách stream URL (videos) để giảm kích thước payload.
   * @tags Xvideos
   * @name VideoInfo
   * @summary Lấy metadata video rút gọn
   * @request GET:/api/xvideos/video_info
   */
  export namespace VideoInfo {
    export type RequestParams = {};
    export type RequestQuery = {
      id: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = VideoInfoDto;
  }

  /**
   * @description Trả về tập hợp URL stream/video trực tiếp theo id. Endpoint này dùng cho lớp player.
   * @tags megaxh
   * @name VideoUrl
   * @summary Lấy URL phát video
   * @request GET:/api/megaxh/video_url
   */
  export namespace VideoUrl {
    export type RequestParams = {};
    export type RequestQuery = {
      id: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = UrlVideoDto;
  }
}
