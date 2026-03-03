import type { Request, Response } from "express";
import { MarkOrderShippedHandler } from "../ShipmentHandlers";
import { storage } from "../../storage";
import { makeResponse, makeRequest } from "../../__tests__/helpers/httpMocks";
import { makeEmailServiceMock, makeShippingServiceMock } from "../../__tests__/helpers/serviceMocks";

jest.mock("../../storage", () => ({
  storage: {
    getOrder: jest.fn(),
  },
}));

type MockedStorage = {
  getOrder: jest.Mock;
};

describe("ShipmentHandlers", () => {
  const mockedStorage = storage as unknown as MockedStorage;

  let emailService: ReturnType<typeof makeEmailServiceMock>;
  let shippingService: ReturnType<typeof makeShippingServiceMock>;

  beforeEach(() => {
    emailService = makeEmailServiceMock();
    shippingService = makeShippingServiceMock();
  });

  describe("MarkOrderShippedHandler", () => {
    describe("Validation", () => {
      it("returns 400 for invalid orderId (NaN)", async () => {
        const handler = MarkOrderShippedHandler({
          emailService: emailService as any,
          shippingService: shippingService as any,
        });

        const req = { params: { orderId: "invalid" } } as unknown as Request;
        const res = makeResponse();

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Invalid order ID" });
        expect(mockedStorage.getOrder).not.toHaveBeenCalled();
      });

      it("returns 400 for non-numeric orderId", async () => {
        const handler = MarkOrderShippedHandler({
          emailService: emailService as any,
          shippingService: shippingService as any,
        });

        const req = { params: { orderId: "abc123" } } as unknown as Request;
        const res = makeResponse();

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Invalid order ID" });
      });

      it("returns 400 for undefined orderId", async () => {
        const handler = MarkOrderShippedHandler({
          emailService: emailService as any,
          shippingService: shippingService as any,
        });

        const req = { params: {} } as unknown as Request;
        const res = makeResponse();

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Invalid order ID" });
      });

      it("handles negative orderId as valid", async () => {
        mockedStorage.getOrder.mockResolvedValue(null);

        const handler = MarkOrderShippedHandler({
          emailService: emailService as any,
          shippingService: shippingService as any,
        });

        const req = { params: { orderId: "-1" } } as unknown as Request;
        const res = makeResponse();

        await handler(req, res);

        expect(mockedStorage.getOrder).toHaveBeenCalledWith(-1);
        expect(res.status).toHaveBeenCalledWith(404);
      });

      it("handles zero as valid orderId", async () => {
        mockedStorage.getOrder.mockResolvedValue(null);

        const handler = MarkOrderShippedHandler({
          emailService: emailService as any,
          shippingService: shippingService as any,
        });

        const req = { params: { orderId: "0" } } as unknown as Request;
        const res = makeResponse();

        await handler(req, res);

        expect(mockedStorage.getOrder).toHaveBeenCalledWith(0);
      });
    });

    describe("Order Lookup", () => {
      it("returns 404 when order not found", async () => {
        mockedStorage.getOrder.mockResolvedValue(null);

        const handler = MarkOrderShippedHandler({
          emailService: emailService as any,
          shippingService: shippingService as any,
        });

        const req = { params: { orderId: "999" } } as unknown as Request;
        const res = makeResponse();

        await handler(req, res);

        expect(mockedStorage.getOrder).toHaveBeenCalledWith(999);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "Order not found" });
        expect(shippingService.markShipped).not.toHaveBeenCalled();
      });

      it("proceeds to shipping when order found", async () => {
        mockedStorage.getOrder.mockResolvedValue({
          id: 1,
          status: "PAID",
        });

        shippingService.markShipped.mockResolvedValue({
          shipmentId: 1,
          trackingNumber: "TRACK123",
          trackingUrl: "https://track.example.com/TRACK123",
        });

        const handler = MarkOrderShippedHandler({
          emailService: emailService as any,
          shippingService: shippingService as any,
        });

        const req = { params: { orderId: "1" } } as unknown as Request;
        const res = makeResponse();

        await handler(req, res);

        expect(shippingService.markShipped).toHaveBeenCalledWith(1);
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    describe("Shipping Service", () => {
      it("returns 404 when shipment not found", async () => {
        mockedStorage.getOrder.mockResolvedValue({
          id: 1,
          status: "PAID",
        });

        shippingService.markShipped.mockResolvedValue(null);

        const handler = MarkOrderShippedHandler({
          emailService: emailService as any,
          shippingService: shippingService as any,
        });

        const req = { params: { orderId: "1" } } as unknown as Request;
        const res = makeResponse();

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "Shipment not found" });
        expect(emailService.sendShipmentEmail).not.toHaveBeenCalled();
      });

      it("returns tracking info when shipment marked successfully", async () => {
        mockedStorage.getOrder.mockResolvedValue({
          id: 42,
          status: "PAID",
        });

        shippingService.markShipped.mockResolvedValue({
          shipmentId: 10,
          trackingNumber: "TRACK42",
          trackingUrl: "https://track.example.com/TRACK42",
        });

        const handler = MarkOrderShippedHandler({
          emailService: emailService as any,
          shippingService: shippingService as any,
        });

        const req = { params: { orderId: "42" } } as unknown as Request;
        const res = makeResponse();

        await handler(req, res);

        expect(res.json).toHaveBeenCalledWith({
          orderId: 42,
          status: "SHIPPED",
          trackingNumber: "TRACK42",
          trackingUrl: "https://track.example.com/TRACK42",
        });
      });

      it("returns 500 on shipping service error", async () => {
        mockedStorage.getOrder.mockResolvedValue({
          id: 1,
          status: "PAID",
        });

        shippingService.markShipped.mockRejectedValue(new Error("Shipping API error"));

        const handler = MarkOrderShippedHandler({
          emailService: emailService as any,
          shippingService: shippingService as any,
        });

        const req = { params: { orderId: "1" } } as unknown as Request;
        const res = makeResponse();

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Shipping API error" });
      });
    });

    describe("Email Notification", () => {
      it("sends shipment email with tracking info", async () => {
        const order = {
          id: 5,
          status: "PAID",
          email: "customer@example.com",
          firstName: "John",
          lastName: "Doe",
        };

        mockedStorage.getOrder.mockResolvedValue(order);

        shippingService.markShipped.mockResolvedValue({
          shipmentId: 1,
          trackingNumber: "ABC123",
          trackingUrl: "https://track.example.com/ABC123",
        });

        const handler = MarkOrderShippedHandler({
          emailService: emailService as any,
          shippingService: shippingService as any,
        });

        const req = { params: { orderId: "5" } } as unknown as Request;
        const res = makeResponse();

        await handler(req, res);

        expect(emailService.sendShipmentEmail).toHaveBeenCalledWith({
          order,
          trackingNumber: "ABC123",
          trackingUrl: "https://track.example.com/ABC123",
        });
      });

      it("returns success even when email fails", async () => {
        mockedStorage.getOrder.mockResolvedValue({
          id: 1,
          status: "PAID",
        });

        shippingService.markShipped.mockResolvedValue({
          shipmentId: 1,
          trackingNumber: "TRACK1",
          trackingUrl: "https://track.example.com/TRACK1",
        });

        emailService.sendShipmentEmail.mockRejectedValue(new Error("Email failed"));

        const handler = MarkOrderShippedHandler({
          emailService: emailService as any,
          shippingService: shippingService as any,
        });

        const req = { params: { orderId: "1" } } as unknown as Request;
        const res = makeResponse();

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Email failed" });
      });
    });

    describe("Response Structure", () => {
      it("returns correct response structure", async () => {
        mockedStorage.getOrder.mockResolvedValue({
          id: 100,
          status: "PAID",
        });

        shippingService.markShipped.mockResolvedValue({
          shipmentId: 50,
          trackingNumber: "FINAL123",
          trackingUrl: "https://track.example.com/FINAL123",
        });

        const handler = MarkOrderShippedHandler({
          emailService: emailService as any,
          shippingService: shippingService as any,
        });

        const req = { params: { orderId: "100" } } as unknown as Request;
        const res = makeResponse();

        await handler(req, res);

        const response = (res.json as jest.Mock).mock.calls[0][0];

        expect(response).toHaveProperty("orderId", 100);
        expect(response).toHaveProperty("status", "SHIPPED");
        expect(response).toHaveProperty("trackingNumber");
        expect(response).toHaveProperty("trackingUrl");
      });

      it("includes shipmentId in tracking info", async () => {
        mockedStorage.getOrder.mockResolvedValue({
          id: 1,
          status: "PAID",
        });

        shippingService.markShipped.mockResolvedValue({
          shipmentId: 999,
          trackingNumber: "XYZ789",
          trackingUrl: "https://track.example.com/XYZ789",
        });

        const handler = MarkOrderShippedHandler({
          emailService: emailService as any,
          shippingService: shippingService as any,
        });

        const req = { params: { orderId: "1" } } as unknown as Request;
        const res = makeResponse();

        await handler(req, res);

        expect(shippingService.markShipped).toHaveBeenCalledWith(1);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            trackingNumber: "XYZ789",
            trackingUrl: "https://track.example.com/XYZ789",
          })
        );
      });
    });

    describe("Error Handling", () => {
      it("returns 500 on storage error", async () => {
        mockedStorage.getOrder.mockRejectedValue(new Error("Database error"));

        const handler = MarkOrderShippedHandler({
          emailService: emailService as any,
          shippingService: shippingService as any,
        });

        const req = { params: { orderId: "1" } } as unknown as Request;
        const res = makeResponse();

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Database error" });
      });

      it("handles error without message", async () => {
        mockedStorage.getOrder.mockRejectedValue("Unknown error");

        const handler = MarkOrderShippedHandler({
          emailService: emailService as any,
          shippingService: shippingService as any,
        });

        const req = { params: { orderId: "1" } } as unknown as Request;
        const res = makeResponse();

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: undefined });
      });
    });
  });
});
