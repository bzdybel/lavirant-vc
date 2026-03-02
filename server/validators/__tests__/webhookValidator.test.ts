import { parseWebhookPayload } from '../webhookValidator';
import { PaymentWebhookStatus } from '../../constants/paymentStatus';

describe('webhookValidator', () => {
  describe('parseWebhookPayload', () => {
    describe('Stripe format detection', () => {
      it('should parse Stripe payment_intent.succeeded webhook', () => {
        const payload = {
          id: 'evt_test_123',
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test_456',
              status: 'succeeded',
              payment_intent: 'pi_test_456',
              metadata: {
                orderId: '12345',
              },
            },
          },
        };

        const result = parseWebhookPayload(payload);
        expect(result).toEqual({
          eventId: 'evt_test_123',
          status: PaymentWebhookStatus.COMPLETED,
          paymentReference: 'pi_test_456',
          orderId: 12345,
          provider: 'stripe',
        });
      });

      it('should parse Stripe webhook with object id as fallback', () => {
        const payload = {
          id: 'evt_test_789',
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test_999',
              status: 'succeeded',
              metadata: {
                orderId: '99999',
              },
            },
          },
        };

        const result = parseWebhookPayload(payload);
        expect(result.paymentReference).toBe('pi_test_999');
        expect(result.provider).toBe('stripe');
      });

      it('should parse Stripe webhook with charge object', () => {
        const payload = {
          id: 'evt_test_charge',
          type: 'charge.succeeded',
          data: {
            object: {
              id: 'ch_test_123',
              payment_intent: 'pi_test_abc',
              metadata: {
                orderId: '54321',
              },
            },
          },
        };

        const result = parseWebhookPayload(payload);
        expect(result.paymentReference).toBe('pi_test_abc');
        expect(result.provider).toBe('stripe');
      });

      it('should return null for invalid Stripe format and fallback to generic', () => {
        const payload = {
          type: 'payment_intent.succeeded',
          // Missing data.object
        };

        const result = parseWebhookPayload(payload);
        // Falls back to generic parsing with UNKNOWN status
        expect(result.provider).toEqual('unknown');
      });

      it('should set UNKNOWN status for non-succeeded Stripe format', () => {
        const payload = {
          id: 'evt_123',
          type: 'payment_intent.succeeded',
          data: {
            object: {
              status: 'processing', // Not 'succeeded'
              id: 'pi_123',
            },
          },
        };

        const result = parseWebhookPayload(payload);
        // Still recognizes as Stripe but status is UNKNOWN
        expect(result.provider).toEqual('stripe');
        expect(result.status).toEqual(PaymentWebhookStatus.UNKNOWN);
      });
    });

    describe('Generic format - status normalization', () => {
      it('should normalize completed status variations', () => {
        const completedStatuses = ['COMPLETED', 'SUCCESS', 'PAID', 'SUCCEEDED'];

        completedStatuses.forEach((rawStatus) => {
          const payload = {
            status: rawStatus,
            paymentReference: 'ref_123',
            orderId: '100',
          };

          const result = parseWebhookPayload(payload);
          expect(result.status).toBe(PaymentWebhookStatus.COMPLETED);
        });
      });

      it('should normalize completed status case-insensitively', () => {
        const payload = {
          status: 'completed',
          paymentReference: 'ref_123',
        };

        const result = parseWebhookPayload(payload);
        expect(result.status).toBe(PaymentWebhookStatus.COMPLETED);
      });

      it('should normalize pending status variations', () => {
        const pendingStatuses = ['PENDING', 'PROCESSING'];

        pendingStatuses.forEach((rawStatus) => {
          const payload = {
            status: rawStatus,
            paymentReference: 'ref_123',
          };

          const result = parseWebhookPayload(payload);
          expect(result.status).toBe(PaymentWebhookStatus.PENDING);
        });
      });

      it('should normalize canceled status variations', () => {
        const canceledStatuses = ['CANCELED', 'CANCELLED'];

        canceledStatuses.forEach((rawStatus) => {
          const payload = {
            status: rawStatus,
            paymentReference: 'ref_123',
          };

          const result = parseWebhookPayload(payload);
          expect(result.status).toBe(PaymentWebhookStatus.CANCELED);
        });
      });

      it('should normalize failed status variations', () => {
        const failedStatuses = ['FAILED', 'ERROR'];

        failedStatuses.forEach((rawStatus) => {
          const payload = {
            status: rawStatus,
            paymentReference: 'ref_123',
          };

          const result = parseWebhookPayload(payload);
          expect(result.status).toBe(PaymentWebhookStatus.FAILED);
        });
      });

      it('should default to UNKNOWN for unrecognized status', () => {
        const payload = {
          status: 'unknown_status_xyz',
          paymentReference: 'ref_123',
        };

        const result = parseWebhookPayload(payload);
        expect(result.status).toBe(PaymentWebhookStatus.UNKNOWN);
      });

      it('should default to UNKNOWN when status is missing', () => {
        const payload = {
          paymentReference: 'ref_123',
          orderId: '100',
        };

        const result = parseWebhookPayload(payload);
        expect(result.status).toBe(PaymentWebhookStatus.UNKNOWN);
      });
    });

    describe('Generic format - field extraction', () => {
      it('should extract eventId from various field names', () => {
        const testCases = [
          { eventId: 'id_1' },
          { event_id: 'id_2' },
          { id: 'id_3' },
        ];

        testCases.forEach((payload,  ) => {
          const result = parseWebhookPayload({
            ...payload,
            status: 'COMPLETED',
          });
          expect(result.eventId).toBeDefined();
        });
      });

      it('should extract paymentReference from multiple field names', () => {
        const testCases = [
          { paymentReference: 'ref_1' },
          { paymentIntentId: 'ref_2' },
          { paymentIntent: 'ref_3' },
          { orderId: 'ref_4' },
          { extOrderId: 'ref_5' },
        ];

        testCases.forEach(async (payload) => {
          const result = parseWebhookPayload({
            ...payload,
            status: 'COMPLETED',
          });
          expect(result.paymentReference).toBeDefined();
        });
      });

      it('should convert paymentReference to string', () => {
        const payload = {
          status: 'COMPLETED',
          paymentReference: 123456,
        };

        const result = parseWebhookPayload(payload);
        expect(result.paymentReference).toBe('123456');
        expect(typeof result.paymentReference).toBe('string');
      });

      it('should extract orderId from orderId field', () => {
        const payload = {
          status: 'COMPLETED',
          orderId: '999',
          paymentReference: 'ref_1',
        };

        const result = parseWebhookPayload(payload);
        expect(result.orderId).toBe(999);
      });

      it('should extract orderId from extOrderId as fallback', () => {
        const payload = {
          status: 'COMPLETED',
          extOrderId: '555',
          paymentReference: 'ref_1',
        };

        const result = parseWebhookPayload(payload);
        expect(result.orderId).toBe(555);
      });

      it('should convert orderId to number', () => {
        const payload = {
          status: 'COMPLETED',
          orderId: '12345',
          paymentReference: 'ref_1',
        };

        const result = parseWebhookPayload(payload);
        expect(result.orderId).toBe(12345);
        expect(typeof result.orderId).toBe('number');
      });

      it('should return null for invalid orderId', () => {
        const payload = {
          status: 'COMPLETED',
          orderId: 'not_a_number',
          paymentReference: 'ref_1',
        };

        const result = parseWebhookPayload(payload);
        expect(result.orderId).toBeNull();
      });

      it('should extract provider from payload', () => {
        const payload = {
          status: 'COMPLETED',
          provider: 'paypal',
          paymentReference: 'ref_1',
        };

        const result = parseWebhookPayload(payload);
        expect(result.provider).toBe('paypal');
      });

      it('should default provider to unknown', () => {
        const payload = {
          status: 'COMPLETED',
          paymentReference: 'ref_1',
        };

        const result = parseWebhookPayload(payload);
        expect(result.provider).toBe('unknown');
      });

      it('should handle null and undefined fields gracefully', () => {
        const payload = {
          status: 'COMPLETED',
          eventId: null,
          paymentReference: undefined,
          orderId: null,
        };

        const result = parseWebhookPayload(payload);
        expect(result.eventId).toBeNull();
        expect(result.paymentReference).toBeNull();
        expect(result.orderId).toBeNull();
      });
    });

    describe('Edge cases and robustness', () => {
      it('should parse minimal valid payload', () => {
        const payload = {
          status: 'COMPLETED',
        };

        const result = parseWebhookPayload(payload);
        expect(result).toEqual({
          eventId: null,
          status: PaymentWebhookStatus.COMPLETED,
          paymentReference: null,
          orderId: null,
          provider: 'unknown',
        });
      });

      it('should handle empty object payload', () => {
        const result = parseWebhookPayload({});
        expect(result.status).toBe(PaymentWebhookStatus.UNKNOWN);
        expect(result.provider).toBe('unknown');
      });

      it('should handle null payload gracefully', () => {
        const result = parseWebhookPayload(null);
        expect(result).toBeDefined();
        expect(result.status).toBe(PaymentWebhookStatus.UNKNOWN);
      });

      it('should handle undefined payload gracefully', () => {
        const result = parseWebhookPayload(undefined);
        expect(result).toBeDefined();
        expect(result.status).toBe(PaymentWebhookStatus.UNKNOWN);
      });

      it('should preserve zero values for numeric fields', () => {
        const payload = {
          status: 'COMPLETED',
          orderId: '0',
          paymentReference: 'ref_1',
        };

        const result = parseWebhookPayload(payload);
        expect(result.orderId).toBe(0);
      });

      it('should handle very large order IDs', () => {
        const payload = {
          status: 'COMPLETED',
          orderId: '99999999999999',
          paymentReference: 'ref_1',
        };

        const result = parseWebhookPayload(payload);
        expect(result.orderId).toBe(99999999999999);
      });

      it('should handle special characters in payment reference', () => {
        const payload = {
          status: 'COMPLETED',
          paymentReference: 'ref_!@#$%^&*()-=_+[]{}|;:,.<>?/',
        };

        const result = parseWebhookPayload(payload);
        expect(result.paymentReference).toBe('ref_!@#$%^&*()-=_+[]{}|;:,.<>?/');
      });

      it('should prioritize paymentReference over paymentIntentId', () => {
        const payload = {
          status: 'COMPLETED',
          paymentReference: 'primary',
          paymentIntentId: 'secondary',
        };

        const result = parseWebhookPayload(payload);
        expect(result.paymentReference).toBe('primary');
      });

      it('should prioritize paymentIntentId over paymentIntent', () => {
        const payload = {
          status: 'COMPLETED',
          paymentIntentId: 'primary',
          paymentIntent: 'secondary',
        };

        const result = parseWebhookPayload(payload);
        expect(result.paymentReference).toBe('primary');
      });

      it('should prioritize paymentIntent over orderId', () => {
        const payload = {
          status: 'COMPLETED',
          paymentIntent: 'payment_ref',
          orderId: '123',
        };

        const result = parseWebhookPayload(payload);
        expect(result.paymentReference).toBe('payment_ref');
      });

      it('should handle status field with numbers', () => {
        const payload = {
          status: 123, // numeric status
          paymentReference: 'ref_1',
        };

        const result = parseWebhookPayload(payload);
        expect(result.status).toBe(PaymentWebhookStatus.UNKNOWN);
      });

      it('should handle deeply nested payload structures', () => {
        const payload = {
          status: 'COMPLETED',
          nested: {
            deeply: {
              nested: {
                value: 'ignored',
              },
            },
          },
          paymentReference: 'ref_1',
        };

        const result = parseWebhookPayload(payload);
        expect(result.paymentReference).toBe('ref_1');
        expect(result.status).toBe(PaymentWebhookStatus.COMPLETED);
      });
    });

    describe('Real-world webhook scenarios', () => {
      it('should parse Stripe charge.succeeded webhook', () => {
        const payload = {
          id: 'evt_1Ith8S2eZvKYlo2C',
          object: 'event',
          api_version: '2020-08-27',
          type: 'charge.succeeded',
          data: {
            object: {
              id: 'ch_1Ith8R2eZvKYlo2C',
              payment_intent: 'pi_1Ith8Q2eZvKYlo2C',
              metadata: {
                orderId: '54321',
              },
            },
          },
        };

        const result = parseWebhookPayload(payload);
        expect(result.provider).toBe('stripe');
        expect(result.status).toBe(PaymentWebhookStatus.UNKNOWN);
        expect(result.orderId).toBe(54321);
      });

      it('should parse generic PayPal-style webhook', () => {
        const payload = {
          event_id: 'WH-1234567890',
          paymentStatus: 'COMPLETED',
          paymentIntentId: 'PAYID-123456',
          extOrderId: '9999',
          provider: 'paypal',
        };

        const result = parseWebhookPayload(payload);
        expect(result.provider).toBe('paypal');
        expect(result.status).toBe(PaymentWebhookStatus.COMPLETED);
        expect(result.orderId).toBe(9999);
      });

      it('should parse custom payment provider webhook', () => {
        const payload = {
          id: 'webhook-123',
          orderStatus: 'PAID',
          reference: 'custom-ref-123',
          orderId: '7777',
        };

        const result = parseWebhookPayload(payload);
        expect(result.eventId).toBe('webhook-123');
        expect(result.status).toBe(PaymentWebhookStatus.COMPLETED);
        expect(result.orderId).toBe(7777);
      });

      it('should parse refund/failed payment webhook', () => {
        const payload = {
          id: 'webhook-refund',
          status: 'REFUNDED',
          paymentReference: 'ref-refund-123',
          orderId: '5555',
        };

        const result = parseWebhookPayload(payload);
        expect(result.status).toBe(PaymentWebhookStatus.UNKNOWN); // REFUNDED not in any category
        expect(result.orderId).toBe(5555);
      });
    });
  });
});
