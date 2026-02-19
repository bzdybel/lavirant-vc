import type { Order } from "@shared/types/order";
import type { Product } from "@shared/types/product";

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2)} zł`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function renderInvoiceHtml(
  order: Order,
  product: Product | undefined,
  invoiceNumber: string,
  issuedAt: Date
): string {
  const sellerName = process.env.INVOICE_SELLER_NAME || "Lavirant";
  const sellerAddress = process.env.INVOICE_SELLER_ADDRESS || "";
  const sellerNip = process.env.INVOICE_SELLER_NIP || "";
  const sellerEmail = process.env.INVOICE_SELLER_EMAIL || "zamowienia@lavirant.pl";

  const buyerName = `${order.firstName} ${order.lastName}`;
  const buyerAddress = `${order.address}, ${order.postalCode} ${order.city}, ${order.country}`;

  const itemName = product?.name || "Lavirant";
  const deliveryCost = order.deliveryCost ?? 0;
  const productSubtotal = product
    ? product.price * order.quantity
    : Math.max(order.total - deliveryCost, 0);
  const unitPrice = order.quantity > 0
    ? Math.round(productSubtotal / order.quantity)
    : productSubtotal;
  const productTotal = productSubtotal;
  const totalWithDelivery = productTotal + deliveryCost;

  return `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Faktura ${invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 32px; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    .meta { margin-bottom: 24px; font-size: 13px; color: #555; }
    .section { margin-bottom: 20px; }
    .row { display: flex; justify-content: space-between; gap: 24px; }
    .box { flex: 1; border: 1px solid #e5e5e5; padding: 12px; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border-bottom: 1px solid #e5e5e5; padding: 8px; text-align: left; font-size: 13px; }
    th { background: #f7f7f7; }
    .total { text-align: right; font-weight: bold; font-size: 14px; }
  </style>
</head>
<body>
  <h1>Faktura VAT</h1>
  <div class="meta">
    Numer: ${invoiceNumber}<br />
    Data wystawienia: ${formatDate(issuedAt)}
  </div>

  <div class="section row">
    <div class="box">
      <strong>Sprzedawca</strong><br />
      ${sellerName}<br />
      ${sellerAddress ? `${sellerAddress}<br />` : ""}
      ${sellerNip ? `NIP: ${sellerNip}<br />` : ""}
      ${sellerEmail}
    </div>
    <div class="box">
      <strong>Nabywca</strong><br />
      ${buyerName}<br />
      ${buyerAddress}<br />
      ${order.email}
    </div>
  </div>

  <div class="section">
    <table>
      <thead>
        <tr>
          <th>Produkt</th>
          <th>Ilość</th>
          <th>Cena jednostkowa</th>
          <th>Razem</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${itemName}</td>
          <td>${order.quantity}</td>
          <td>${formatPrice(unitPrice)}</td>
          <td>${formatPrice(productTotal)}</td>
        </tr>
        <tr>
          <td>Dostawa</td>
          <td>1</td>
          <td>${formatPrice(deliveryCost)}</td>
          <td>${formatPrice(deliveryCost)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section total">Suma do zapłaty: ${formatPrice(totalWithDelivery)}</div>
</body>
</html>
  `;
}
