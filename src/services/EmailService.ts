import "server-only";
import { logger } from "@/lib/logger";
import {
  orderConfirmationTemplate,
  paymentConfirmationTemplate,
  digitalDeliveryTemplate,
  adminNewOrderTemplate,
  refundNotificationTemplate,
  referralRewardTemplate,
  shipmentUpdateTemplate,
  backInStockTemplate,
  abandonedCartTemplate,
  type OrderConfirmationData,
  type PaymentConfirmationData,
  type DigitalDeliveryData,
  type AdminNewOrderData,
  type RefundNotificationData,
  type ReferralRewardData,
  type ShipmentUpdateData,
  type BackInStockData,
  type AbandonedCartData,
} from "./email/templates";

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Single call site for all transactional email. Never call Brevo's API
 * or reference BREVO_API_KEY outside this file. Only other services
 * (OrderService, PaymentService, PromotionService) should import this —
 * never a page or component directly.
 */
class EmailServiceImpl {
  private apiKey = process.env.BREVO_API_KEY ?? null;
  private fromEmail = process.env.BREVO_FROM_EMAIL ?? "store@ilmai.store";
  private fromName = process.env.BREVO_FROM_NAME ?? "IlmAI Store";

  private async send(to: string, subject: string, html: string) {
    const recipientDomain = to.includes("@") ? to.split("@").pop() : "unknown";
    if (!this.apiKey) {
      logger.warn("email.send_skipped_no_api_key", { recipientDomain, subject });
      return;
    }
    try {
      const res = await fetch(BREVO_SEND_URL, {
        method: "POST",
        headers: {
          "api-key": this.apiKey,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender: { email: this.fromEmail, name: this.fromName },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });
      if (!res.ok) {
        throw new Error(`Brevo API error ${res.status}: ${await res.text()}`);
      }
      logger.event("email.sent", { recipientDomain, subject });
    } catch (err) {
      // Email failures should not crash the calling flow (e.g. an order
      // should still succeed even if the confirmation email fails) — log
      // and swallow, but surface via logger for monitoring.
      logger.error("email.send_failed", { recipientDomain, subject, error: String(err) });
    }
  }

  async sendOrderConfirmation(to: string, data: OrderConfirmationData) {
    const { subject, html } = orderConfirmationTemplate(data);
    await this.send(to, subject, html);
  }

  async sendPaymentConfirmation(to: string, data: PaymentConfirmationData) {
    const { subject, html } = paymentConfirmationTemplate(data);
    await this.send(to, subject, html);
  }

  async sendDigitalDelivery(to: string, data: DigitalDeliveryData) {
    const { subject, html } = digitalDeliveryTemplate(data);
    await this.send(to, subject, html);
  }

  async sendAdminNewOrderNotification(data: AdminNewOrderData) {
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (!adminEmail) {
      logger.warn("email.admin_notification_skipped_no_recipient");
      return;
    }
    const { subject, html } = adminNewOrderTemplate(data);
    await this.send(adminEmail, subject, html);
  }

  async sendRefundNotification(to: string, data: RefundNotificationData) {
    const { subject, html } = refundNotificationTemplate(data);
    await this.send(to, subject, html);
  }

  async sendReferralReward(to: string, data: ReferralRewardData) {
    const { subject, html } = referralRewardTemplate(data);
    await this.send(to, subject, html);
  }

  async sendShipmentUpdate(to: string, data: ShipmentUpdateData) {
    const { subject, html } = shipmentUpdateTemplate(data);
    await this.send(to, subject, html);
  }

  async sendBackInStock(to: string, data: BackInStockData) {
    const { subject, html } = backInStockTemplate(data);
    await this.send(to, subject, html);
  }

  async sendAbandonedCart(to: string, data: AbandonedCartData) {
    const { subject, html } = abandonedCartTemplate(data);
    await this.send(to, subject, html);
  }
}

export const EmailService = new EmailServiceImpl();
