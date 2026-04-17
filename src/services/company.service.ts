import type { ApiSuccessResponse } from "@/lib/api/types";
import type { Company, IndexCompanyParams } from "@/models/Company";
import {
  apiDelete,
  apiGet,
  apiGetBlob,
  apiPost,
  apiPostForm,
  apiPut,
  type QueryParams,
} from "@/lib/api/http";
import { apiRoutes } from "@/lib/routes/apiRoutes";

const r = apiRoutes.company;

export const companyService = {
  list: (params?: IndexCompanyParams) =>
    apiGet<ApiSuccessResponse<Company[]>>(
      r.index(),
      params as QueryParams | undefined,
    ),

  show: (id: number | string, params?: QueryParams) =>
    apiGet<ApiSuccessResponse<Company>>(r.show(id), params),

  importCompanies: (body: FormData) =>
    apiPostForm<ApiSuccessResponse<unknown>>(r.import(), body),

  exportCompanies: (body?: unknown) =>
    apiPost<ApiSuccessResponse<unknown>>(r.export(), body),

  generateTemplate: (params?: QueryParams) =>
    apiGet<ApiSuccessResponse<unknown>>(r.generateTemplate(), params),

  downloadTemplate: (params?: QueryParams) =>
    apiGetBlob(r.downloadTemplate(), params),

  createUpdateProfile: (body: unknown) =>
    apiPost<ApiSuccessResponse<unknown>>(r.createUpdateProfile(), body),

  createUpdate: (body: unknown) =>
    body instanceof FormData
      ? apiPostForm<ApiSuccessResponse<unknown>>(r.createUpdate(), body)
      : apiPost<ApiSuccessResponse<unknown>>(r.createUpdate(), body),

  deleteCompany: (id: number | string) =>
    apiDelete<ApiSuccessResponse<unknown>>(r.delete(id)),

  discountApplicability: (id: number | string, params?: QueryParams) =>
    apiGet<ApiSuccessResponse<unknown>>(r.discountApplicability(id), params),

  createDiscountApplicability: (id: number | string, body: unknown) =>
    apiPost<ApiSuccessResponse<unknown>>(r.discountApplicability(id), body),

  updateDiscountApplicability: (
    id: number | string,
    applicabilityId: number | string,
    body: unknown,
  ) =>
    apiPut<ApiSuccessResponse<unknown>>(
      r.updateDiscountApplicability(id, applicabilityId),
      body,
    ),

  deleteDiscountApplicability: (
    id: number | string,
    applicabilityId: number | string,
  ) =>
    apiDelete<ApiSuccessResponse<unknown>>(
      r.updateDiscountApplicability(id, applicabilityId),
    ),

  productPricingList: (id: number | string, params?: QueryParams) =>
    apiGet<ApiSuccessResponse<unknown>>(r.productPricingList(id), params),

  productPricingListGlobal: (params?: QueryParams) =>
    apiGet<ApiSuccessResponse<unknown>>(
      r.productPricingListGlobal(),
      params,
    ),

  discountApplicabilityList: (id: number | string, params?: QueryParams) =>
    apiGet<ApiSuccessResponse<unknown>>(
      r.discountApplicabilityList(id),
      params,
    ),

  productPricing: (id: number | string, params?: QueryParams) =>
    apiGet<ApiSuccessResponse<unknown>>(r.productPricing(id), params),

  createProductPricing: (id: number | string, body: unknown) =>
    apiPost<ApiSuccessResponse<unknown>>(r.productPricing(id), body),

  bulkUpdateProductPricing: (id: number | string, body: unknown) =>
    apiPost<ApiSuccessResponse<unknown>>(r.bulkUpdateProductPricing(id), body),

  deleteProductPricing: (id: number | string, productId: number | string) =>
    apiDelete<ApiSuccessResponse<unknown>>(
      r.deleteProductPricing(id, productId),
    ),

  listDocuments: (tenantId: number | string, params?: QueryParams) =>
    apiGet<ApiSuccessResponse<unknown>>(r.documents(tenantId), params),

  uploadDocument: (tenantId: number | string, body: FormData) =>
    apiPostForm<ApiSuccessResponse<unknown>>(r.uploadDocument(tenantId), body),

  deleteDocument: (tenantId: number | string, documentId: number | string) =>
    apiDelete<ApiSuccessResponse<unknown>>(
      r.deleteDocument(tenantId, documentId),
    ),

  downloadDocument: (
    tenantId: number | string,
    documentId: number | string,
    params?: QueryParams,
  ) => apiGetBlob(r.downloadDocument(tenantId, documentId), params),
};

export const fetchCompanies = companyService.list;
