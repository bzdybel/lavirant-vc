import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import path from 'path';
import type { Order } from "@shared/types/order";
import type { Product } from "@shared/types/product";
import { LogPrefix } from "../constants/logPrefixes";
import * as EmailTemplates from "../utils/emailTemplates";
import { logger } from "../utils/logger";

export interface OrderConfirmationData {
  orderId: number;
  firstName: string;
  lastName: string;
  email: string;
  productName: string;
  quantity: number;
  total: number;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  orderDate: string;
}

export interface PaidInvoiceEmailParams {
  order: Order;
  product?: Product;
  invoiceNumber: string;
  invoicePdfPath: string;
}

export interface ShipmentEmailParams {
  order: Order;
  trackingNumber: string;
  trackingUrl: string;
}

export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
  secure: boolean;
}

export interface IEmailService {
  sendOrderConfirmation(data: OrderConfirmationData): Promise<boolean>;
  sendPaidInvoiceEmail(params: PaidInvoiceEmailParams): Promise<boolean>;
  sendShipmentEmail(params: ShipmentEmailParams): Promise<boolean>;
}

export class EmailServiceReal implements IEmailService {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: EmailConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });
    this.from = `Lavirant <${config.from || config.user}>`;
    logger.info({ message: "Email service initialized successfully" });
  }

  async sendOrderConfirmation(data: OrderConfirmationData): Promise<boolean> {
    try {
      const { html, text } = EmailTemplates.generateOrderConfirmationEmail(data);

      const info = await this.transporter.sendMail({
        from: this.from,
        to: data.email,
        subject: `Potwierdzenie zamówienia - Zamówienie #${data.orderId}`,
        text,
        html,
      });

      logger.info({ message: "Order confirmation email sent", to: data.email, messageId: info.messageId, orderId: data.orderId });
      return true;
    } catch (error) {
      logger.error({ message: "Failed to send order confirmation email", to: data.email, error });
      return false;
    }
  }

  async sendPaidInvoiceEmail(params: PaidInvoiceEmailParams): Promise<boolean> {
    const { order, product, invoiceNumber, invoicePdfPath } = params;
    const attachmentPath = path.isAbsolute(invoicePdfPath)
      ? invoicePdfPath
      : path.join(process.cwd(), invoicePdfPath);
    const { html, text } = EmailTemplates.generateInvoiceEmail(order, product, invoiceNumber);

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to: order.email,
        subject: "Faktura za zakup gry – Lavirant",
        text,
        html,
        attachments: [{ filename: path.basename(attachmentPath), path: attachmentPath }],
      });

      logger.info({ message: "Invoice email sent", to: order.email, messageId: info.messageId, orderId: order.id, invoiceNumber });
      return true;
    } catch (error) {
      logger.error({ message: "Failed to send invoice email", to: order.email, orderId: order.id, error });
      return false;
    }
  }

  async sendShipmentEmail(params: ShipmentEmailParams): Promise<boolean> {
    const { order, trackingNumber, trackingUrl } = params;

    try {
      const { html, text } = EmailTemplates.generateShipmentEmail(order, trackingNumber, trackingUrl);

      const info = await this.transporter.sendMail({
        from: this.from,
        to: order.email,
        subject: "Twoje zamówienie zostało wysłane – Lavirant",
        text,
        html,
      });

      logger.info({ message: "Shipment email sent", to: order.email, messageId: info.messageId, orderId: order.id });
      return true;
    } catch (error) {
      logger.error({ message: "Failed to send shipment email", to: order.email, orderId: order.id, error });
      return false;
    }
  }
}

export class EmailServiceNoop implements IEmailService {
  async sendOrderConfirmation(data: OrderConfirmationData): Promise<boolean> {
    logger.info({ message: `${LogPrefix.EMAIL} [Noop] Order confirmation`, to: data.email, orderId: data.orderId });
    return true;
  }

  async sendPaidInvoiceEmail(params: PaidInvoiceEmailParams): Promise<boolean> {
    logger.info({ message: `${LogPrefix.EMAIL} [Noop] Invoice email`, to: params.order.email, orderId: params.order.id, invoiceNumber: params.invoiceNumber });
    return true;
  }

  async sendShipmentEmail(params: ShipmentEmailParams): Promise<boolean> {
    logger.info({ message: `${LogPrefix.EMAIL} [Noop] Shipment email`, to: params.order.email, trackingNumber: params.trackingNumber });
    return true;
  }
}

// Backward-compatible alias
export { EmailServiceReal as EmailService };
