import { ShipXPollingJob } from '../ShipXPollingJob';
import { getShipXClient, ShipXError } from '../../../lib/inpost/shipxClient';
import { storage } from '../../storage';
import { updateOrderShipmentState } from '../../inpost/shipxOrderUpdater';
import { AppConfig } from '../../config/appConfig';
import { JobConfig } from '../../constants/jobConfig';

jest.mock('../../../lib/inpost/shipxClient', () => {
  const actual = jest.requireActual('../../../lib/inpost/shipxClient');
  return {
    ...actual,
    getShipXClient: jest.fn(),
  };
});
jest.mock('../../storage');
jest.mock('../../inpost/shipxOrderUpdater');
jest.mock('../../config/appConfig', () => ({
  AppConfig: {
    INPOST_API_SHIPX: 'test-api-key',
    INPOST_SHIPX_ENV: 'sandbox',
  },
}));
jest.mock('../../constants/jobConfig', () => ({
  JobConfig: {
    SHIPX_POLL_INTERVAL_MINUTES: 5,
    SHIPX_RETRY_ATTEMPTS: 3,
    SHIPX_RETRY_BASE_DELAY_MS: 100,
  },
}));

describe('ShipXPollingJob', () => {
  let job: ShipXPollingJob;
  let mockClient: any;
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  const mockOrder = {
    id: 1,
    shipmentId: 'shipment-123',
    shipmentStatus: 'created',
    trackingNumber: null,
    labelGenerated: false,
  };

  const mockShipment = {
    id: 'shipment-123',
    status: 'confirmed',
    tracking_number: 'TRACK123456',
    trackingNumber: null,
  };

  const mockExistingShipment = {
    id: 1,
    orderId: 1,
    status: 'PENDING',
    trackingNumber: null,
  };

  beforeEach(() => {
    // Reset mutable AppConfig properties that individual tests may have mutated.
    (AppConfig as any).INPOST_API_SHIPX = 'test-api-key';
    (AppConfig as any).INPOST_SHIPX_ENV = 'sandbox';

    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    mockClient = {
      request: jest.fn().mockResolvedValue(mockShipment),
      requestBinary: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
    };

    (getShipXClient as jest.Mock).mockReturnValue(mockClient);
    (storage.listOrdersForShipmentPolling as jest.Mock).mockResolvedValue([mockOrder]);
    (storage.getShipmentByOrderId as jest.Mock).mockResolvedValue(mockExistingShipment);
    (storage.updateShipment as jest.Mock).mockResolvedValue(undefined);
    (updateOrderShipmentState as jest.Mock).mockResolvedValue({ ...mockOrder, shipmentStatus: 'confirmed' });

    job = new ShipXPollingJob();
  });

  afterEach(() => {
    if (job) {
      job.stop();
    }
    jest.restoreAllMocks();
  });

  describe('Job Lifecycle', () => {
    it('should not start when ShipX API is not configured', () => {
      (AppConfig as any).INPOST_API_SHIPX = '';
      job.start();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ShipX polling skipped'));
    });

    it('should schedule periodic runs at configured interval', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      job.start();
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);
      setIntervalSpy.mockRestore();
    });

    it('should stop successfully', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      job.start();
      job.stop();
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('should handle stop when not running', () => {
      expect(() => job.stop()).not.toThrow();
    });
  });

  describe('Shipment Processing', () => {
    it('should skip orders without shipmentId', async () => {
      const orderWithoutShipment = { ...mockOrder, shipmentId: null };
      (storage.listOrdersForShipmentPolling as jest.Mock).mockResolvedValue([orderWithoutShipment]);

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(mockClient.request).not.toHaveBeenCalled();
    });

    it('should skip mock shipment IDs', async () => {
      const mockShipmentOrder = { ...mockOrder, shipmentId: 'MOCK-12345' };
      (storage.listOrdersForShipmentPolling as jest.Mock).mockResolvedValue([mockShipmentOrder]);

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping mock shipment id'),
        expect.objectContaining({ shipmentId: 'MOCK-12345' })
      );
      expect(mockClient.request).not.toHaveBeenCalled();
    });

    it('should handle empty order list', async () => {
      (storage.listOrdersForShipmentPolling as jest.Mock).mockResolvedValue([]);

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(mockClient.request).not.toHaveBeenCalled();
    });
  });

  describe('Shipment Status Updates', () => {
    it('should update shipment status from ShipX', async () => {
      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(mockClient.request).toHaveBeenCalledWith('/v1/shipments/shipment-123', { method: 'GET' });
      expect(updateOrderShipmentState).toHaveBeenCalledWith(
        mockOrder,
        expect.objectContaining({
          shipmentStatus: 'confirmed',
          trackingNumber: 'TRACK123456',
        })
      );
    });

    it('should update existing shipment record', async () => {
      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(storage.updateShipment).toHaveBeenCalledWith(
        mockExistingShipment.id,
        expect.objectContaining({
          status: 'SHIPPED',
          trackingNumber: 'TRACK123456',
        })
      );
    });

    it('should handle shipment without existing record', async () => {
      (storage.getShipmentByOrderId as jest.Mock).mockResolvedValue(null);

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(updateOrderShipmentState).toHaveBeenCalled();
      expect(storage.updateShipment).not.toHaveBeenCalled();
    });
  });

  describe('Tracking Number Resolution', () => {
    it('should resolve tracking_number field', async () => {
      mockClient.request.mockResolvedValue({
        ...mockShipment,
        tracking_number: 'TRACK789',
        trackingNumber: null,
      });

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(updateOrderShipmentState).toHaveBeenCalledWith(
        mockOrder,
        expect.objectContaining({ trackingNumber: 'TRACK789' })
      );
    });

    it('should resolve trackingNumber field as fallback', async () => {
      mockClient.request.mockResolvedValue({
        ...mockShipment,
        tracking_number: null,
        trackingNumber: 'TRACK999',
      });

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(updateOrderShipmentState).toHaveBeenCalledWith(
        mockOrder,
        expect.objectContaining({ trackingNumber: 'TRACK999' })
      );
    });

    it('should handle missing tracking number', async () => {
      mockClient.request.mockResolvedValue({
        ...mockShipment,
        tracking_number: null,
        trackingNumber: null,
      });

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(updateOrderShipmentState).toHaveBeenCalledWith(
        mockOrder,
        expect.objectContaining({ trackingNumber: undefined })
      );
    });
  });

  describe('Label Generation', () => {
    it('should generate label for confirmed shipments', async () => {
      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(mockClient.requestBinary).toHaveBeenCalledWith(
        '/v1/shipments/shipment-123/label?format=pdf',
        { method: 'GET' }
      );
      expect(updateOrderShipmentState).toHaveBeenCalledTimes(2);
      expect(updateOrderShipmentState).toHaveBeenLastCalledWith(
        mockOrder,
        { labelGenerated: true }
      );
    });

    it('should not generate label if already generated', async () => {
      (updateOrderShipmentState as jest.Mock).mockResolvedValue({
        ...mockOrder,
        labelGenerated: true,
      });

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(mockClient.requestBinary).not.toHaveBeenCalled();
    });

    it('should not generate label for non-confirmed shipments', async () => {
      mockClient.request.mockResolvedValue({
        ...mockShipment,
        status: 'created',
      });

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(mockClient.requestBinary).not.toHaveBeenCalled();
    });

    it('should handle label generation errors gracefully', async () => {
      const error = new Error('Label generation failed');
      mockClient.requestBinary.mockRejectedValue(error);

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to generate label'),
        expect.objectContaining({ orderId: mockOrder.id })
      );
    });

    it('should update shipment status to SHIPPED after label generation', async () => {
      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(storage.updateShipment).toHaveBeenCalledWith(
        mockExistingShipment.id,
        expect.objectContaining({ status: 'SHIPPED' })
      );
    });
  });

  describe('Retry Logic', () => {
    it('should retry on 500 errors', async () => {
      const error = new ShipXError('Server error', 500, {});
      mockClient.request
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockShipment);

      job.start();
      await new Promise(resolve => setTimeout(resolve, 500));
      job.stop();

      expect(mockClient.request).toHaveBeenCalledTimes(3);
      expect(updateOrderShipmentState).toHaveBeenCalled();
    });

    it('should not retry on 400 errors', async () => {
      const error = new ShipXError('Bad request', 400, {});
      mockClient.request.mockRejectedValue(error);

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(mockClient.request).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ShipX polling failed for shipment'),
        expect.objectContaining({ orderId: mockOrder.id })
      );
    });

    it('should retry on network errors', async () => {
      const networkError = new Error('Network error');
      networkError.name = 'FetchError';

      mockClient.request
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockShipment);

      job.start();
      await new Promise(resolve => setTimeout(resolve, 300));
      job.stop();

      expect(mockClient.request).toHaveBeenCalledTimes(2);
      expect(updateOrderShipmentState).toHaveBeenCalled();
    });

    it('should stop retrying after max attempts', async () => {
      const error = new ShipXError('Server error', 503, {});
      mockClient.request.mockRejectedValue(error);

      job.start();
      await new Promise(resolve => setTimeout(resolve, 800));
      job.stop();

      expect(mockClient.request).toHaveBeenCalledTimes(3);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ShipX polling failed for shipment'),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      const error = new Error('Database error');
      (storage.listOrdersForShipmentPolling as jest.Mock).mockRejectedValue(error);

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ShipX polling initial run failed'),
        error
      );
    });

    it('should continue processing other shipments if one fails', async () => {
      const order2 = { ...mockOrder, id: 2, shipmentId: 'shipment-456' };
      (storage.listOrdersForShipmentPolling as jest.Mock).mockResolvedValue([mockOrder, order2]);

      mockClient.request
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce(mockShipment);

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(mockClient.request).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ShipX polling failed for shipment'),
        expect.objectContaining({ orderId: 1 })
      );
    });

    it('should handle ShipX API errors', async () => {
      const shipxError = new ShipXError('Shipment not found', 404, {});
      mockClient.request.mockRejectedValue(shipxError);

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ShipX polling failed for shipment'),
        expect.objectContaining({ shipmentId: mockOrder.shipmentId })
      );
    });
  });

  describe('Configuration', () => {
    it('should use correct polling interval', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      job.start();
      const expectedMs = JobConfig.SHIPX_POLL_INTERVAL_MINUTES * 60 * 1000;
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), expectedMs);
      setIntervalSpy.mockRestore();
    });

    it('should log environment information', async () => {
      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Fetching shipment from sandbox'),
        expect.objectContaining({ environment: 'sandbox' })
      );
    });
  });
});
