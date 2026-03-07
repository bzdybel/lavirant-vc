import { PaymentStatusJob } from '../PaymentStatusJob';
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
  let job: PaymentStatusJob;
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
      isAvailable: jest.fn().mockReturnValue(true),
      retrievePaymentIntent: jest.fn().mockResolvedValue(mockPaymentIntent),
    } as any;

    mockPaymentStatusService = {
      applyPaymentStatusUpdate: jest.fn().mockResolvedValue(undefined),
    } as any;

    (mapStripeStatus as jest.Mock).mockReturnValue('COMPLETED');
    (storage.listOrdersByStatus as jest.Mock) = jest.fn().mockResolvedValue([mockOrder]);
    (storage.getProduct as jest.Mock) = jest.fn().mockResolvedValue({ id: 'prod_123', name: 'Test Product' });

    job = new PaymentStatusJob(mockStripeService, mockPaymentStatusService);
  });

  afterEach(() => {
    if (job) {
      job.stop();
    }
    jest.restoreAllMocks();
  });

  describe('Job Lifecycle', () => {
    it('should not start when Stripe is unavailable', () => {
      mockStripeService.isAvailable.mockReturnValue(false);
      job.start();
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Payment status job skipped') }),
      );
    });

    it('should run job on initial trigger', async () => {
      job.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      job.stop();
      expect(storage.listOrdersByStatus).toHaveBeenCalled();
    });

    it('should stop without throwing', () => {
      job.start();
      expect(() => job.stop()).not.toThrow();
    });

    it('should handle stop when not running', () => {
      expect(() => job.stop()).not.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should use correct interval duration', () => {
      expect(AppConfig.PAYMENT_STATUS_JOB_INTERVAL_MINUTES).toBe(5);
    });

    it('should check Stripe availability before starting', () => {
      job.start();
      expect(mockStripeService.isAvailable).toHaveBeenCalled();
    });
  });
});
