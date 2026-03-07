import type { Request, Response } from "express";
import type { EmailService } from "../services/EmailService";
import type { ShippingService } from "../services/ShippingService";
import type { Order } from "@shared/types/order";
import { storage } from "../storage";

interface ShipmentDependencies {
  emailService: EmailService;
  shippingService: ShippingService;
}

export function MarkOrderShippedHandler(deps: ShipmentDependencies) {
  return async (req: Request, res: Response) => {
    try {
      const orderId = Number(req.params.orderId);

      if (!Number.isFinite(orderId)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      const shipment = await deps.shippingService.markShipped(orderId);
      if (!shipment) {
        return res.status(404).json({ message: "Shipment not found" });
      }

      await deps.emailService.sendShipmentEmail({
        order: order as Order,
        trackingNumber: shipment.trackingNumber,
        trackingUrl: shipment.trackingUrl,
      });

      return res.json({
        orderId,
        status: "SHIPPED",
        trackingNumber: shipment.trackingNumber,
        trackingUrl: shipment.trackingUrl,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  };
}
