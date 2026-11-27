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
  Proxy1Params,
  Proxy1Payload,
  Proxy2Params,
  Proxy2Payload,
  Proxy3Params,
  Proxy3Payload,
  Proxy4Params,
  Proxy4Payload,
  Proxy5Params,
  Proxy5Payload,
  Proxy6Params,
  Proxy6Payload,
  ProxyParams,
  ProxyPayload,
  RepositoryEntity,
} from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Test<SecurityDataType = unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  /**
   * @description Endpoint test truy vấn dữ liệu từ bảng github_upload.organizations
   *
   * @tags test
   * @name GetOrganizations
   * @summary Lấy danh sách organizations (Test Postgres)
   * @request GET:/test/organizations
   */
  getOrganizations = (params: RequestParams = {}) =>
    this.http.request<OrganizationEntity[], any>({
      path: `/test/organizations`,
      method: "GET",
      ...params,
    });
  /**
   * @description Endpoint test truy vấn dữ liệu từ bảng github_upload.repositories
   *
   * @tags test
   * @name GetRepositories1
   * @summary Lấy danh sách repositories (Test Postgres)
   * @request GET:/test/repositories
   */
  getRepositories1 = (params: RequestParams = {}) =>
    this.http.request<RepositoryEntity[], any>({
      path: `/test/repositories`,
      method: "GET",
      ...params,
    });
  /**
   * @description Forward request tới URL được chỉ định với method/body/header đầu vào. Chỉ dùng cho mục đích test/debug.
   *
   * @tags test
   * @name Proxy
   * @summary Proxy URL tùy ý (nội bộ)
   * @request GET:/test/url-proxy
   */
  proxy = (
    query: ProxyParams = {},
    data: ProxyPayload,
    params: RequestParams = {},
  ) =>
    this.http.request<Blob, any>({
      path: `/test/url-proxy`,
      method: "GET",
      query: query,
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * @description Forward request tới URL được chỉ định với method/body/header đầu vào. Chỉ dùng cho mục đích test/debug.
   *
   * @tags test
   * @name Proxy1
   * @summary Proxy URL tùy ý (nội bộ)
   * @request POST:/test/url-proxy
   */
  proxy1 = (
    query: Proxy1Params = {},
    data: Proxy1Payload,
    params: RequestParams = {},
  ) =>
    this.http.request<Blob, any>({
      path: `/test/url-proxy`,
      method: "POST",
      query: query,
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * @description Forward request tới URL được chỉ định với method/body/header đầu vào. Chỉ dùng cho mục đích test/debug.
   *
   * @tags test
   * @name Proxy2
   * @summary Proxy URL tùy ý (nội bộ)
   * @request PUT:/test/url-proxy
   */
  proxy2 = (
    query: Proxy2Params = {},
    data: Proxy2Payload,
    params: RequestParams = {},
  ) =>
    this.http.request<Blob, any>({
      path: `/test/url-proxy`,
      method: "PUT",
      query: query,
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * @description Forward request tới URL được chỉ định với method/body/header đầu vào. Chỉ dùng cho mục đích test/debug.
   *
   * @tags test
   * @name Proxy3
   * @summary Proxy URL tùy ý (nội bộ)
   * @request DELETE:/test/url-proxy
   */
  proxy3 = (
    query: Proxy3Params = {},
    data: Proxy3Payload,
    params: RequestParams = {},
  ) =>
    this.http.request<Blob, any>({
      path: `/test/url-proxy`,
      method: "DELETE",
      query: query,
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * @description Forward request tới URL được chỉ định với method/body/header đầu vào. Chỉ dùng cho mục đích test/debug.
   *
   * @tags test
   * @name Proxy4
   * @summary Proxy URL tùy ý (nội bộ)
   * @request PATCH:/test/url-proxy
   */
  proxy4 = (
    query: Proxy4Params = {},
    data: Proxy4Payload,
    params: RequestParams = {},
  ) =>
    this.http.request<Blob, any>({
      path: `/test/url-proxy`,
      method: "PATCH",
      query: query,
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * @description Forward request tới URL được chỉ định với method/body/header đầu vào. Chỉ dùng cho mục đích test/debug.
   *
   * @tags test
   * @name Proxy5
   * @summary Proxy URL tùy ý (nội bộ)
   * @request HEAD:/test/url-proxy
   */
  proxy5 = (
    query: Proxy5Params = {},
    data: Proxy5Payload,
    params: RequestParams = {},
  ) =>
    this.http.request<Blob, any>({
      path: `/test/url-proxy`,
      method: "HEAD",
      query: query,
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * @description Forward request tới URL được chỉ định với method/body/header đầu vào. Chỉ dùng cho mục đích test/debug.
   *
   * @tags test
   * @name Proxy6
   * @summary Proxy URL tùy ý (nội bộ)
   * @request OPTIONS:/test/url-proxy
   */
  proxy6 = (
    query: Proxy6Params = {},
    data: Proxy6Payload,
    params: RequestParams = {},
  ) =>
    this.http.request<Blob, any>({
      path: `/test/url-proxy`,
      method: "OPTIONS",
      query: query,
      body: data,
      type: ContentType.Json,
      ...params,
    });
}
