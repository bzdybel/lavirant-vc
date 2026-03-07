import { ShipXPollingJob } from '../ShipXPollingJob';
import { getShipXClient, ShipXError } from '../../../lib/inpost/shipxClient';
import { storage } from '../../storage';
import { updateOrderShipmentState } from '../../inpost/shipxOrderUpdater';
import { AppConfig } from '../../config/appConfig';
import { logger } from '../../utils/logger';

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
    SHIPX_CONSECUTIVE_FAILURE_ALERT_THRESHOLD: 3,
    SHIPX_INITIAL_TRIGGER_RETRY_DELAY_MS: 50,
    SHIPX_ORDER_MAX_POLL_FAILURES: 5,
  },
}));
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// p-retry is ESM-only; mock it with a CJS-compatible implementation that
// preserves retry/shouldRetry semantics so retry tests remain meaningful.
jest.mock('p-retry', () => ({
  __esModule: true,
  default: jest.fn(async (fn: any, opts: any = {}) => {
    const retries: number = opts.retries ?? 0;
    const shouldRetry: (e: unknown) => boolean = opts.shouldRetry ?? (() => true);
    const delay: number = opts.minTimeout ?? 0;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (attempt >= retries || !shouldRetry(err)) throw err;
        if (delay > 0) await new Promise(r => setTimeout(r, delay));
      }
    }
  }),
}));

