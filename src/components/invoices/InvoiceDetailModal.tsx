"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { InvoiceDetailContent } from "@/components/invoices/InvoiceDetailContent";
import { useInvoiceDetails } from "@/hooks/invoices/useInvoiceDetails";
import { unwrapApiSuccessData } from "@/lib/dashboard/unwrapAnalyticsPayload";
import { queryKeys } from "@/lib/queryKeys";
import {
  showAppToast,
  showBillingBackendErrorToast,
} from "@/lib/toast/appToast";
import { getInvoiceDisplayNames } from "@/lib/invoices/invoiceDetailDisplay";
import {
  executePrint,
  generatePrintContent,
} from "@/lib/invoices/invoicePrintHtml";
import { invoiceService } from "@/services/invoices.service";
import type { Invoice } from "@/models/Invoice";
import { formControlClass } from "@/lib/uiFormClasses";

const btnSecondary =
  "rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800";
const btnPrimary =
  "rounded-xl border border-emerald-600 bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-600";
const btnInfo =
  "rounded-xl border border-sky-500 bg-sky-500 px-3 py-2 text-sm font-medium text-white hover:bg-sky-600";
const btnSuccess =
  "rounded-xl border border-emerald-500 bg-emerald-500 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600";
const btnOutline =
  "rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

export type InvoiceDetailModalProps = {
  open: boolean;
  onClose: () => void;
  invoiceId: number | string | null;
  /** Optional map of tenant id → display name (e.g. from company list for the selected vendor). */
  tenantDisplayNameById?: Record<string, string>;
  onEdit?: (invoice: Invoice) => void;
};

function SpinnerSm() {
  return (
    <span
      className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden
    />
  );
}

