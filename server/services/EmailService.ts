import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import path from 'path';
import type { Order } from "@shared/types/order";
import type { Product } from "@shared/types/product";
import { AppConfig } from "../config/appConfig";
import { LogPrefix } from "../constants/logPrefixes";
import * as EmailTemplates from "../utils/emailTemplates";

/**
 * Order Confirmation Email Data
 */
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

/**
 * Paid Invoice Email Parameters
 */
export interface PaidInvoiceEmailParams {
  order: Order;
  product?: Product;
  invoiceNumber: string;
  invoicePdfPath: string;
}

/**
 * Shipment Notification Email Parameters
 */
export interface ShipmentEmailParams {
  order: Order;
  trackingNumber: string;
  trackingUrl: string;
}

/**
 * Email Service
 *
 * Handles all email communications in the application.
 * Single Responsibility: Manage email configuration and sending.
 */
export class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;
  private initialized: boolean = false;

  /**
   * Initializes the email service with configuration
   */
  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    if (!AppConfig.isEmailConfigured()) {
      console.warn('⚠️  Email service not configured. Order confirmation emails will not be sent.');
      console.warn('   Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS (or EMAIL_PASSWORD) environment variables to enable email functionality.');
      this.isConfigured = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: AppConfig.EMAIL_HOST,
        port: parseInt(AppConfig.EMAIL_PORT),
        secure: AppConfig.EMAIL_SECURE,
        auth: {
          user: AppConfig.EMAIL_USER,
          pass: AppConfig.EMAIL_PASSWORD,
        },
      });

      this.isConfigured = true;
      console.log('✅ Email service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Sends order confirmation email
   */
  async sendOrderConfirmation(data: OrderConfirmationData): Promise<boolean> {
    this.ensureInitialized();

    if (!this.isEmailReady()) {
      this.logMockEmail('order confirmation', data.email, `Order #${data.orderId}`);
      return true;
    }

    try {
      const { html, text } = EmailTemplates.generateOrderConfirmationEmail(data);

      const mailOptions = {
        from: this.getFromAddress(),
        to: data.email,
        subject: `Potwierdzenie zamówienia - Zamówienie #${data.orderId}`,
        text,
        html,
      };

      const info = await this.transporter!.sendMail(mailOptions);
      console.log(`✅ Email potwierdzający zamówienie wysłany do ${data.email} (ID: ${info.messageId})`);
      return true;
    } catch (error) {
      console.error('❌ Błąd podczas wysyłania emaila z potwierdzeniem zamówienia:', error);
      return false;
    }
  }

  /**
   * Sends paid invoice email with PDF attachment
   */
  async sendPaidInvoiceEmail(params: PaidInvoiceEmailParams): Promise<boolean> {
    this.ensureInitialized();
    const { order, product, invoiceNumber, invoicePdfPath } = params;

    if (!this.isEmailReady()) {
      this.logMockEmail('invoice', order.email, `Order #${order.id} - Invoice ${invoiceNumber}`);
      return true;
    }

    const attachmentPath = this.resolveAbsolutePath(invoicePdfPath);
    const { html, text } = EmailTemplates.generateInvoiceEmail(order, product, invoiceNumber);

    try {
      const mailOptions = {
        from: this.getFromAddress(),
        to: order.email,
        subject: "Faktura za zakup gry – Lavirant",
        text,
        html,
        attachments: [
          {
            filename: path.basename(attachmentPath),
            path: attachmentPath,
          },
        ],
      };

      const info = await this.transporter!.sendMail(mailOptions);
      console.log(`✅ Email z fakturą wysłany do ${order.email} (ID: ${info.messageId})`);
      return true;
    } catch (error) {
      console.error('❌ Błąd podczas wysyłania emaila z fakturą:', error);
      return false;
    }
  }

  /**
   * Sends shipment notification email
   */
  async sendShipmentEmail(params: ShipmentEmailParams): Promise<boolean> {
    this.ensureInitialized();
    const { order, trackingNumber, trackingUrl } = params;

    if (!this.isEmailReady()) {
      this.logMockEmail('shipment', order.email, `Order #${order.id} - ${trackingNumber}`);
      return true;
    }

    try {
      const { html, text } = EmailTemplates.generateShipmentEmail(order, trackingNumber, trackingUrl);

      const mailOptions = {
        from: this.getFromAddress(),
        to: order.email,
        subject: "Twoje zamówienie zostało wysłane – Lavirant",
        text,
        html,
      };

      const info = await this.transporter!.sendMail(mailOptions);
      console.log(`✅ Email o wysyłce wysłany do ${order.email} (ID: ${info.messageId})`);
      return true;
    } catch (error) {
      console.error("❌ Błąd podczas wysyłania emaila o wysyłce:", error);
      return false;
    }
  }

  /**
   * Ensures service is initialized before use
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      this.initialize();
    }
  }

  /**
   * Checks if email is ready to send
   */
  private isEmailReady(): boolean {
    return this.isConfigured && this.transporter !== null;
  }

  /**
   * Gets the from email address
   */
  private getFromAddress(): string {
    return `Lavirant <${AppConfig.EMAIL_FROM || AppConfig.EMAIL_USER}>`;
  }

  /**
   * Resolves file path to absolute
   */
  private resolveAbsolutePath(filePath: string): string {
    return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  }

  /**
   * Logs mock email in development mode
   */
  private logMockEmail(type: string, recipient: string, details: string): void {
    console.log(`${LogPrefix.EMAIL} [Mock] Wysłano email (${type}) do ${recipient}`);
    console.log(`   ${details}`);
  }
}
