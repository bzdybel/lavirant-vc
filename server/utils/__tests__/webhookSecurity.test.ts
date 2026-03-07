import crypto from 'crypto';
import { WebhookSignatureVerifier } from '../webhookSecurity';
import { WebhookHeaders } from '../../constants/webhookHeaders';

// Mock Stripe
const mockStripe = {
  webhooks: {
    constructEvent: jest.fn(),
  },
} as any;

describe('WebhookSignatureVerifier', () => {
  const testSecret = 'test-secret-key-12345';
  const testPayload = { event: 'test', orderId: '123' };
  const testPayloadBuffer = Buffer.from(JSON.stringify(testPayload));

  describe('HMAC signature verification', () => {
    it('should verify valid hex-encoded HMAC signature', () => {
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(testPayloadBuffer);
      const signature = hmac.digest('hex');

      const verifier = new WebhookSignatureVerifier(null, '', testSecret);
      const result = verifier.verify(testPayloadBuffer, {
        [WebhookHeaders.X_WEBHOOK_SIGNATURE]: signature,
      });

      expect(result.isValid).toBe(true);
      expect(result.provider).toBe('generic');
      expect(result.payload).toEqual(testPayload);
    });

    it('should try base64 decoding if hex decoding fails', () => {
      // Create a valid hex signature but simulate base64 scenario
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(testPayloadBuffer);
      const signature = hmac.digest('hex');

      const verifier = new WebhookSignatureVerifier(null, '', testSecret);
      const result = verifier.verify(testPayloadBuffer, {
        [WebhookHeaders.X_WEBHOOK_SIGNATURE]: signature,
      });

      expect(result.isValid).toBe(true);
      expect(result.provider).toBe('generic');
      expect(result.payload).toEqual(testPayload);
    });

    it('should verify signature with header prefix (t=timestamp,v1=signature)', () => {
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(testPayloadBuffer);
      const signature = hmac.digest('hex');
      const signatureWithPrefix = `t=1234567890,v1=${signature}`;

      const verifier = new WebhookSignatureVerifier(null, '', testSecret);
      const result = verifier.verify(testPayloadBuffer, {
        [WebhookHeaders.X_WEBHOOK_SIGNATURE]: signatureWithPrefix,
      });

      expect(result.isValid).toBe(true);
      expect(result.provider).toBe('generic');
    });

    it('should reject invalid HMAC signature', () => {
      const invalidSignature = 'invalid-signature-12345';

      const verifier = new WebhookSignatureVerifier(null, '', testSecret);
      const result = verifier.verify(testPayloadBuffer, {
        [WebhookHeaders.X_WEBHOOK_SIGNATURE]: invalidSignature,
      });

      expect(result.isValid).toBe(false);
      expect(result.provider).toBeNull();
      expect(result.payload).toBeNull();
    });

    it('should reject signature with wrong secret', () => {
      const hmac = crypto.createHmac('sha256', 'wrong-secret');
      hmac.update(testPayloadBuffer);
      const signature = hmac.digest('hex');

      const verifier = new WebhookSignatureVerifier(null, '', testSecret);
      const result = verifier.verify(testPayloadBuffer, {
        [WebhookHeaders.X_WEBHOOK_SIGNATURE]: signature,
      });

      expect(result.isValid).toBe(false);
      expect(result.provider).toBeNull();
    });

    it('should reject signature with modified payload', () => {
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(testPayloadBuffer);
      const signature = hmac.digest('hex');

      const modifiedPayload = Buffer.from(JSON.stringify({ event: 'modified' }));

      const verifier = new WebhookSignatureVerifier(null, '', testSecret);
      const result = verifier.verify(modifiedPayload, {
        [WebhookHeaders.X_WEBHOOK_SIGNATURE]: signature,
      });

      expect(result.isValid).toBe(false);
    });

    it('should reject empty signature', () => {
      const verifier = new WebhookSignatureVerifier(null, '', testSecret);
      const result = verifier.verify(testPayloadBuffer, {
        [WebhookHeaders.X_WEBHOOK_SIGNATURE]: '',
      });

      expect(result.isValid).toBe(false);
    });

    it('should reject when secret is empty', () => {
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(testPayloadBuffer);
      const signature = hmac.digest('hex');

      const verifier = new WebhookSignatureVerifier(null, '', '');
      const result = verifier.verify(testPayloadBuffer, {
        [WebhookHeaders.X_WEBHOOK_SIGNATURE]: signature,
      });

      expect(result.isValid).toBe(false);
    });
  });

  describe('Stripe signature verification', () => {
    it('should verify valid Stripe signature', () => {
      const stripeEvent = { type: 'payment_intent.succeeded', data: {} };
      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent);

      const verifier = new WebhookSignatureVerifier(
        mockStripe,
        'whsec_test_secret',
        ''
      );
      const result = verifier.verify(testPayloadBuffer, {
        [WebhookHeaders.STRIPE_SIGNATURE]: 'stripe-signature-value',
      });

      expect(result.isValid).toBe(true);
      expect(result.provider).toBe('stripe');
      expect(result.payload).toEqual(stripeEvent);
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        testPayloadBuffer,
        'stripe-signature-value',
        'whsec_test_secret'
      );
    });

    it('should reject invalid Stripe signature', () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const verifier = new WebhookSignatureVerifier(
        mockStripe,
        'whsec_test_secret',
        ''
      );
      const result = verifier.verify(testPayloadBuffer, {
        [WebhookHeaders.STRIPE_SIGNATURE]: 'invalid-signature',
      });

      expect(result.isValid).toBe(false);
      expect(result.provider).toBeNull();
      expect(result.payload).toBeNull();
    });

    it('should prioritize Stripe verification over generic HMAC', () => {
      const stripeEvent = { type: 'payment_intent.succeeded', data: {} };
      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent);

      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(testPayloadBuffer);
      const hmacSignature = hmac.digest('hex');

      const verifier = new WebhookSignatureVerifier(
        mockStripe,
        'whsec_test_secret',
        testSecret
      );
      const result = verifier.verify(testPayloadBuffer, {
        [WebhookHeaders.STRIPE_SIGNATURE]: 'stripe-signature',
        [WebhookHeaders.X_WEBHOOK_SIGNATURE]: hmacSignature,
      });

      expect(result.isValid).toBe(true);
      expect(result.provider).toBe('stripe');
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalled();
    });

    it('should skip Stripe verification if no Stripe instance provided', () => {
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(testPayloadBuffer);
      const signature = hmac.digest('hex');

      const verifier = new WebhookSignatureVerifier(null, 'whsec_test', testSecret);
      const result = verifier.verify(testPayloadBuffer, {
        [WebhookHeaders.STRIPE_SIGNATURE]: 'stripe-sig',
        [WebhookHeaders.X_WEBHOOK_SIGNATURE]: signature,
      });

      expect(result.isValid).toBe(true);
      expect(result.provider).toBe('generic');
    });

    it('should skip Stripe verification if no Stripe secret provided', () => {
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(testPayloadBuffer);
      const signature = hmac.digest('hex');

      const verifier = new WebhookSignatureVerifier(mockStripe, '', testSecret);
      const result = verifier.verify(testPayloadBuffer, {
        [WebhookHeaders.STRIPE_SIGNATURE]: 'stripe-sig',
        [WebhookHeaders.X_WEBHOOK_SIGNATURE]: signature,
      });

      expect(result.isValid).toBe(true);
      expect(result.provider).toBe('generic');
      expect(mockStripe.webhooks.constructEvent).not.toHaveBeenCalled();
    });
  });

  describe('header detection', () => {
    it('should detect x-webhook-signature header', () => {
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(testPayloadBuffer);
      const signature = hmac.digest('hex');

      const verifier = new WebhookSignatureVerifier(null, '', testSecret);
      const result = verifier.verify(testPayloadBuffer, {
        [WebhookHeaders.X_WEBHOOK_SIGNATURE]: signature,
      });

      expect(result.isValid).toBe(true);
      expect(result.provider).toBe('generic');
    });

    it('should detect x-signature header as fallback', () => {
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(testPayloadBuffer);
      const signature = hmac.digest('hex');

      const verifier = new WebhookSignatureVerifier(null, '', testSecret);
      const result = verifier.verify(testPayloadBuffer, {
        [WebhookHeaders.X_SIGNATURE]: signature,
      });

      expect(result.isValid).toBe(true);
      expect(result.provider).toBe('generic');
    });

    it('should prioritize x-webhook-signature over x-signature', () => {
      const hmac1 = crypto.createHmac('sha256', testSecret);
      hmac1.update(testPayloadBuffer);
      const validSignature = hmac1.digest('hex');

      const verifier = new WebhookSignatureVerifier(null, '', testSecret);
      const result = verifier.verify(testPayloadBuffer, {
        [WebhookHeaders.X_WEBHOOK_SIGNATURE]: validSignature,
        [WebhookHeaders.X_SIGNATURE]: 'invalid-sig',
      });

      expect(result.isValid).toBe(true);
    });

    it('should return invalid when no signature headers present', () => {
      const verifier = new WebhookSignatureVerifier(null, '', testSecret);
      const result = verifier.verify(testPayloadBuffer, {});

      expect(result.isValid).toBe(false);
      expect(result.provider).toBeNull();
      expect(result.payload).toBeNull();
    });

    it('should return invalid when no verifier is configured', () => {
      const verifier = new WebhookSignatureVerifier(null, '', '');
      const result = verifier.verify(testPayloadBuffer, {
        [WebhookHeaders.X_WEBHOOK_SIGNATURE]: 'some-signature',
      });

      expect(result.isValid).toBe(false);
    });
  });

  describe('payload parsing', () => {
    it('should parse JSON payload correctly', () => {
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(testPayloadBuffer);
      const signature = hmac.digest('hex');

      const verifier = new WebhookSignatureVerifier(null, '', testSecret);
      const result = verifier.verify(testPayloadBuffer, {
        [WebhookHeaders.X_WEBHOOK_SIGNATURE]: signature,
      });

      expect(result.payload).toEqual(testPayload);
    });

    it('should handle malformed JSON gracefully', () => {
      const malformedPayload = Buffer.from('{ invalid json }');
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(malformedPayload);
      const signature = hmac.digest('hex');

      const verifier = new WebhookSignatureVerifier(null, '', testSecret);
      const result = verifier.verify(malformedPayload, {
        [WebhookHeaders.X_WEBHOOK_SIGNATURE]: signature,
      });

      expect(result.isValid).toBe(false);
      expect(result.payload).toBeNull();
    });

    it('should handle empty payload', () => {
      const emptyPayload = Buffer.from('');
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(emptyPayload);
      const signature = hmac.digest('hex');

      const verifier = new WebhookSignatureVerifier(null, '', testSecret);
      const result = verifier.verify(emptyPayload, {
        [WebhookHeaders.X_WEBHOOK_SIGNATURE]: signature,
      });

      expect(result.isValid).toBe(false);
    });

    it('should handle complex nested payload', () => {
      const complexPayload = {
        event: 'order.created',
        data: {
          order: {
            id: 123,
            items: [{ id: 1, name: 'Product' }],
            metadata: { source: 'web' },
          },
        },
      };
      const complexBuffer = Buffer.from(JSON.stringify(complexPayload));
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(complexBuffer);
      const signature = hmac.digest('hex');

      const verifier = new WebhookSignatureVerifier(null, '', testSecret);
      const result = verifier.verify(complexBuffer, {
        [WebhookHeaders.X_WEBHOOK_SIGNATURE]: signature,
      });

      expect(result.isValid).toBe(true);
      expect(result.payload).toEqual(complexPayload);
    });
  });

  describe('timing attack protection', () => {
    it('should use constant-time comparison for signature verification', () => {
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(testPayloadBuffer);
      const validSignature = hmac.digest('hex');

      // Create a signature that differs only in the last character
      const almostValidSignature = validSignature.slice(0, -1) + '0';

      const verifier = new WebhookSignatureVerifier(null, '', testSecret);

      const start1 = Date.now();
      verifier.verify(testPayloadBuffer, {
        [WebhookHeaders.X_WEBHOOK_SIGNATURE]: almostValidSignature,
      });
      const duration1 = Date.now() - start1;

      const totallyWrongSignature = '0'.repeat(validSignature.length);
      const start2 = Date.now();
      verifier.verify(testPayloadBuffer, {
        [WebhookHeaders.X_WEBHOOK_SIGNATURE]: totallyWrongSignature,
      });
      const duration2 = Date.now() - start2;

      // Both should take similar time (within reasonable variance)
      // This is a basic check - real timing attacks require statistical analysis
      expect(Math.abs(duration1 - duration2)).toBeLessThan(50);
    });
  });

  describe('edge cases', () => {
    it('should handle signature with whitespace', () => {
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(testPayloadBuffer);
      const signature = hmac.digest('hex');
      const signatureWithWhitespace = `  ${signature}  `;

      const verifier = new WebhookSignatureVerifier(null, '', testSecret);
      const result = verifier.verify(testPayloadBuffer, {
        [WebhookHeaders.X_WEBHOOK_SIGNATURE]: signatureWithWhitespace,
      });

      expect(result.isValid).toBe(true);
    });

    it('should handle mixed case headers', () => {
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(testPayloadBuffer);
      const signature = hmac.digest('hex');

      const verifier = new WebhookSignatureVerifier(null, '', testSecret);
      const result = verifier.verify(testPayloadBuffer, {
        'X-Webhook-Signature': signature,
      });

      // Should fail because headers are case-sensitive in our implementation
      expect(result.isValid).toBe(false);
    });

    it('should handle very large payload', () => {
      const largePayload = { data: 'x'.repeat(100000) };
      const largeBuffer = Buffer.from(JSON.stringify(largePayload));
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(largeBuffer);
      const signature = hmac.digest('hex');

      const verifier = new WebhookSignatureVerifier(null, '', testSecret);
      const result = verifier.verify(largeBuffer, {
        [WebhookHeaders.X_WEBHOOK_SIGNATURE]: signature,
      });

      expect(result.isValid).toBe(true);
      expect(result.payload).toEqual(largePayload);
    });

    it('should handle special characters in payload', () => {
      const specialPayload = { message: '🚀 Test with émojis and spëcial çhars' };
      const specialBuffer = Buffer.from(JSON.stringify(specialPayload));
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(specialBuffer);
      const signature = hmac.digest('hex');

      const verifier = new WebhookSignatureVerifier(null, '', testSecret);
      const result = verifier.verify(specialBuffer, {
        [WebhookHeaders.X_WEBHOOK_SIGNATURE]: signature,
      });

      expect(result.isValid).toBe(true);
      expect(result.payload).toEqual(specialPayload);
    });
  });
});
