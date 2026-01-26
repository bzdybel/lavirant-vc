import type { ShippingProvider, ShipmentInput, ShipmentOutput } from "./ShippingProvider";

function generateTrackingNumber(): string {
  const random = Math.floor(10000000 + Math.random() * 90000000);
  return `INPOST-PL-${random}`;
}

export class MockInPostProvider implements ShippingProvider {
  createShipment(_input: ShipmentInput): Promise<ShipmentOutput> {
    const trackingNumber = generateTrackingNumber();
    return Promise.resolve({
      provider: "MOCK_INPOST",
      trackingNumber,
      trackingUrl: this.getTrackingUrl(trackingNumber),
      status: "CREATED",
    });
  }

  getTrackingUrl(trackingNumber: string): string {
    return `https://tracking.inpost.pl/?number=${encodeURIComponent(trackingNumber)}`;
  }
}
