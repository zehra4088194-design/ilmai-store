import { siteConfig } from "@/config/site";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character] ?? character);

/**
 * Shared chrome for every transactional email: dark-teal header bar with the
 * wordmark, a light card for the message body, and a footer with support
 * contact + site link. Inline styles only — no external CSS/JS, table-based
 * layout, max ~600px wide, so it renders correctly in Gmail/Outlook/mobile.
 */
function emailShell(bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F5F9;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="background:#0B1D3A;padding:22px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#ffffff;letter-spacing:0.2px;">
                      Ilm<span style="color:#2563EB;">AI</span> Store
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 8px 32px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 32px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e3ebe4;padding-top:20px;">
                  <tr>
                    <td style="font-size:12px;line-height:1.7;color:#64748B;font-family:Arial,Helvetica,sans-serif;">
                      Questions? Write to <a href="mailto:${siteConfig.supportEmail}" style="color:#2563EB;text-decoration:none;">${siteConfig.supportEmail}</a><br />
                      <a href="https://ilmai.study" style="color:#2563EB;text-decoration:none;">ilmai.study</a> &middot; Learn deeply. Build boldly.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.2;color:#0B1D3A;">${escapeHtml(text)}</h1>`;
}

function paragraph(html: string): string {
  return `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#64748B;font-family:Arial,Helvetica,sans-serif;">${html}</p>`;
}

function amountChip(label: string, amountDisplay: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px 0;"><tr><td style="background:#2563EB;border-radius:999px;padding:10px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#0B1D3A;">${escapeHtml(label)}: ${escapeHtml(amountDisplay)}</td></tr></table>`;
}

function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 20px 0;"><tr><td style="background:#0B1D3A;border-radius:999px;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:13px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a></td></tr></table>`;
}

export interface OrderConfirmationData { orderNumber: string; customerName?: string; totalDisplay: string; }
export function orderConfirmationTemplate(data: OrderConfirmationData) {
  const order = escapeHtml(data.orderNumber);
  const greeting = data.customerName ? `Thanks, ${escapeHtml(data.customerName)}!` : "Thanks for your order!";
  const html = emailShell(
    heading("Order received") +
      paragraph(`${greeting} Your order <strong style="color:#0B1D3A;">${order}</strong> has been received and is on its way to fulfillment.`) +
      amountChip("Order total", data.totalDisplay) +
      paragraph(`We'll send another email as soon as your payment is confirmed and your order is ready.`)
  );
  return { subject: `Your IlmAI Store order ${data.orderNumber} is confirmed`, html };
}

export interface PaymentConfirmationData { orderNumber: string; totalDisplay: string; }
export function paymentConfirmationTemplate(data: PaymentConfirmationData) {
  const order = escapeHtml(data.orderNumber);
  const html = emailShell(
    heading("Payment received") +
      paragraph(`We've received your payment for order <strong style="color:#0B1D3A;">${order}</strong>.`) +
      amountChip("Amount paid", data.totalDisplay) +
      paragraph(`Your digital downloads are now available from your order page — no further action needed.`)
  );
  return { subject: `Payment received for order ${data.orderNumber}`, html };
}

export interface DigitalDeliveryData { orderNumber: string; productTitle: string; downloadUrl: string; }
export function digitalDeliveryTemplate(data: DigitalDeliveryData) {
  const order = escapeHtml(data.orderNumber);
  const title = escapeHtml(data.productTitle);
  const html = emailShell(
    heading("Your download is ready") +
      paragraph(`<strong style="color:#0B1D3A;">${title}</strong> from order <strong style="color:#0B1D3A;">${order}</strong> is ready to download.`) +
      button(`Download ${data.productTitle}`, data.downloadUrl) +
      paragraph(`This link expires shortly for security. You can always get back to your files from your order page.`)
  );
  return { subject: `Your download is ready: ${data.productTitle}`, html };
}

export interface AdminNewOrderData { orderNumber: string; totalDisplay: string; customerEmail: string; }
export function adminNewOrderTemplate(data: AdminNewOrderData) {
  const order = escapeHtml(data.orderNumber);
  const email = escapeHtml(data.customerEmail);
  const html = emailShell(
    heading("New order placed") +
      paragraph(`Order <strong style="color:#0B1D3A;">${order}</strong> was just placed by <strong style="color:#0B1D3A;">${email}</strong>.`) +
      amountChip("Order total", data.totalDisplay) +
      paragraph(`Open the Store Admin orders queue to review payment and fulfillment.`)
  );
  return { subject: `New order ${data.orderNumber}`, html };
}

export interface RefundNotificationData { orderNumber: string; amountDisplay: string; }
export function refundNotificationTemplate(data: RefundNotificationData) {
  const order = escapeHtml(data.orderNumber);
  const html = emailShell(
    heading("Refund processed") +
      paragraph(`A refund has been processed for order <strong style="color:#0B1D3A;">${order}</strong>.`) +
      amountChip("Amount refunded", data.amountDisplay) +
      paragraph(`It may take a few business days to appear on your original payment method, depending on your bank or provider.`)
  );
  return { subject: `Refund processed for order ${data.orderNumber}`, html };
}
