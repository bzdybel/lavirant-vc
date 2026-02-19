import type { Order } from "@shared/types/order";
import type { Product } from "@shared/types/product";
import type { OrderConfirmationData } from "./EmailService";

/**
 * Email Template Response
 */
interface EmailTemplate {
  html: string;
  text: string;
}

/**
 * Formats price from cents to PLN
 */
function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2)} zł`;
}

/**
 * Formats ISO date to Polish locale
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Logo HTML
 */
function getLogoHtml(): string {
  return `<div style="font-size: 28px; font-weight: 700; color: #0f2433; letter-spacing: 1px; font-family: Georgia, serif;">LAVIRANT</div>`;
}

/**
 * Generates order confirmation email
 */
export function generateOrderConfirmationEmail(data: OrderConfirmationData): EmailTemplate {
  const html = `
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
          <tr>
            <td style="padding: 40px 40px 24px 40px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              ${getLogoHtml()}
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 40px 32px 40px;">
              <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">Potwierdzenie zamówienia</h1>
              <p style="margin: 0 0 8px 0; font-size: 15px; color: #525252; line-height: 1.5;">Dziękujemy za złożenie zamówienia.</p>
              <p style="margin: 0; font-size: 15px; color: #525252; line-height: 1.5;">Szczegóły zamówienia znajdują się poniżej.</p>
            </td>
          </tr>
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
                        <td style="font-size: 15px; color: #1a1a1a;">${formatDate(data.orderDate)}</td>
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
                              <td style="font-size: 20px; color: #1a1a1a; font-weight: 600; text-align: right;">${formatPrice(data.total)}</td>
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

  const text = `
POTWIERDZENIE ZAMÓWIENIA
========================

Dziękujemy za zakup, ${data.firstName}!

Zamówienie #${data.orderId}
Data zamówienia: ${formatDate(data.orderDate)}

SZCZEGÓŁY ZAMÓWIENIA
--------------------
Produkt: ${data.productName}
Ilość: ${data.quantity}
Cena jednostkowa: ${formatPrice(data.total / data.quantity)}

SUMA DO ZAPŁATY: ${formatPrice(data.total)}

ADRES DOSTAWY
-------------
${data.firstName} ${data.lastName}
${data.address}
${data.city}, ${data.postalCode}
${data.country}

W razie pytań dotyczących zamówienia, skontaktuj się z nami.
Dziękujemy za wybranie Lavirant!
  `;

  return { html, text };
}

/**
 * Generates invoice email with PDF attachment
 */
export function generateInvoiceEmail(
  order: Order,
  product: Product | undefined,
  invoiceNumber: string
): EmailTemplate {
  const productName = product?.name || "Lavirant";

  const html = `
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
              ${getLogoHtml()}
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
                    <div style="font-size: 15px; color: #1a1a1a; font-weight: 600;">${formatPrice(order.total)}</div>
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

  const text = `
FAKTURA ZA ZAKUP GRY
====================

Płatność została potwierdzona. Faktura VAT ${invoiceNumber} jest w załączniku.

Zamówienie #${order.id}
Produkt: ${productName}
Ilość: ${order.quantity}
Kwota: ${formatPrice(order.total)}

W razie pytań napisz do nas: zamowienia@lavirant.pl
  `;

  return { html, text };
}

/**
 * Generates shipment notification email
 */
export function generateShipmentEmail(
  order: Order,
  trackingNumber: string,
  trackingUrl: string
): EmailTemplate {
  const html = `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wysyłka zamówienia</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; max-width: 600px;">
          <tr>
            <td style="padding: 40px 40px 24px 40px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              ${getLogoHtml()}
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 40px 32px 40px;">
              <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">Twoje zamówienie zostało wysłane</h1>
              <p style="margin: 0; font-size: 15px; color: #525252; line-height: 1.5;">
                Zamówienie <strong>#${order.id}</strong> zostało wysłane.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid #e5e5e5; border-radius: 4px;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="font-size: 13px; color: #737373; padding-bottom: 6px;">Numer przesyłki</div>
                    <div style="font-size: 15px; color: #1a1a1a; font-weight: 600;">${trackingNumber}</div>
                    <div style="padding-top: 16px;">
                      <a href="${trackingUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0f2433; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 500;">Śledź przesyłkę</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 40px 40px 40px; border-top: 1px solid #e5e5e5;">
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

  const text = `
WYSYŁKA ZAMÓWIENIA
==================

Twoje zamówienie #${order.id} zostało wysłane.

Numer przesyłki: ${trackingNumber}
Śledź przesyłkę: ${trackingUrl}

Dziękujemy za wybranie Lavirant!
  `;

  return { html, text };
}
