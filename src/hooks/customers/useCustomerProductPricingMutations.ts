"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { customerService } from "@/services/customers.service";

export function useCustomerProductPricingMutations(
  customerPathId: string | null | undefined,
) {
  const qc = useQueryClient();
  const refreshCustomerPricing = async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.customers.all });
    await qc.refetchQueries({
      queryKey: [...queryKeys.customers.all, "productPricing"],
      type: "active",
    });
  };

  const updateProductPricing = useMutation({
    mutationFn: (body: unknown) =>
      customerService.createProductPricing(customerPathId as string, body),
    onSuccess: refreshCustomerPricing,
  });

  const bulkUpdateProductPricing = useMutation({
    mutationFn: (body: unknown) =>
      customerService.bulkUpdateProductPricing(customerPathId as string, body),
    onSuccess: refreshCustomerPricing,
  });

  const deleteProductPricing = useMutation({
    mutationFn: (productId: number | string) =>
      customerService.deleteProductPricing(customerPathId as string, productId),
    onSuccess: refreshCustomerPricing,
  });

  return {
    updateProductPricing,
    bulkUpdateProductPricing,
    deleteProductPricing,
  };
}