describe('ShipXPollingJob', () => {
  let job: ShipXPollingJob;
  let mockClient: any;

  const mockOrder = {
    id: 1,
    shipmentId: 'shipment-123',
    shipmentStatus: 'created',
    trackingNumber: null,
    labelGenerated: false,
    shipmentPollFailures: 0,
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
    (AppConfig as any).INPOST_API_SHIPX = 'test-api-key';
    (AppConfig as any).INPOST_SHIPX_ENV = 'sandbox';

    jest.clearAllMocks();

    mockClient = {
      request: jest.fn().mockResolvedValue(mockShipment),
      requestBinary: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
    };

    (getShipXClient as jest.Mock).mockReturnValue(mockClient);
    (storage.listOrdersForShipmentPolling as jest.Mock).mockResolvedValue([mockOrder]);
    (storage.getShipmentByOrderId as jest.Mock).mockResolvedValue(mockExistingShipment);
    (storage.updateShipment as jest.Mock).mockResolvedValue(undefined);
    (storage.updateOrder as jest.Mock).mockResolvedValue(undefined);
    (updateOrderShipmentState as jest.Mock).mockResolvedValue({ ...mockOrder, shipmentStatus: 'confirmed' });

    job = new ShipXPollingJob();
  });

  afterEach(() => {
    if (job) job.stop();
  });

  describe('Job Lifecycle', () => {
    it('should not start when ShipX API is not configured', () => {
      (AppConfig as any).INPOST_API_SHIPX = '';
      job.start();
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('ShipX polling skipped') })
      );
    });

    it('should start and process shipments on initial trigger', async () => {
      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(mockClient.request).toHaveBeenCalled();
    });

    it('should stop without throwing', () => {
      job.start();
      expect(() => job.stop()).not.toThrow();
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

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Skipping mock shipment id'),
          shipmentId: 'MOCK-12345',
        })
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
      mockClient.requestBinary.mockRejectedValue(new Error('Label generation failed'));

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Failed to generate label'),
          orderId: mockOrder.id,
        })
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
      mockClient.request.mockRejectedValue(new ShipXError('Bad request', 400, {}));

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(mockClient.request).toHaveBeenCalledTimes(1);
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
      mockClient.request.mockRejectedValue(new ShipXError('Server error', 503, {}));

      job.start();
      await new Promise(resolve => setTimeout(resolve, 800));
      job.stop();

      expect(mockClient.request).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle DB errors in runJob gracefully', async () => {
      const error = new Error('Database error');
      (storage.listOrdersForShipmentPolling as jest.Mock).mockRejectedValue(error);

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      // runJob() rejects → cron callback .catch() fires → logs "ShipX polling failed"
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'ShipX polling failed', error })
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
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'ShipX polling failed for shipment',
          orderId: 1,
        })
      );
    });

    it('should handle ShipX API errors', async () => {
      mockClient.request.mockRejectedValue(new ShipXError('Shipment not found', 404, {}));

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'ShipX polling failed for shipment',
          shipmentId: mockOrder.shipmentId,
        })
      );
    });
  });

  describe('Failure Tracking', () => {
    it('should increment shipmentPollFailures in DB on poll failure', async () => {
      mockClient.request.mockRejectedValue(new ShipXError('Not found', 404, {}));

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(storage.updateOrder).toHaveBeenCalledWith(mockOrder.id, { shipmentPollFailures: 1 });
    });

    it('should accumulate failures on top of existing DB failure count', async () => {
      const orderWith2Failures = { ...mockOrder, shipmentPollFailures: 2 };
      (storage.listOrdersForShipmentPolling as jest.Mock).mockResolvedValue([orderWith2Failures]);
      mockClient.request.mockRejectedValue(new ShipXError('Not found', 404, {}));

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(storage.updateOrder).toHaveBeenCalledWith(orderWith2Failures.id, { shipmentPollFailures: 3 });
    });

    it('should mark order as polling_failed when failures reach SHIPX_ORDER_MAX_POLL_FAILURES', async () => {
      const orderAtMaxMinus1 = { ...mockOrder, shipmentPollFailures: 4 }; // 4 + 1 = 5 = max
      (storage.listOrdersForShipmentPolling as jest.Mock).mockResolvedValue([orderAtMaxMinus1]);
      mockClient.request.mockRejectedValue(new ShipXError('Not found', 404, {}));

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(updateOrderShipmentState).toHaveBeenCalledWith(
        orderAtMaxMinus1,
        { shipmentStatus: 'polling_failed' }
      );
    });

    it('should log CRITICAL when order reaches max poll failures', async () => {
      const orderAtMaxMinus1 = { ...mockOrder, shipmentPollFailures: 4 };
      (storage.listOrdersForShipmentPolling as jest.Mock).mockResolvedValue([orderAtMaxMinus1]);
      mockClient.request.mockRejectedValue(new ShipXError('Not found', 404, {}));

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('[CRITICAL]'),
          orderId: orderAtMaxMinus1.id,
          failures: 5,
          maxFailures: 5,
        })
      );
    });

    it('should not increment poll failure count in DB after marking as polling_failed', async () => {
      const orderAtMaxMinus1 = { ...mockOrder, shipmentPollFailures: 4 };
      (storage.listOrdersForShipmentPolling as jest.Mock).mockResolvedValue([orderAtMaxMinus1]);
      mockClient.request.mockRejectedValue(new ShipXError('Not found', 404, {}));

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(storage.updateOrder).not.toHaveBeenCalledWith(
        orderAtMaxMinus1.id,
        expect.objectContaining({ shipmentPollFailures: expect.any(Number) })
      );
    });

    it('should reset shipmentPollFailures to 0 in DB after a successful poll', async () => {
      const orderWithPriorFailures = { ...mockOrder, shipmentPollFailures: 3 };
      (storage.listOrdersForShipmentPolling as jest.Mock).mockResolvedValue([orderWithPriorFailures]);

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(storage.updateOrder).toHaveBeenCalledWith(orderWithPriorFailures.id, { shipmentPollFailures: 0 });
    });

    it('should not call updateOrder for reset when shipmentPollFailures is already 0', async () => {
      // mockOrder has shipmentPollFailures: 0 — no reset needed on success
      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(storage.updateOrder).not.toHaveBeenCalledWith(
        mockOrder.id,
        { shipmentPollFailures: 0 }
      );
    });

    it('should handle failure to write polling_failed status gracefully', async () => {
      const orderAtMaxMinus1 = { ...mockOrder, shipmentPollFailures: 4 };
      (storage.listOrdersForShipmentPolling as jest.Mock).mockResolvedValue([orderAtMaxMinus1]);
      mockClient.request.mockRejectedValue(new ShipXError('Not found', 404, {}));
      (updateOrderShipmentState as jest.Mock).mockRejectedValue(new Error('DB write failed'));

      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to mark order as polling_failed',
          orderId: orderAtMaxMinus1.id,
        })
      );
    });
  });

  describe('Configuration', () => {
    it('should log environment information when processing shipments', async () => {
      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Fetching shipment from sandbox'),
          environment: 'sandbox',
        })
      );
    });
  });
});
