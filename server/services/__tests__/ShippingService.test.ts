import { ShippingServiceReal } from "../ShippingService";
import { storage } from "../../storage";
import { getShipXClient } from "../../../lib/inpost/shipxClient";
import { InPostProvider } from "../../shipping/InPostProvider";
import { AppConfig } from "../../config/appConfig";
import type { Order } from "../../../shared/types/order";
import type { Shipment } from "../../db/schema";

jest.mock("../../storage");
jest.mock("../../../lib/inpost/shipxClient");
jest.mock("../../shipping/InPostProvider");

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockGetShipXClient = getShipXClient as jest.MockedFunction<typeof getShipXClient>;
const MockInPostProvider = InPostProvider as jest.MockedClass<typeof InPostProvider>;

describe("ShippingServiceReal", () => {
  let service: ShippingServiceReal;
  let mockProvider: jest.Mocked<InPostProvider>;
  let mockShipXClient: any;

const mockOrder: Order = {
  id: 1,
  quantity: 1,
  total: 10000,
  deliveryCost: 1500,
  deliveryMethod: "INPOST_PACZKOMAT",
  deliveryPointId: "KRA001",
  status: "PAID",
  shipmentId: "123456",
  shipmentStatus: "offer_selected",
  trackingNumber: "12345678901234567890",
  labelGenerated: false,
  paymentIntentId: "pi_test123",
  paymentProvider: "stripe",
  emailSentAt: null,
  invoiceNumber: null,
  invoiceIssuedAt: null,
  firstName: "John",
  lastName: "Doe",
  email: "test@example.com",
  phone: "+48123456789",
  address: "Test Street 1",
  city: "Kraków",
  postalCode: "30-001",
  country: "PL",
  createdAt: "2024-01-01T10:00:00Z",
};

  const mockShipment: Shipment = {
    id: 1,
    orderId: 1,
    provider: "inpost",
    providerShipmentId: "123456",
    selectedOfferId: "offer_123",
    trackingNumber: "12345678901234567890",
    trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=12345678901234567890",
    status: "offer_selected",
    boughtAt: null,
    buyError: null,
    createdAt: "2024-01-01T10:00:00Z",
    shippedAt: null,
  };

  beforeEach(() => {
    // Mock ShipX client
    mockShipXClient = {
      request: jest.fn(),
    };
    mockGetShipXClient.mockReturnValue(mockShipXClient as never);

    // Mock InPostProvider
    mockProvider = {
      createShipment: jest.fn(),
    } as any;
    MockInPostProvider.mockImplementation(() => mockProvider);

    service = new ShippingServiceReal();
  });

  describe("onOrderPaid", () => {
    describe("Existing Shipment Flow", () => {
      it("should return shipment output when shipment already bought", async () => {
        mockStorage.getShipmentByOrderId.mockResolvedValue({
          ...mockShipment,
          boughtAt: "2024-01-01T11:00:00Z",
        });

        const result = await service.onOrderPaid(mockOrder);

        expect(result).toEqual({
          provider: "inpost",
          trackingNumber: "12345678901234567890",
          trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=12345678901234567890",
          status: "CREATED",
          shipmentId: "123456",
        });
        expect(mockShipXClient.request).not.toHaveBeenCalled();
      });

      it("should buy shipment when offer exists but not bought", async () => {
        const shipmentWithOffer = {
          ...mockShipment,
          selectedOfferId: "offer_123",
          boughtAt: null,
        };

        mockStorage.getShipmentByOrderId.mockResolvedValue(shipmentWithOffer);
        mockShipXClient.request.mockResolvedValue(undefined);

        const result = await service.onOrderPaid(mockOrder);

        expect(mockShipXClient.request).toHaveBeenCalledWith("/v1/shipments/123456/buy", {
          method: "POST",
          body: JSON.stringify({ offer_id: "offer_123" }),
        });
        expect(mockStorage.updateShipment).toHaveBeenCalledWith(1, {
          boughtAt: expect.any(String),
          status: "buy_pending",
        });
        expect(mockStorage.updateOrder).toHaveBeenCalledWith(1, {
          shipmentStatus: "buy_pending",
        });
        expect(result).toEqual({
          provider: "inpost",
          trackingNumber: "12345678901234567890",
          trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=12345678901234567890",
          status: "CREATED",
          shipmentId: "123456",
        });
      });

      it("should fetch offer and buy when shipment exists without offer", async () => {
        const shipmentNoOffer = {
          ...mockShipment,
          selectedOfferId: null,
          boughtAt: null,
        };

        mockStorage.getShipmentByOrderId.mockResolvedValue(shipmentNoOffer);
        mockShipXClient.request
          .mockResolvedValueOnce({ selected_offer: { id: "offer_456" }, status: "offer_selected" }) // GET shipment details
          .mockResolvedValueOnce(undefined); // POST buy

        const result = await service.onOrderPaid(mockOrder);

        expect(mockShipXClient.request).toHaveBeenCalledWith("/v1/shipments/123456", { method: "GET" });
        expect(mockStorage.updateShipment).toHaveBeenNthCalledWith(1, 1, {
          selectedOfferId: "offer_456",
          status: "offer_selected",
        });
        expect(mockStorage.updateShipment).toHaveBeenNthCalledWith(2, 1, {
          boughtAt: expect.any(String),
          status: "buy_pending",
        });
        expect(mockShipXClient.request).toHaveBeenCalledWith("/v1/shipments/123456/buy", {
          method: "POST",
          body: JSON.stringify({ offer_id: "offer_456" }),
        });
        expect(result).toEqual({
          provider: "inpost",
          trackingNumber: "12345678901234567890",
          trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=12345678901234567890",
          status: "CREATED",
          shipmentId: "123456",
        });
      });

      it("should handle buy error and update shipment with error message", async () => {
        const shipmentWithOffer = {
          ...mockShipment,
          selectedOfferId: "offer_123",
          boughtAt: null,
        };

        mockStorage.getShipmentByOrderId.mockResolvedValue(shipmentWithOffer);
        mockShipXClient.request.mockRejectedValue(new Error("Buy failed"));

        const result = await service.onOrderPaid(mockOrder);

        expect(mockStorage.updateShipment).toHaveBeenCalledWith(1, {
          buyError: "Buy failed",
        });
        expect(result).toEqual({
          provider: "inpost",
          trackingNumber: "12345678901234567890",
          trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=12345678901234567890",
          status: "CREATED",
          shipmentId: "123456",
        });
      });
    });

    describe("New Shipment Flow", () => {
      it("should create shipment, get offer, and buy when no shipment exists", async () => {
        mockStorage.getShipmentByOrderId.mockResolvedValueOnce(undefined);
        mockStorage.getShipmentByOrderId.mockResolvedValueOnce(undefined);

        mockProvider.createShipment.mockResolvedValue({
          provider: "inpost",
          shipmentId: "new_123",
          trackingNumber: "98765432109876543210",
          trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=98765432109876543210",
          status: "CREATED",
          shipxStatus: "offer_selected",
          selectedOfferId: null,
        });

        mockStorage.createShipment.mockResolvedValue({
          id: 2,
          orderId: 1,
          provider: "inpost",
          providerShipmentId: "new_123",
          selectedOfferId: null,
          trackingNumber: "98765432109876543210",
          trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=98765432109876543210",
          status: "offer_selected",
          boughtAt: null,
          buyError: null,
          createdAt: "2024-01-01T10:00:00Z",
          shippedAt: null,
        });

        // Second call to getShipmentByOrderId after creation
        mockStorage.getShipmentByOrderId.mockResolvedValueOnce({
          id: 2,
          orderId: 1,
          provider: "inpost",
          providerShipmentId: "new_123",
          selectedOfferId: null,
          trackingNumber: "98765432109876543210",
          trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=98765432109876543210",
          status: "offer_selected",
          boughtAt: null,
          buyError: null,
          createdAt: "2024-01-01T10:00:00Z",
          shippedAt: null,
        });

        mockShipXClient.request
          .mockResolvedValueOnce({ selected_offer: { id: "offer_789" } }) // GET shipment details
          .mockResolvedValueOnce(undefined); // POST buy

        const result = await service.onOrderPaid(mockOrder);

        expect(mockProvider.createShipment).toHaveBeenCalledWith({ order: mockOrder });
        expect(mockStorage.createShipment).toHaveBeenCalled();
        expect(mockStorage.updateOrder).toHaveBeenCalledWith(1, {
          shipmentId: "new_123",
          shipmentStatus: "offer_selected",
          trackingNumber: "98765432109876543210",
          labelGenerated: false,
        });
        expect(mockShipXClient.request).toHaveBeenCalledWith("/v1/shipments/new_123", { method: "GET" });
        expect(mockShipXClient.request).toHaveBeenCalledWith("/v1/shipments/new_123/buy", {
          method: "POST",
          body: JSON.stringify({ offer_id: "offer_789" }),
        });
        expect(result).toEqual({
          provider: "inpost",
          shipmentId: "new_123",
          trackingNumber: "98765432109876543210",
          trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=98765432109876543210",
          status: "CREATED",
          shipxStatus: "offer_selected",
          selectedOfferId: null,
        });
      });
    });

    describe("Error Handling", () => {
      it("should handle error when fetching offers fails", async () => {
        const shipmentNoOffer = {
          ...mockShipment,
          selectedOfferId: null,
          boughtAt: null,
        };

        mockStorage.getShipmentByOrderId.mockResolvedValue(shipmentNoOffer);
        mockShipXClient.request.mockRejectedValue(new Error("Network error"));

        const result = await service.onOrderPaid(mockOrder);

        expect(result).toEqual({
          provider: "inpost",
          trackingNumber: "12345678901234567890",
          trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=12345678901234567890",
          status: "CREATED",
          shipmentId: "123456",
        });
        // Buy should not be called
        expect(mockShipXClient.request).toHaveBeenCalledTimes(1);
      });

      it("should handle missing selected_offer in shipment details", async () => {
        const shipmentNoOffer = {
          ...mockShipment,
          selectedOfferId: null,
          boughtAt: null,
        };

        mockStorage.getShipmentByOrderId.mockResolvedValue(shipmentNoOffer);
        mockShipXClient.request.mockResolvedValue({ selected_offer: null });

        const result = await service.onOrderPaid(mockOrder);

        expect(result).toEqual({
          provider: "inpost",
          trackingNumber: "12345678901234567890",
          trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=12345678901234567890",
          status: "CREATED",
          shipmentId: "123456",
        });
        expect(mockStorage.updateShipment).not.toHaveBeenCalled();
      });
    });
  });

  describe("createShipment", () => {
    describe("Existing Shipment", () => {
      it("should return existing shipment with SHIPPED status", async () => {
        mockStorage.getShipmentByOrderId.mockResolvedValue({
          ...mockShipment,
          status: "SHIPPED",
        });

        const result = await service.createShipment(mockOrder);

        expect(result).toEqual({
          provider: "inpost",
          trackingNumber: "12345678901234567890",
          trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=12345678901234567890",
          status: "SHIPPED",
          shipmentId: "123456",
        });
        expect(mockProvider.createShipment).not.toHaveBeenCalled();
      });

      it("should return existing shipment with CREATED status when not shipped", async () => {
        mockStorage.getShipmentByOrderId.mockResolvedValue({
          ...mockShipment,
          status: "offer_selected",
        });

        const result = await service.createShipment(mockOrder);

        expect(result).toEqual({
          provider: "inpost",
          trackingNumber: "12345678901234567890",
          trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=12345678901234567890",
          status: "CREATED",
          shipmentId: "123456",
        });
      });

      it("should handle existing shipment without providerShipmentId", async () => {
        mockStorage.getShipmentByOrderId.mockResolvedValue({
          ...mockShipment,
          providerShipmentId: null,
        });

        const result = await service.createShipment(mockOrder);

        expect(result?.shipmentId).toBeUndefined();
      });
    });

    describe("New Shipment Creation", () => {
      it("should create new shipment via provider", async () => {
        mockStorage.getShipmentByOrderId.mockResolvedValue(undefined);

        mockProvider.createShipment.mockResolvedValue({
          provider: "inpost",
          shipmentId: "new_456",
          trackingNumber: "11111111111111111111",
          trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=11111111111111111111",
          status: "CREATED",
          shipxStatus: "offer_selected",
          selectedOfferId: "offer_abc",
        });

        const result = await service.createShipment(mockOrder);

        expect(mockProvider.createShipment).toHaveBeenCalledWith({ order: mockOrder });
        expect(mockStorage.createShipment).toHaveBeenCalledWith({
          orderId: 1,
          provider: "inpost",
          providerShipmentId: "new_456",
          selectedOfferId: "offer_abc",
          trackingNumber: "11111111111111111111",
          trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=11111111111111111111",
          status: "offer_selected",
          boughtAt: null,
          buyError: null,
          createdAt: expect.any(String),
          shippedAt: null,
        });
        expect(mockStorage.updateOrder).toHaveBeenCalledWith(1, {
          shipmentId: "new_456",
          shipmentStatus: "offer_selected",
          trackingNumber: "11111111111111111111",
          labelGenerated: false,
        });
        expect(result).toEqual({
          provider: "inpost",
          shipmentId: "new_456",
          trackingNumber: "11111111111111111111",
          trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=11111111111111111111",
          status: "CREATED",
          shipxStatus: "offer_selected",
          selectedOfferId: "offer_abc",
        });
      });

      it("should handle provider response without optional fields", async () => {
        mockStorage.getShipmentByOrderId.mockResolvedValue(undefined);

        mockProvider.createShipment.mockResolvedValue({
          provider: "inpost",
          shipmentId: undefined,
          trackingNumber: "22222222222222222222",
          trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=22222222222222222222",
          status: "CREATED",
          shipxStatus: undefined,
          selectedOfferId: undefined,
        });

         await service.createShipment(mockOrder);

        expect(mockStorage.createShipment).toHaveBeenCalledWith({
          orderId: 1,
          provider: "inpost",
          providerShipmentId: null,
          selectedOfferId: null,
          trackingNumber: "22222222222222222222",
          trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=22222222222222222222",
          status: "CREATED",
          boughtAt: null,
          buyError: null,
          createdAt: expect.any(String),
          shippedAt: null,
        });
        expect(mockStorage.updateOrder).toHaveBeenCalledWith(1, {
          shipmentId: null,
          shipmentStatus: "CREATED",
          trackingNumber: "22222222222222222222",
          labelGenerated: false,
        });
      });

      it("should normalize shipment status to CREATED when received", async () => {
        mockStorage.getShipmentByOrderId.mockResolvedValue(undefined);

        mockProvider.createShipment.mockResolvedValue({
          provider: "inpost",
          shipmentId: "new_789",
          trackingNumber: "33333333333333333333",
          trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=33333333333333333333",
          status: "CREATED",
          shipxStatus: "offer_selected",
          selectedOfferId: null,
        });

        const result = await service.createShipment(mockOrder);

        expect(result?.status).toBe("CREATED");
      });

      it("should preserve SHIPPED status when received", async () => {
        mockStorage.getShipmentByOrderId.mockResolvedValue(undefined);

        mockProvider.createShipment.mockResolvedValue({
          provider: "inpost",
          shipmentId: "new_999",
          trackingNumber: "44444444444444444444",
          trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=44444444444444444444",
          status: "SHIPPED",
          shipxStatus: "SHIPPED",
          selectedOfferId: null,
        });

        const result = await service.createShipment(mockOrder);

        expect(result?.status).toBe("SHIPPED");
      });
    });

    describe("Provider Integration", () => {
      it("should use correct environment from AppConfig", async () => {
        mockStorage.getShipmentByOrderId.mockResolvedValue(undefined);

        mockProvider.createShipment.mockResolvedValue({
          provider: "inpost",
          shipmentId: "env_test",
          trackingNumber: "55555555555555555555",
          trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=55555555555555555555",
          status: "CREATED",
        });

        await service.createShipment(mockOrder);

        // AppConfig.INPOST_SHIPX_ENV is used in the console.log
        expect(AppConfig.INPOST_SHIPX_ENV).toBe("sandbox");
      });
    });
  });

  describe("markShipped", () => {
    describe("Success Cases", () => {
      it("should mark shipment as shipped and return shipment info", async () => {
        mockStorage.getShipmentByOrderId.mockResolvedValue(mockShipment);
        mockStorage.updateShipment.mockResolvedValue({
          ...mockShipment,
          status: "SHIPPED",
          shippedAt: "2024-01-01T12:00:00Z",
        });

        const result = await service.markShipped(1);

        expect(mockStorage.updateShipment).toHaveBeenCalledWith(1, {
          status: "SHIPPED",
          shippedAt: expect.any(String),
        });
        expect(result).toEqual({
          shipmentId: 1,
          trackingNumber: "12345678901234567890",
          trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=12345678901234567890",
        });
      });
    });

    describe("Error Cases", () => {
      it("should return null when shipment not found", async () => {
        mockStorage.getShipmentByOrderId.mockResolvedValue(undefined);

        const result = await service.markShipped(1);

        expect(result).toBeNull();
        expect(mockStorage.updateShipment).not.toHaveBeenCalled();
      });

      it("should return null when update fails", async () => {
        mockStorage.getShipmentByOrderId.mockResolvedValue(mockShipment);
        mockStorage.updateShipment.mockResolvedValue(undefined);

        const result = await service.markShipped(1);

        expect(result).toBeNull();
      });
    });

    describe("Edge Cases", () => {
      it("should handle marking already shipped shipment", async () => {
        const shippedShipment = {
          ...mockShipment,
          status: "SHIPPED",
          shippedAt: "2024-01-01T11:00:00Z",
        };

        mockStorage.getShipmentByOrderId.mockResolvedValue(shippedShipment);
        mockStorage.updateShipment.mockResolvedValue({
          ...shippedShipment,
          shippedAt: "2024-01-01T12:00:00Z", // New timestamp
        });

        const result = await service.markShipped(1);

        expect(result).toEqual({
          shipmentId: 1,
          trackingNumber: "12345678901234567890",
          trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=12345678901234567890",
        });
      });
    });
  });
});
