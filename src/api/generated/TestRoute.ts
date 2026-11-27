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
  OrganizationEntity,
  Proxy1Payload,
  Proxy2Payload,
  Proxy3Payload,
  Proxy4Payload,
  Proxy5Payload,
  Proxy6Payload,
  ProxyPayload,
  RepositoryEntity,
} from "./data-contracts";

export namespace Test {
  /**
   * @description Endpoint test truy vấn dữ liệu từ bảng github_upload.organizations
   * @tags test
   * @name GetOrganizations
   * @summary Lấy danh sách organizations (Test Postgres)
   * @request GET:/test/organizations
   */
  export namespace GetOrganizations {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = OrganizationEntity[];
  }

  /**
   * @description Endpoint test truy vấn dữ liệu từ bảng github_upload.repositories
   * @tags test
   * @name GetRepositories1
   * @summary Lấy danh sách repositories (Test Postgres)
   * @request GET:/test/repositories
   */
  export namespace GetRepositories1 {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = RepositoryEntity[];
  }

  /**
   * @description Forward request tới URL được chỉ định với method/body/header đầu vào. Chỉ dùng cho mục đích test/debug.
   * @tags test
   * @name Proxy
   * @summary Proxy URL tùy ý (nội bộ)
   * @request GET:/test/url-proxy
   */
  export namespace Proxy {
    export type RequestParams = {};
    export type RequestQuery = {
      /** @default "https://example.com" */
      url?: string;
    };
    export type RequestBody = ProxyPayload;
    export type RequestHeaders = {};
    export type ResponseBody = Blob;
  }

  /**
   * @description Forward request tới URL được chỉ định với method/body/header đầu vào. Chỉ dùng cho mục đích test/debug.
   * @tags test
   * @name Proxy1
   * @summary Proxy URL tùy ý (nội bộ)
   * @request POST:/test/url-proxy
   */
  export namespace Proxy1 {
    export type RequestParams = {};
    export type RequestQuery = {
      /** @default "https://example.com" */
      url?: string;
    };
    export type RequestBody = Proxy1Payload;
    export type RequestHeaders = {};
    export type ResponseBody = Blob;
  }

  /**
   * @description Forward request tới URL được chỉ định với method/body/header đầu vào. Chỉ dùng cho mục đích test/debug.
   * @tags test
   * @name Proxy2
   * @summary Proxy URL tùy ý (nội bộ)
   * @request PUT:/test/url-proxy
   */
  export namespace Proxy2 {
    export type RequestParams = {};
    export type RequestQuery = {
      /** @default "https://example.com" */
      url?: string;
    };
    export type RequestBody = Proxy2Payload;
    export type RequestHeaders = {};
    export type ResponseBody = Blob;
  }

  /**
   * @description Forward request tới URL được chỉ định với method/body/header đầu vào. Chỉ dùng cho mục đích test/debug.
   * @tags test
   * @name Proxy3
   * @summary Proxy URL tùy ý (nội bộ)
   * @request DELETE:/test/url-proxy
   */
  export namespace Proxy3 {
    export type RequestParams = {};
    export type RequestQuery = {
      /** @default "https://example.com" */
      url?: string;
    };
    export type RequestBody = Proxy3Payload;
    export type RequestHeaders = {};
    export type ResponseBody = Blob;
  }

  /**
   * @description Forward request tới URL được chỉ định với method/body/header đầu vào. Chỉ dùng cho mục đích test/debug.
   * @tags test
   * @name Proxy4
   * @summary Proxy URL tùy ý (nội bộ)
   * @request PATCH:/test/url-proxy
   */
  export namespace Proxy4 {
    export type RequestParams = {};
    export type RequestQuery = {
      /** @default "https://example.com" */
      url?: string;
    };
    export type RequestBody = Proxy4Payload;
    export type RequestHeaders = {};
    export type ResponseBody = Blob;
  }

  /**
   * @description Forward request tới URL được chỉ định với method/body/header đầu vào. Chỉ dùng cho mục đích test/debug.
   * @tags test
   * @name Proxy5
   * @summary Proxy URL tùy ý (nội bộ)
   * @request HEAD:/test/url-proxy
   */
  export namespace Proxy5 {
    export type RequestParams = {};
    export type RequestQuery = {
      /** @default "https://example.com" */
      url?: string;
    };
    export type RequestBody = Proxy5Payload;
    export type RequestHeaders = {};
    export type ResponseBody = Blob;
  }

  /**
   * @description Forward request tới URL được chỉ định với method/body/header đầu vào. Chỉ dùng cho mục đích test/debug.
   * @tags test
   * @name Proxy6
   * @summary Proxy URL tùy ý (nội bộ)
   * @request OPTIONS:/test/url-proxy
   */
  export namespace Proxy6 {
    export type RequestParams = {};
    export type RequestQuery = {
      /** @default "https://example.com" */
      url?: string;
    };
    export type RequestBody = Proxy6Payload;
    export type RequestHeaders = {};
    export type ResponseBody = Blob;
  }
}
