import "server-only";
import { Resend } from "resend";
import { logger } from "@/lib/logger";
import {
  orderConfirmationTemplate,
  paymentConfirmationTemplate,
  digitalDeliveryTemplate,
  adminNewOrderTemplate,
  refundNotificationTemplate,
  type OrderConfirmationData,
  type PaymentConfirmationData,
  type DigitalDeliveryData,
  type AdminNewOrderData,
  type RefundNotificationData,
} from "./email/templates";

/**
 * Single call site for all transactional email. Never import Resend's SDK
 * or reference RESEND_API_KEY outside this file. Only other services
 * (OrderService, PaymentService, PromotionService) should import this —
 * never a page or component directly.
 */
class EmailServiceImpl {
  private client: Resend | null = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  private from = process.env.RESEND_FROM_EMAIL ?? "store@ilmai.study";

  private async send(to: string, subject: string, html: string) {
    const recipientDomain = to.includes("@") ? to.split("@").pop() : "unknown";
    if (!this.client) {
      logger.warn("email.send_skipped_no_api_key", { recipientDomain, subject });
      return;
    }
    try {
      await this.client.emails.send({ from: this.from, to, subject, html });
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
}

export const EmailService = new EmailServiceImpl();
