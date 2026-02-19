/**
 * @deprecated This file has been refactored
 * Import from server/services/ShippingService.ts instead
 */

export { ShippingService } from "../services/ShippingService";

// Export singleton instance for backward compatibility
import { ShippingService } from "../services/ShippingService";

const shippingServiceInstance = new ShippingService();

export const shippingService = shippingServiceInstance;
