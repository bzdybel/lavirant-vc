import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import path from 'path';
import type { Order } from "@shared/types/order";
import type { Product } from "@shared/types/product";
import { LogPrefix } from "../constants/logPrefixes";
import * as EmailTemplates from "../utils/emailTemplates";

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
    console.log('✅ Email service initialized successfully');
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

      console.log(`✅ Email potwierdzający zamówienie wysłany do ${data.email} (ID: ${info.messageId})`);
      return true;
    } catch (error) {
      console.error('❌ Błąd podczas wysyłania emaila z potwierdzeniem zamówienia:', error);
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

      console.log(`✅ Email z fakturą wysłany do ${order.email} (ID: ${info.messageId})`);
      return true;
    } catch (error) {
      console.error('❌ Błąd podczas wysyłania emaila z fakturą:', error);
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

      console.log(`✅ Email o wysyłce wysłany do ${order.email} (ID: ${info.messageId})`);
      return true;
    } catch (error) {
      console.error("❌ Błąd podczas wysyłania emaila o wysyłce:", error);
      return false;
    }
  }
}

export class EmailServiceNoop implements IEmailService {
  async sendOrderConfirmation(data: OrderConfirmationData): Promise<boolean> {
    console.log(`${LogPrefix.EMAIL} [Noop] Order confirmation to ${data.email} (Order #${data.orderId})`);
    return true;
  }

  async sendPaidInvoiceEmail(params: PaidInvoiceEmailParams): Promise<boolean> {
    console.log(`${LogPrefix.EMAIL} [Noop] Invoice to ${params.order.email} (Order #${params.order.id} - ${params.invoiceNumber})`);
    return true;
  }

  async sendShipmentEmail(params: ShipmentEmailParams): Promise<boolean> {
    console.log(`${LogPrefix.EMAIL} [Noop] Shipment to ${params.order.email} (#${params.trackingNumber})`);
    return true;
  }
}

// Backward-compatible alias
export { EmailServiceReal as EmailService };
