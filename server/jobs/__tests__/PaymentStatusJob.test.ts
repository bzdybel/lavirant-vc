import { newPaymentStatusJob } from '../PaymentStatusJob';
import { mapStripeStatus } from '../../services/StripeService';
import type { IStripeService } from '../../services/StripeService';
import type { PaymentStatusService } from '../../services/PaymentStatusService';
import { storage } from '../../storage';
import { AppConfig } from '../../config/appConfig';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../storage');
jest.mock('../../services/StripeService', () => ({
  mapStripeStatus: jest.fn().mockReturnValue('COMPLETED'),
}));
jest.mock('../../config/appConfig', () => ({
  AppConfig: {
    PAYMENT_STATUS_JOB_INTERVAL_MINUTES: 5,
    PAYMENT_PENDING_THRESHOLD_MINUTES: 60,
    PAYMENT_STATUS_JOB_DRY_RUN: false,
  },
}));
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('PaymentStatusJob', () => {
  let handle: () => Promise<void>;
  let mockStripeService: jest.Mocked<IStripeService>;
  let mockPaymentStatusService: jest.Mocked<PaymentStatusService>;

  const mockOrder = {
    id: 1,
    paymentIntentId: 'pi_test123',
    paymentPendingAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    productId: 'prod_123',
    status: 'PAYMENT_PENDING',
  };

  const mockPaymentIntent = {
    id: 'pi_test123',
    status: 'succeeded',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockStripeService = {
      retrievePaymentIntent: jest.fn().mockResolvedValue(mockPaymentIntent),
      createPaymentIntent: jest.fn(),
      updatePaymentIntentMetadata: jest.fn(),
      constructWebhookEvent: jest.fn(),
      getWebhookSecret: jest.fn(),
    } as any;

    mockPaymentStatusService = {
      applyPaymentStatusUpdate: jest.fn().mockResolvedValue(undefined),
    } as any;

    (mapStripeStatus as jest.Mock).mockReturnValue('COMPLETED');
    (storage.listOrdersByStatus as jest.Mock) = jest.fn().mockResolvedValue([mockOrder]);
    (storage.getProduct as jest.Mock) = jest.fn().mockResolvedValue({ id: 'prod_123', name: 'Test Product' });

    handle = newPaymentStatusJob(mockStripeService, mockPaymentStatusService).handle;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handle()', () => {
    it('lists pending orders on each run', async () => {
      await handle();
      expect(storage.listOrdersByStatus).toHaveBeenCalled();
    });

    it('retrieves payment intent for eligible orders', async () => {
      await handle();
      expect(mockStripeService.retrievePaymentIntent).toHaveBeenCalledWith(mockOrder.paymentIntentId);
    });

    it('applies payment status update for completed payments', async () => {
      await handle();
      expect(mockPaymentStatusService.applyPaymentStatusUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'COMPLETED' })
      );
    });

    it('skips orders without paymentIntentId', async () => {
      (storage.listOrdersByStatus as jest.Mock).mockResolvedValue([{ ...mockOrder, paymentIntentId: null }]);
      await handle();
      expect(mockStripeService.retrievePaymentIntent).not.toHaveBeenCalled();
    });

    it('skips orders newer than cutoff threshold', async () => {
      (storage.listOrdersByStatus as jest.Mock).mockResolvedValue([{
        ...mockOrder,
        paymentPendingAt: new Date().toISOString(),
      }]);
      await handle();
      expect(mockStripeService.retrievePaymentIntent).not.toHaveBeenCalled();
    });

    it('does not apply status update in dry run mode', async () => {
      jest.replaceProperty(AppConfig, 'PAYMENT_STATUS_JOB_DRY_RUN' as any, true);
      await handle();
      expect(mockPaymentStatusService.applyPaymentStatusUpdate).not.toHaveBeenCalled();
    });

    it('handles empty order list without error', async () => {
      (storage.listOrdersByStatus as jest.Mock).mockResolvedValue([]);
      await handle();
      expect(mockStripeService.retrievePaymentIntent).not.toHaveBeenCalled();
    });

    it('logs error and continues when an order fails', async () => {
      mockStripeService.retrievePaymentIntent.mockRejectedValue(new Error('Stripe error'));
      await handle();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('uses correct interval duration from AppConfig', () => {
      expect(AppConfig.PAYMENT_STATUS_JOB_INTERVAL_MINUTES).toBe(5);
    });
  });
});
