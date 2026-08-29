const escapeHtml = (value: string) => value.replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character] ?? character);

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f3f6f1;color:#103d42;font-family:Arial,sans-serif"><div style="max-width:620px;margin:32px auto;padding:32px;background:#fff;border:1px solid #dbe7df;border-radius:24px"><div style="font-size:18px;font-weight:700">IlmAI <span style="color:#14777a">Store</span></div><h1 style="font-size:28px;line-height:1.15;margin:28px 0 16px">${escapeHtml(title)}</h1><div style="font-size:15px;line-height:1.7;color:#486267">${body}</div><p style="margin-top:32px;font-size:12px;color:#789094">Learn deeply. Build boldly.</p></div></body></html>`;
}

export interface OrderConfirmationData { orderNumber: string; customerName?: string; totalDisplay: string; }
export function orderConfirmationTemplate(data: OrderConfirmationData) {
  const order = escapeHtml(data.orderNumber); const total = escapeHtml(data.totalDisplay); const name = data.customerName ? ` ${escapeHtml(data.customerName)}` : "";
  return { subject: `Your IlmAI Store order ${data.orderNumber} is confirmed`, html: layout("Order received", `<p>Thanks${name}! Your order <strong>${order}</strong> for <strong>${total}</strong> has been received.</p><p>We will email you again when payment and fulfillment are complete.</p>`) };
}

export interface PaymentConfirmationData { orderNumber: string; totalDisplay: string; }
export function paymentConfirmationTemplate(data: PaymentConfirmationData) {
  return { subject: `Payment received for order ${data.orderNumber}`, html: layout("Payment received", `<p>We've received your payment of <strong>${escapeHtml(data.totalDisplay)}</strong> for order <strong>${escapeHtml(data.orderNumber)}</strong>.</p><p>Your digital downloads are now available from your order page.</p>`) };
}

export interface DigitalDeliveryData { orderNumber: string; productTitle: string; downloadUrl: string; }
export function digitalDeliveryTemplate(data: DigitalDeliveryData) {
  return { subject: `Your download is ready: ${data.productTitle}`, html: layout("Your download is ready", `<p>Your purchase from order <strong>${escapeHtml(data.orderNumber)}</strong> is ready.</p><p><a href="${escapeHtml(data.downloadUrl)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#103d42;color:#fff;text-decoration:none">Download ${escapeHtml(data.productTitle)}</a></p><p>This link expires shortly. You can access the order page again whenever you need it.</p>`) };
}

export interface AdminNewOrderData { orderNumber: string; totalDisplay: string; customerEmail: string; }
export function adminNewOrderTemplate(data: AdminNewOrderData) {
  return { subject: `New order ${data.orderNumber}`, html: layout("New order", `<p><strong>${escapeHtml(data.orderNumber)}</strong> from ${escapeHtml(data.customerEmail)} — <strong>${escapeHtml(data.totalDisplay)}</strong>.</p><p>Open the Store Admin orders queue to review payment and fulfillment.</p>`) };
}

export interface RefundNotificationData { orderNumber: string; amountDisplay: string; }
export function refundNotificationTemplate(data: RefundNotificationData) {
  return { subject: `Refund processed for order ${data.orderNumber}`, html: layout("Refund processed", `<p>A refund of <strong>${escapeHtml(data.amountDisplay)}</strong> has been processed for order <strong>${escapeHtml(data.orderNumber)}</strong>.</p>`) };
}
