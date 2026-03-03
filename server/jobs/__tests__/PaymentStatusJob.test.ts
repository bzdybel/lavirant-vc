import { PaymentStatusJob } from '../PaymentStatusJob';
import { StripeService } from '../../services/StripeService';
import type { PaymentStatusService } from '../../services/PaymentStatusService';
import { storage } from '../../storage';
import { AppConfig } from '../../config/appConfig';

// Mock dependencies
jest.mock('../../storage');
jest.mock('../../services/StripeService');
jest.mock('../../config/appConfig', () => ({
  AppConfig: {
    PAYMENT_STATUS_JOB_INTERVAL_MINUTES: 5,
    PAYMENT_PENDING_THRESHOLD_MINUTES: 60,
    PAYMENT_STATUS_JOB_DRY_RUN: false,
  },
}));

describe('PaymentStatusJob', () => {
  let job: PaymentStatusJob;
  let mockStripeService: jest.Mocked<StripeService>;
  let mockPaymentStatusService: jest.Mocked<PaymentStatusService>;
  let consoleSpy: jest.SpyInstance;

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
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    mockStripeService = {
      isAvailable: jest.fn().mockReturnValue(true),
      retrievePaymentIntent: jest.fn().mockResolvedValue(mockPaymentIntent),
    } as any;

    mockPaymentStatusService = {
      applyPaymentStatusUpdate: jest.fn().mockResolvedValue(undefined),
    } as any;

    (StripeService.mapStripeStatus as jest.Mock) = jest.fn().mockReturnValue('COMPLETED');
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
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Payment status job skipped'));
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

  describe('Configuration', () => {
    it('should use correct interval duration', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      job.start();
      const expectedMs = AppConfig.PAYMENT_STATUS_JOB_INTERVAL_MINUTES * 60 * 1000;
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), expectedMs);
      setIntervalSpy.mockRestore();
    });

    it('should check Stripe availability before starting', () => {
      job.start();
      expect(mockStripeService.isAvailable).toHaveBeenCalled();
    });
  });
});