export function InvoiceDetailModal({
  open,
  onClose,
  invoiceId,
  tenantDisplayNameById = {},
  onEdit,
}: InvoiceDetailModalProps) {
  const queryClient = useQueryClient();
  const id = open && invoiceId != null ? invoiceId : null;
  const detailQuery = useInvoiceDetails(id);
  const invoice = useMemo(
    () => unwrapApiSuccessData<Invoice>(detailQuery.data),
    [detailQuery.data],
  );

  const { billToDisplayName, hasCustomer, sellerDisplayName } =
    getInvoiceDisplayNames(invoice ?? undefined, tenantDisplayNameById);
  const company = invoice?.company;

  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showSendEmailModal, setShowSendEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailBcc, setEmailBcc] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isGeneratingCheckout, setIsGeneratingCheckout] = useState(false);
  const [isGeneratingPaymentLink, setIsGeneratingPaymentLink] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const invalidateInvoiceQueries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
    if (invoiceId != null) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.details(invoiceId),
      });
    }
  }, [queryClient, invoiceId]);

  const onPaymentSuccess = useCallback(() => {
    invalidateInvoiceQueries();
    void detailQuery.refetch();
  }, [invalidateInvoiceQueries, detailQuery]);

  const checkoutExpiresAt = invoice?.stripe_checkout_expires_at
    ? new Date(invoice.stripe_checkout_expires_at)
    : null;
  const isCheckoutExpired =
    checkoutExpiresAt !== null && checkoutExpiresAt.getTime() <= now.getTime();
  const checkoutMinutesLeft = useMemo(() => {
    if (!checkoutExpiresAt || checkoutExpiresAt.getTime() <= now.getTime())
      return null;
    return Math.max(
      0,
      Math.ceil((checkoutExpiresAt.getTime() - now.getTime()) / 60_000),
    );
  }, [checkoutExpiresAt, now]);

  useEffect(() => {
    if (!checkoutExpiresAt || checkoutExpiresAt.getTime() <= Date.now()) return;
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, [invoice?.stripe_checkout_expires_at]);

  const hasValidStripeCheckout =
    Boolean(invoice?.stripe_checkout_url) && !isCheckoutExpired;

  const handleGenerateStripeCheckout = async () => {
    if (!invoice) return;
    if (invoice.status === "paid") {
      showAppToast("Checkout is not available for paid invoices.", "error");
      return;
    }
    setIsGeneratingCheckout(true);
    try {
      await invoiceService.stripeHostedCheckout(invoice.id);
      showAppToast(
        "Stripe Checkout link created — copy the URL or open in browser",
        "success",
      );
      invalidateInvoiceQueries();
      void detailQuery.refetch();
    } catch (err: unknown) {
      showBillingBackendErrorToast(err);
    } finally {
      setIsGeneratingCheckout(false);
    }
  };

  const handleCopyStripeCheckoutUrl = () => {
    const link = invoice?.stripe_checkout_url;
    if (!link) return;
    void navigator.clipboard
      .writeText(link)
      .then(() => showAppToast("Stripe Checkout link copied", "success"))
      .catch(() => showAppToast("Failed to copy", "error"));
  };

  const hasStripePaymentLink = Boolean(invoice?.stripe_payment_link_url);

  const handleGenerateStripePaymentLink = async () => {
    if (!invoice) return;
    if (invoice.status === "paid") {
      showAppToast("Payment links are not available for paid invoices.", "error");
      return;
    }
    setIsGeneratingPaymentLink(true);
    try {
      await invoiceService.stripePaymentLink(invoice.id);
      showAppToast(
        "Stripe Payment Link created — visible in Stripe Dashboard",
        "success",
      );
      invalidateInvoiceQueries();
      void detailQuery.refetch();
    } catch (err: unknown) {
      showBillingBackendErrorToast(err);
    } finally {
      setIsGeneratingPaymentLink(false);
    }
  };

  const handleCopyStripePaymentLinkUrl = () => {
    const link = invoice?.stripe_payment_link_url;
    if (!link) return;
    void navigator.clipboard
      .writeText(link)
      .then(() => showAppToast("Stripe Payment Link copied", "success"))
      .catch(() => showAppToast("Failed to copy", "error"));
  };

  const handleDownload = async () => {
    if (!invoice) return;
    setIsDownloading(true);
    try {
      const blob = await invoiceService.createPdf(invoice.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${invoice.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showAppToast("Invoice PDF downloaded successfully", "success");
    } catch (err: unknown) {
      console.error("Download error:", err);
      showAppToast("Failed to download invoice PDF", "error");
    } finally {
      setIsDownloading(false);
    }
  };

  const openSendEmailModal = () => {
    if (!invoice) return;
    setEmailTo(invoice.customer?.email ?? invoice.company?.email ?? "");
    setEmailCc("");
    setEmailBcc("");
    setEmailSubject(`Invoice #${invoice.invoice_number} - Payment Due`);
    setEmailBody(
      `Dear ${billToDisplayName === "N/A" ? "Customer" : billToDisplayName},\n\nThank you for your business! Please find your invoice #${invoice.invoice_number} attached.\n\nThe invoice PDF is attached to this email. Please ensure payment is made by the due date.\n\nIf you have any questions, please contact us.\n\nBest regards,\nAccounts Team`,
    );
    setShowSendEmailModal(true);
  };

  const handleSubmitSendEmail = async () => {
    if (!invoice) return;
    const to = emailTo.trim();
    if (!to) {
      showAppToast("To email address is required", "error");
      return;
    }
    const ccList = emailCc.trim()
      ? emailCc.split(/[\s,]+/).map((e) => e.trim()).filter(Boolean)
      : [];
    const bccList = emailBcc.trim()
      ? emailBcc.split(/[\s,]+/).map((e) => e.trim()).filter(Boolean)
      : [];
    setIsSendingEmail(true);
    try {
      await invoiceService.send(invoice.id, {
        to,
        cc: ccList.length ? ccList : undefined,
        bcc: bccList.length ? bccList : undefined,
        subject: emailSubject.trim() || undefined,
        body: emailBody.trim() || undefined,
      });
      showAppToast(`Invoice sent successfully to ${to}`, "success");
      setShowSendEmailModal(false);
      invalidateInvoiceQueries();
      void detailQuery.refetch();
    } catch (err: unknown) {
      showBillingBackendErrorToast(err);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handlePrint = useCallback(() => {
    if (!invoice) return;
    setIsPrinting(true);
    try {
      const printContent = generatePrintContent(
        invoice,
        sellerDisplayName,
        billToDisplayName,
      );
      executePrint(printContent);
    } catch (err: unknown) {
      console.error("Print error:", err);
      showAppToast("Failed to open print dialog", "error");
    } finally {
      setIsPrinting(false);
    }
  }, [invoice, billToDisplayName, sellerDisplayName]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "p" && open && invoice) {
        event.preventDefault();
        handlePrint();
      }
    };
    if (open) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, invoice, handlePrint]);

  if (!open) return null;

  const loading = detailQuery.isPending && id != null;
  const error =
    detailQuery.isError && id != null
      ? "Failed to load invoice details. Please try again."
      : null;

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-detail-title"
      >
        <button
          type="button"
          className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm dark:bg-black/60"
          aria-label="Close"
          onClick={onClose}
        />
        <div className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-200/70 bg-gradient-to-r from-emerald-50/90 to-teal-50/40 px-5 py-4 dark:border-zinc-800 dark:from-emerald-950/40 dark:to-zinc-950">
            <div className="flex items-start justify-between gap-3">
              <h2
                id="invoice-detail-title"
                className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
              >
                {loading
                  ? "Loading invoice…"
                  : `Invoice #${invoice?.invoice_number ?? ""}`}
              </h2>
              <button type="button" onClick={onClose} className={btnSecondary}>
                Close
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                <SpinnerSm />
                <p className="mt-3 text-sm">Loading invoice details…</p>
              </div>
            ) : error ? (
              <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
            ) : invoice ? (
              <>
                <InvoiceDetailContent
                  invoice={invoice}
                  company={company}
                  hasCustomer={hasCustomer}
                  billToDisplayName={billToDisplayName}
                  sellerDisplayName={sellerDisplayName}
                  onPaymentSuccess={onPaymentSuccess}
                />

                {invoice.status !== "cancelled" && invoice.status !== "paid" ? (
                  <div className="mt-6 space-y-4">
                    <div className="rounded-2xl border border-sky-200/80 bg-sky-50/50 p-4 dark:border-sky-900/50 dark:bg-sky-950/20">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-sky-900 dark:text-sky-200">
                        What each link does
                      </h4>
                      <p className="mt-2 text-sm text-sky-950/90 dark:text-sky-100/90">
                        <strong>Stripe Checkout link</strong> — A one-time URL (e.g.
                        checkout.stripe.com) that expires after about 24 hours. Use it when
                        you want to send a single pay link to the customer. After payment
                        they are redirected to your app success/cancel pages.
                      </p>
                      <p className="mt-2 text-sm text-sky-950/90 dark:text-sky-100/90">
                        <strong>Stripe Payment Link</strong> — A persistent link (e.g.
                        buy.stripe.com) that stays valid and appears in your{" "}
                        <strong>Stripe Dashboard → Payment links</strong>. Use it when you
                        want a reusable link for this invoice or to track it in Stripe.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-200/80 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Stripe Checkout link
                      </h4>
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        One-time hosted page. Copy or open in browser. Success →{" "}
                        <code className="rounded bg-zinc-100 px-1 font-mono text-[11px] dark:bg-zinc-800">
                          /public/payment/success
                        </code>
                        ; cancel →{" "}
                        <code className="rounded bg-zinc-100 px-1 font-mono text-[11px] dark:bg-zinc-800">
                          /public/payment/cancel
                        </code>
                        .
                      </p>
                      {hasValidStripeCheckout ? (
                        <>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={invoice.stripe_checkout_url ?? ""}
                              className="min-w-[200px] flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
                            />
                            <button
                              type="button"
                              className={btnOutline}
                              onClick={handleCopyStripeCheckoutUrl}
                            >
                              Copy
                            </button>
                            <button
                              type="button"
                              className={btnPrimary}
                              onClick={() =>
                                invoice.stripe_checkout_url &&
                                window.open(
                                  invoice.stripe_checkout_url,
                                  "_blank",
                                  "noopener,noreferrer",
                                )
                              }
                            >
                              Open Stripe
                            </button>
                            <button
                              type="button"
                              className={btnOutline}
                              onClick={() => void handleGenerateStripeCheckout()}
                              disabled={isGeneratingCheckout}
                              title="Create a new Checkout session (invalidates the previous link)"
                            >
                              {isGeneratingCheckout ? (
                                <>
                                  <SpinnerSm /> Generating…
                                </>
                              ) : (
                                "New link"
                              )}
                            </button>
                          </div>
                          {checkoutMinutesLeft !== null ? (
                            <p className="mt-2 text-xs text-zinc-500">
                              Checkout session expires in about{" "}
                              <strong>{Math.floor(checkoutMinutesLeft / 60)}</strong>h{" "}
                              <strong>{checkoutMinutesLeft % 60}</strong>m (Stripe limit).
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                            {isCheckoutExpired
                              ? "The previous Checkout link expired. Generate a new one."
                              : "No Stripe Checkout link yet."}
                          </p>
                          <button
                            type="button"
                            className={`mt-2 ${btnPrimary}`}
                            onClick={() => void handleGenerateStripeCheckout()}
                            disabled={isGeneratingCheckout}
                          >
                            {isGeneratingCheckout ? (
                              <>
                                <SpinnerSm /> Creating…
                              </>
                            ) : isCheckoutExpired ? (
                              "Generate new Checkout link"
                            ) : (
                              "Generate Stripe Checkout link"
                            )}
                          </button>
                        </>
                      )}
                    </div>

                    <div className="rounded-2xl border border-zinc-200/80 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Stripe Payment Link
                      </h4>
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        Persistent link visible in{" "}
                        <strong>Stripe Dashboard → Payment links</strong>. Same
                        success/cancel redirects as Checkout.
                      </p>
                      {hasStripePaymentLink ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={invoice.stripe_payment_link_url ?? ""}
                            className="min-w-[200px] flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
                          />
                          <button
                            type="button"
                            className={btnOutline}
                            onClick={handleCopyStripePaymentLinkUrl}
                          >
                            Copy
                          </button>
                          <button
                            type="button"
                            className={btnPrimary}
                            onClick={() =>
                              invoice.stripe_payment_link_url &&
                              window.open(
                                invoice.stripe_payment_link_url,
                                "_blank",
                                "noopener,noreferrer",
                              )
                            }
                          >
                            Open link
                          </button>
                          <button
                            type="button"
                            className={btnOutline}
                            onClick={() => void handleGenerateStripePaymentLink()}
                            disabled={isGeneratingPaymentLink}
                            title="Create a new Payment Link (previous link remains valid in Stripe)"
                          >
                            {isGeneratingPaymentLink ? (
                              <>
                                <SpinnerSm /> Creating…
                              </>
                            ) : (
                              "New link"
                            )}
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                            No Payment Link yet. Create one to get a persistent URL and see
                            it in Stripe Dashboard.
                          </p>
                          <button
                            type="button"
                            className={`mt-2 ${btnPrimary}`}
                            onClick={() => void handleGenerateStripePaymentLink()}
                            disabled={isGeneratingPaymentLink}
                          >
                            {isGeneratingPaymentLink ? (
                              <>
                                <SpinnerSm /> Creating…
                              </>
                            ) : (
                              "Create Stripe Payment Link"
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-zinc-500">No data.</p>
            )}
          </div>

          {invoice ? (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-200/70 bg-zinc-50/80 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
              <button type="button" onClick={onClose} className={btnSecondary}>
                Close
              </button>
              {onEdit ? (
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={() => onEdit(invoice)}
                >
                  Edit
                </button>
              ) : null}
              <button
                type="button"
                className={btnInfo}
                onClick={() => void handlePrint()}
                disabled={isPrinting}
                title="Print invoice (Ctrl+P or Cmd+P)"
              >
                {isPrinting ? (
                  <>
                    <SpinnerSm /> Printing…
                  </>
                ) : (
                  "Print"
                )}
              </button>
              <button
                type="button"
                className={btnSuccess}
                onClick={() => void handleDownload()}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <>
                    <SpinnerSm /> Downloading…
                  </>
                ) : (
                  "Download PDF"
                )}
              </button>
              <button
                type="button"
                className={btnPrimary}
                onClick={openSendEmailModal}
                disabled={isSendingEmail}
                title="Send invoice PDF by email"
              >
                {isSendingEmail ? (
                  <>
                    <SpinnerSm /> Sending…
                  </>
                ) : (
                  "Send email"
                )}
              </button>
              {hasValidStripeCheckout && invoice.status !== "paid" ? (
                <button
                  type="button"
                  className={btnOutline}
                  onClick={handleCopyStripeCheckoutUrl}
                >
                  Copy Stripe link
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {showSendEmailModal ? (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invoice-email-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            aria-label="Close"
            onClick={() => !isSendingEmail && setShowSendEmailModal(false)}
          />
          <div className="relative z-10 flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="border-b border-zinc-200/70 px-5 py-4 dark:border-zinc-800">
              <h3
                id="invoice-email-title"
                className="text-lg font-bold text-zinc-900 dark:text-zinc-50"
              >
                Send invoice by email
              </h3>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  To <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  className={formControlClass}
                  placeholder="recipient@example.com"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  CC
                </label>
                <input
                  type="text"
                  className={formControlClass}
                  placeholder="cc1@example.com, cc2@example.com"
                  value={emailCc}
                  onChange={(e) => setEmailCc(e.target.value)}
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Comma- or space-separated email addresses
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  BCC
                </label>
                <input
                  type="text"
                  className={formControlClass}
                  placeholder="bcc@example.com"
                  value={emailBcc}
                  onChange={(e) => setEmailBcc(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Subject
                </label>
                <input
                  type="text"
                  className={formControlClass}
                  placeholder="Invoice #XXX - Payment Due"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Email body
                </label>
                <textarea
                  rows={8}
                  className={`${formControlClass} min-h-[160px]`}
                  placeholder="Optional message. PDF is always attached."
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Optional. If provided, this replaces the default template body.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-200/70 px-5 py-3 dark:border-zinc-800">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => setShowSendEmailModal(false)}
                disabled={isSendingEmail}
              >
                Cancel
              </button>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => void handleSubmitSendEmail()}
                disabled={isSendingEmail}
              >
                {isSendingEmail ? (
                  <>
                    <SpinnerSm /> Sending…
                  </>
                ) : (
                  "Send"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
