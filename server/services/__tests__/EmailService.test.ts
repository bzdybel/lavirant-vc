import { EmailServiceReal, EmailServiceNoop } from '../EmailService';
import type { PaidInvoiceEmailParams, ShipmentEmailParams } from '../EmailService';
import { makeOrderConfirmationData } from '../../__tests__/fixtures/emailFixtures';
import * as EmailTemplates from '../../utils/emailTemplates';
import nodemailer from 'nodemailer';
import path from 'path';

jest.mock('nodemailer');
jest.mock('../../utils/emailTemplates');

const TEST_CONFIG = {
  host: 'smtp.example.com',
  port: 587,
  user: 'test@example.com',
  password: 'password123',
  from: 'noreply@example.com',
  secure: false,
};

describe('EmailServiceReal', () => {
  let service: EmailServiceReal;
  let mockTransporter: any;
  let mockEmailTemplates: jest.Mocked<typeof EmailTemplates>;

  beforeEach(() => {
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    mockEmailTemplates = EmailTemplates as jest.Mocked<typeof EmailTemplates>;
    mockEmailTemplates.generateOrderConfirmationEmail = jest.fn().mockReturnValue({
      html: '<p>Order confirmation HTML</p>',
      text: 'Order confirmation text',
    });
    mockEmailTemplates.generateInvoiceEmail = jest.fn().mockReturnValue({
      html: '<p>Invoice HTML</p>',
      text: 'Invoice text',
    });
    mockEmailTemplates.generateShipmentEmail = jest.fn().mockReturnValue({
      html: '<p>Shipment HTML</p>',
      text: 'Shipment text',
    });

    service = new EmailServiceReal(TEST_CONFIG);
  });

  describe('Initialization', () => {
    it('should create transporter with provided config', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'password123',
        },
      });
    });

    it('should fall back to user as from when from is empty', () => {
      new EmailServiceReal({ ...TEST_CONFIG, from: '' });
      // from field is built from config.from || config.user
    });
  });

  describe('sendOrderConfirmation', () => {
    it('should send email successfully', async () => {
      const data = makeOrderConfirmationData();
      const result = await service.sendOrderConfirmation(data);

      expect(result).toBe(true);
      expect(mockEmailTemplates.generateOrderConfirmationEmail).toHaveBeenCalledWith(data);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'Lavirant <noreply@example.com>',
        to: 'john@example.com',
        subject: 'Potwierdzenie zamówienia - Zamówienie #123',
        text: 'Order confirmation text',
        html: '<p>Order confirmation HTML</p>',
      });
    });

    it('should handle transporter error and return false', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const data = makeOrderConfirmationData();

      const result = await service.sendOrderConfirmation(data);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Błąd podczas wysyłania emaila z potwierdzeniem zamówienia'),
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });

    it('should use user as from when from config is empty', async () => {
      const serviceNoFrom = new EmailServiceReal({ ...TEST_CONFIG, from: '' });
      const data = makeOrderConfirmationData();
      await serviceNoFrom.sendOrderConfirmation(data);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'Lavirant <test@example.com>' }),
      );
    });
  });

  describe('sendPaidInvoiceEmail', () => {
    it('should send email with PDF attachment', async () => {
      const params: PaidInvoiceEmailParams = {
        order: { id: 123, email: 'john@example.com', firstName: 'John', lastName: 'Doe' } as any,
        product: { name: 'Test Product' } as any,
        invoiceNumber: 'INV-001',
        invoicePdfPath: '/absolute/path/to/invoice.pdf',
      };

      const result = await service.sendPaidInvoiceEmail(params);

      expect(result).toBe(true);
      expect(mockEmailTemplates.generateInvoiceEmail).toHaveBeenCalledWith(
        params.order, params.product, 'INV-001',
      );
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'Lavirant <noreply@example.com>',
        to: 'john@example.com',
        subject: 'Faktura za zakup gry – Lavirant',
        text: 'Invoice text',
        html: '<p>Invoice HTML</p>',
        attachments: [{ filename: 'invoice.pdf', path: '/absolute/path/to/invoice.pdf' }],
      });
    });

    it('should resolve relative paths to absolute', async () => {
      const params: PaidInvoiceEmailParams = {
        order: { id: 123, email: 'john@example.com' } as any,
        invoiceNumber: 'INV-001',
        invoicePdfPath: 'storage/invoices/invoice.pdf',
      };

      await service.sendPaidInvoiceEmail(params);

      const expectedPath = path.join(process.cwd(), 'storage/invoices/invoice.pdf');
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [{ filename: 'invoice.pdf', path: expectedPath }],
        }),
      );
    });

    it('should handle transporter error and return false', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const params: PaidInvoiceEmailParams = {
        order: { id: 123, email: 'john@example.com' } as any,
        invoiceNumber: 'INV-001',
        invoicePdfPath: '/path/to/invoice.pdf',
      };

      const result = await service.sendPaidInvoiceEmail(params);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Błąd podczas wysyłania emaila z fakturą'),
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('sendShipmentEmail', () => {
    it('should send email successfully', async () => {
      const params: ShipmentEmailParams = {
        order: { id: 123, email: 'john@example.com' } as any,
        trackingNumber: 'TRACK123',
        trackingUrl: 'https://tracking.example.com/TRACK123',
      };

      const result = await service.sendShipmentEmail(params);

      expect(result).toBe(true);
      expect(mockEmailTemplates.generateShipmentEmail).toHaveBeenCalledWith(
        params.order, 'TRACK123', 'https://tracking.example.com/TRACK123',
      );
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'Lavirant <noreply@example.com>',
        to: 'john@example.com',
        subject: 'Twoje zamówienie zostało wysłane – Lavirant',
        text: 'Shipment text',
        html: '<p>Shipment HTML</p>',
      });
    });

    it('should handle transporter error and return false', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const params: ShipmentEmailParams = {
        order: { id: 123, email: 'john@example.com' } as any,
        trackingNumber: 'TRACK123',
        trackingUrl: 'https://tracking.example.com/TRACK123',
      };

      const result = await service.sendShipmentEmail(params);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Błąd podczas wysyłania emaila o wysyłce'),
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });
  });
});

describe('EmailServiceNoop', () => {
  let service: EmailServiceNoop;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new EmailServiceNoop();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('sendOrderConfirmation returns true and logs', async () => {
    const data = makeOrderConfirmationData();
    const result = await service.sendOrderConfirmation(data);

    expect(result).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Noop]'));
  });

  it('sendPaidInvoiceEmail returns true and logs', async () => {
    const params: PaidInvoiceEmailParams = {
      order: { id: 1, email: 'a@b.com', firstName: 'A', lastName: 'B' } as any,
      invoiceNumber: 'INV-001',
      invoicePdfPath: '/path',
    };
    const result = await service.sendPaidInvoiceEmail(params);

    expect(result).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Noop]'));
  });

  it('sendShipmentEmail returns true and logs', async () => {
    const params: ShipmentEmailParams = {
      order: { id: 1, email: 'a@b.com' } as any,
      trackingNumber: 'T123',
      trackingUrl: 'https://tracking.example.com',
    };
    const result = await service.sendShipmentEmail(params);

    expect(result).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Noop]'));
  });
});
