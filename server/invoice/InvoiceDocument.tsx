import React from "react";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { Order } from "@shared/types/order";
import type { Product } from "@shared/types/product";
import { AppConfig } from "../config/appConfig";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, color: "#111" },
  title: { fontSize: 20, marginBottom: 6 },
  meta: { fontSize: 11, color: "#555", marginBottom: 20 },
  row: { flexDirection: "row", gap: 16, marginBottom: 20 },
  box: { flex: 1, border: "1pt solid #e5e5e5", padding: 10 },
  boxLabel: { fontWeight: "bold", marginBottom: 4 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f7f7f7", borderBottom: "1pt solid #e5e5e5", padding: "6 8" },
  tableRow: { flexDirection: "row", borderBottom: "1pt solid #e5e5e5", padding: "6 8" },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: "right" },
  col3: { flex: 2, textAlign: "right" },
  col4: { flex: 2, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  totalText: { fontWeight: "bold", fontSize: 12 },
});

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2)} zl`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

interface Props {
  order: Order;
  product: Product | undefined;
  invoiceNumber: string;
  issuedAt: Date;
}

function InvoiceDocument({ order, product, invoiceNumber, issuedAt }: Props) {
  const sellerName = AppConfig.INVOICE_SELLER_NAME || "Lavirant";
  const sellerAddress = AppConfig.INVOICE_SELLER_ADDRESS || "";
  const sellerNip = AppConfig.INVOICE_SELLER_NIP || "";
  const sellerEmail = AppConfig.INVOICE_SELLER_EMAIL || "zamowienia@lavirant.pl";

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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Faktura VAT</Text>
        <Text style={styles.meta}>
          {"Numer: " + invoiceNumber + "\n"}
          {"Data wystawienia: " + formatDate(issuedAt)}
        </Text>

        <View style={styles.row}>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>Sprzedawca</Text>
            <Text>{sellerName}</Text>
            {sellerAddress ? <Text>{sellerAddress}</Text> : null}
            {sellerNip ? <Text>{"NIP: " + sellerNip}</Text> : null}
            <Text>{sellerEmail}</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>Nabywca</Text>
            <Text>{buyerName}</Text>
            <Text>{buyerAddress}</Text>
            <Text>{order.email}</Text>
          </View>
        </View>

        <View>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Produkt</Text>
            <Text style={styles.col2}>Ilosc</Text>
            <Text style={styles.col3}>Cena jedn.</Text>
            <Text style={styles.col4}>Razem</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col1}>{itemName}</Text>
            <Text style={styles.col2}>{order.quantity}</Text>
            <Text style={styles.col3}>{formatPrice(unitPrice)}</Text>
            <Text style={styles.col4}>{formatPrice(productTotal)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col1}>Dostawa</Text>
            <Text style={styles.col2}>1</Text>
            <Text style={styles.col3}>{formatPrice(deliveryCost)}</Text>
            <Text style={styles.col4}>{formatPrice(deliveryCost)}</Text>
          </View>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalText}>{"Suma do zaplaty: " + formatPrice(totalWithDelivery)}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderInvoiceBuffer(
  order: Order,
  product: Product | undefined,
  invoiceNumber: string,
  issuedAt: Date
): Promise<Buffer> {
  return renderToBuffer(
    <InvoiceDocument order={order} product={product} invoiceNumber={invoiceNumber} issuedAt={issuedAt} />
  );
}
