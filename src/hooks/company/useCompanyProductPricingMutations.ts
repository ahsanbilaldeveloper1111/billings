"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { companyService } from "@/services/company.service";

export function useCompanyProductPricingMutations(
  companyPathId: string | null | undefined,
) {
  const qc = useQueryClient();
  const refreshCompanyPricing = async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.company.all });
    await qc.refetchQueries({
      queryKey: [...queryKeys.company.all, "productPricing"],
      type: "active",
    });
  };

  const updateProductPricing = useMutation({
    mutationFn: (body: unknown) =>
      companyService.createProductPricing(companyPathId as string, body),
    onSuccess: refreshCompanyPricing,
  });

  const bulkUpdateProductPricing = useMutation({
    mutationFn: (body: unknown) =>
      companyService.bulkUpdateProductPricing(companyPathId as string, body),
    onSuccess: refreshCompanyPricing,
  });

  const deleteProductPricing = useMutation({
    mutationFn: (productId: number | string) =>
      companyService.deleteProductPricing(companyPathId as string, productId),
    onSuccess: refreshCompanyPricing,
  });

  return {
    updateProductPricing,
    bulkUpdateProductPricing,
    deleteProductPricing,
  };
}
