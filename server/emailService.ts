import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import path from 'path';
import type { Order } from "@shared/types/order";
import type { Product } from "@shared/types/product";

interface OrderConfirmationData {
  orderId: number;
  firstName: string;
  lastName: string;
  email: string;
  productName: string;
  quantity: number;
  total: number; // in cents
  address: string;
  city: string;
  postalCode: string;
  country: string;
  orderDate: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const {
      EMAIL_HOST,
      EMAIL_PORT,
      EMAIL_USER,
      EMAIL_PASS,
      EMAIL_PASSWORD,
      EMAIL_FROM,
      EMAIL_SECURE
    } = process.env;

    // Support both EMAIL_PASS and EMAIL_PASSWORD
    const emailPassword = EMAIL_PASS || EMAIL_PASSWORD;

    // Check if email is configured
    if (!EMAIL_HOST || !EMAIL_USER || !emailPassword) {
      console.warn('⚠️  Email service not configured. Order confirmation emails will not be sent.');
      console.warn('   Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS (or EMAIL_PASSWORD) environment variables to enable email functionality.');
      this.isConfigured = false;
      return;
    }

    try {
      const secure = EMAIL_SECURE === 'true' || EMAIL_PORT === '465';

      this.transporter = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: parseInt(EMAIL_PORT || '587'),
        secure: secure, // true for 465, false for other ports
        auth: {
          user: EMAIL_USER,
          pass: emailPassword,
        },
      });

      this.isConfigured = true;
      console.log('✅ Email service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  private formatPrice(cents: number): string {
    return `${(cents / 100).toFixed(2)} zł`;
  }

  private formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private generateOrderConfirmationHTML(data: OrderConfirmationData): string {
    const logoHtml = `<div style="font-size: 28px; font-weight: 700; color: #0f2433; letter-spacing: 1px; font-family: Georgia, serif;">LAVIRANT</div>`;

    return `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Potwierdzenie zamówienia</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; max-width: 600px;">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 24px 40px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              ${logoHtml}
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding: 40px 40px 32px 40px;">
              <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">Potwierdzenie zamówienia</h1>
              <p style="margin: 0 0 8px 0; font-size: 15px; color: #525252; line-height: 1.5;">Dziękujemy za złożenie zamówienia.</p>
              <p style="margin: 0; font-size: 15px; color: #525252; line-height: 1.5;">Szczegóły zamówienia znajdują się poniżej.</p>
            </td>
          </tr>

          <!-- Order summary -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid #e5e5e5; border-radius: 4px;">
                <tr>
                  <td style="padding: 20px; border-bottom: 1px solid #e5e5e5;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="font-size: 13px; color: #737373; padding-bottom: 4px;">Numer zamówienia</td>
                      </tr>
                      <tr>
                        <td style="font-size: 15px; color: #1a1a1a; font-weight: 600;">#${data.orderId}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px; border-bottom: 1px solid #e5e5e5;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="font-size: 13px; color: #737373; padding-bottom: 4px;">Data zamówienia</td>
                      </tr>
                      <tr>
                        <td style="font-size: 15px; color: #1a1a1a;">${this.formatDate(data.orderDate)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="font-size: 15px; color: #1a1a1a; padding-bottom: 12px; font-weight: 500;">Produkt</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="font-size: 14px; color: #1a1a1a;">${data.productName}</td>
                              <td style="font-size: 14px; color: #737373; text-align: right;">× ${data.quantity}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 12px; border-top: 1px solid #e5e5e5;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="font-size: 15px; color: #1a1a1a; font-weight: 600; padding-top: 4px;">Razem</td>
                              <td style="font-size: 20px; color: #1a1a1a; font-weight: 600; text-align: right;">${this.formatPrice(data.total)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Delivery address -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <h2 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">Adres dostawy</h2>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="font-size: 14px; color: #525252; line-height: 1.6; padding: 0;">
                    ${data.firstName} ${data.lastName}<br>
                    ${data.address}<br>
                    ${data.postalCode} ${data.city}<br>
                    ${data.country}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px 40px 40px; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #737373; line-height: 1.5;">W razie pytań dotyczących zamówienia prosimy o kontakt:</p>
              <p style="margin: 0; font-size: 13px; color: #1a1a1a;">zamowienia@lavirant.pl</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <p style="margin: 0; font-size: 12px; color: #a3a3a3; line-height: 1.5;">
                © 2026 Lavirant. Wszystkie prawa zastrzeżone.<br>
                Wiadomość wygenerowana automatycznie, prosimy nie odpowiadać.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  private generateOrderConfirmationText(data: OrderConfirmationData): string {
    return `
POTWIERDZENIE ZAMÓWIENIA
========================

Dziękujemy za zakup, ${data.firstName}!

Zamówienie #${data.orderId}
Data zamówienia: ${this.formatDate(data.orderDate)}

SZCZEGÓŁY ZAMÓWIENIA
--------------------
Produkt: ${data.productName}
Ilość: ${data.quantity}
Cena jednostkowa: ${this.formatPrice(data.total / data.quantity)}

SUMA DO ZAPŁATY: ${this.formatPrice(data.total)}

ADRES DOSTAWY
-------------
${data.firstName} ${data.lastName}
${data.address}
${data.city}, ${data.postalCode}
${data.country}

W razie pytań dotyczących zamówienia, skontaktuj się z nami.
Dziękujemy za wybranie Lavirant!
    `;
  }

  private generateInvoiceEmailHtml(order: Order, product: Product | undefined, invoiceNumber: string): string {
    const productName = product?.name || "Lavirant";
    return `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Faktura za zakup gry</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; max-width: 600px;">
          <tr>
            <td style="padding: 40px 40px 24px 40px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <div style="font-size: 28px; font-weight: 700; color: #0f2433; letter-spacing: 1px; font-family: Georgia, serif;">LAVIRANT</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 40px 16px 40px;">
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">Faktura za zakup gry</h1>
              <p style="margin: 0; font-size: 15px; color: #525252; line-height: 1.5;">
                Twoja płatność została potwierdzona. W załączniku znajdziesz fakturę VAT ${invoiceNumber}.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid #e5e5e5; border-radius: 4px;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="font-size: 13px; color: #737373; padding-bottom: 6px;">Numer zamówienia</div>
                    <div style="font-size: 15px; color: #1a1a1a; font-weight: 600;">#${order.id}</div>
                    <div style="font-size: 13px; color: #737373; padding: 16px 0 6px 0;">Produkt</div>
                    <div style="font-size: 15px; color: #1a1a1a;">${productName} × ${order.quantity}</div>
                    <div style="font-size: 13px; color: #737373; padding: 16px 0 6px 0;">Łącznie</div>
                    <div style="font-size: 15px; color: #1a1a1a; font-weight: 600;">${this.formatPrice(order.total)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <p style="margin: 0; font-size: 13px; color: #737373; line-height: 1.5;">W razie pytań dotyczących zamówienia prosimy o kontakt: zamowienia@lavirant.pl</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <p style="margin: 0; font-size: 12px; color: #a3a3a3; line-height: 1.5;">
                © 2026 Lavirant. Wszystkie prawa zastrzeżone.<br>
                Wiadomość wygenerowana automatycznie, prosimy nie odpowiadać.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  private generateInvoiceEmailText(order: Order, product: Product | undefined, invoiceNumber: string): string {
    const productName = product?.name || "Lavirant";
    return `
  FAKTURA ZA ZAKUP GRY
  ====================

  Płatność została potwierdzona. Faktura VAT ${invoiceNumber} jest w załączniku.

Zamówienie #${order.id}
Produkt: ${productName}
Ilość: ${order.quantity}
Kwota: ${this.formatPrice(order.total)}

W razie pytań napisz do nas: zamowienia@lavirant.pl
    `;
  }

  async sendPaidInvoiceEmail(params: {
    order: Order;
    product?: Product | undefined;
    invoiceNumber: string;
    invoicePdfPath: string;
  }): Promise<boolean> {
    const { order, product, invoiceNumber, invoicePdfPath } = params;

    if (!this.isConfigured || !this.transporter) {
      console.log(`📧 [Mock] Wysłano email z fakturą do ${order.email}`);
      console.log(`   Zamówienie #${order.id} - Faktura ${invoiceNumber}`);
      return true;
    }

    const attachmentPath = path.isAbsolute(invoicePdfPath)
      ? invoicePdfPath
      : path.join(process.cwd(), invoicePdfPath);

    try {
      const mailOptions = {
        from: `Lavirant <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: order.email,
        subject: "Faktura za zakup gry – Lavirant",
        text: this.generateInvoiceEmailText(order, product, invoiceNumber),
        html: this.generateInvoiceEmailHtml(order, product, invoiceNumber),
        attachments: [
          {
            filename: path.basename(attachmentPath),
            path: attachmentPath,
          },
        ],
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email z fakturą wysłany do ${order.email} (ID: ${info.messageId})`);
      return true;
    } catch (error) {
      console.error('❌ Błąd podczas wysyłania emaila z fakturą:', error);
      return false;
    }
  }

  async sendOrderConfirmation(data: OrderConfirmationData): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.log(`📧 [Mock] Wysłano email potwierdzający zamówienie do ${data.email}`);
      console.log(`   Zamówienie #${data.orderId} - ${data.productName} x ${data.quantity}`);
      return true; // Return success in non-configured mode
    }

    try {
      const mailOptions = {
        from: `Lavirant <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: data.email,
        subject: `Potwierdzenie zamówienia - Zamówienie #${data.orderId}`,
        text: this.generateOrderConfirmationText(data),
        html: this.generateOrderConfirmationHTML(data),
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email potwierdzający zamówienie wysłany do ${data.email} (ID: ${info.messageId})`);
      return true;
    } catch (error) {
      console.error('❌ Błąd podczas wysyłania emaila z potwierdzeniem zamówienia:', error);
      return false;
    }
  }

  async sendShipmentEmail(params: {
    order: Order;
    trackingNumber: string;
    trackingUrl: string;
  }): Promise<boolean> {
    const { order, trackingNumber, trackingUrl } = params;

    if (!this.isConfigured || !this.transporter) {
      console.log(`📦 [Mock] Wysłano email o wysyłce do ${order.email}`);
      console.log(`   Zamówienie #${order.id} - ${trackingNumber} - ${trackingUrl}`);
      return true;
    }

    try {
      const mailOptions = {
        from: `Lavirant <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: order.email,
        subject: "Twoje zamówienie zostało wysłane – Lavirant",
        text: `Twoje zamówienie #${order.id} zostało wysłane. Numer przesyłki: ${trackingNumber}. Śledź przesyłkę: ${trackingUrl}`,
        html: `
<p>Twoje zamówienie <strong>#${order.id}</strong> zostało wysłane.</p>
<p>Numer przesyłki: <strong>${trackingNumber}</strong></p>
<p>Śledź przesyłkę: <a href="${trackingUrl}">${trackingUrl}</a></p>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email o wysyłce wysłany do ${order.email} (ID: ${info.messageId})`);
      return true;
    } catch (error) {
      console.error("❌ Błąd podczas wysyłania emaila o wysyłce:", error);
      return false;
    }
  }
}

// Export a singleton instance
export const emailService = new EmailService();
