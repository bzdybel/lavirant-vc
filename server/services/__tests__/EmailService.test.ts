import { EmailService } from '../EmailService';
import type { OrderConfirmationData, PaidInvoiceEmailParams, ShipmentEmailParams } from '../EmailService';
import * as EmailTemplates from '../../utils/emailTemplates';
import nodemailer from 'nodemailer';
import path from 'path';

// Mock dependencies
jest.mock('nodemailer');
jest.mock('../../utils/emailTemplates');

// Create mock AppConfig
const mockAppConfig = {
  isEmailConfigured: jest.fn(() => true),
  EMAIL_HOST: 'smtp.example.com' as string | undefined,
  EMAIL_PORT: 587 as number,
  EMAIL_USER: 'test@example.com' as string | undefined,
  EMAIL_PASSWORD: 'password123' as string | undefined,
  EMAIL_FROM: 'noreply@example.com' as string | undefined,
  EMAIL_SECURE: false as boolean,
};

jest.mock('../../config/appConfig', () => ({
  AppConfig: mockAppConfig,
}));

describe('EmailService', () => {
  let service: EmailService;
  let mockTransporter: any;
  let mockEmailTemplates: jest.Mocked<typeof EmailTemplates>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock transporter
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    };

    // Mock nodemailer.createTransport
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    // Reset AppConfig mock to default configured state
    mockAppConfig.isEmailConfigured.mockReturnValue(true);
    mockAppConfig.EMAIL_HOST = 'smtp.example.com';
    mockAppConfig.EMAIL_PORT = 587;
    mockAppConfig.EMAIL_USER = 'test@example.com';
    mockAppConfig.EMAIL_PASSWORD = 'password123';
    mockAppConfig.EMAIL_FROM = 'noreply@example.com';
    mockAppConfig.EMAIL_SECURE = false;

    // Mock EmailTemplates
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

    // Create fresh service instance
    service = new EmailService();
  });

  describe('Initialization', () => {
    it('should initialize with full config and create transporter', () => {
      mockAppConfig.isEmailConfigured.mockReturnValue(true);

      service.initialize();

      expect(mockAppConfig.isEmailConfigured()).toBe(true);
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

    it('should initialize without config and enter mock mode', () => {
      mockAppConfig.isEmailConfigured.mockReturnValue(false);

      service.initialize();

      expect(mockAppConfig.isEmailConfigured()).toBe(false);
      expect(nodemailer.createTransport).not.toHaveBeenCalled();
    });

    it('should auto-initialize on first email send', async () => {
      mockAppConfig.isEmailConfigured.mockReturnValue(false);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Don't manually initialize
      const data: OrderConfirmationData = {
        orderId: 123,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        productName: 'Test Product',
        quantity: 1,
        total: 100,
        address: '123 Main St',
        city: 'City',
        postalCode: '12-345',
        country: 'PL',
        orderDate: '2024-01-01',
      };

      await service.sendOrderConfirmation(data);

      // Should have initialized
      expect(mockAppConfig.isEmailConfigured()).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('sendOrderConfirmation', () => {
    it('should log mock email and return true in mock mode', async () => {
      mockAppConfig.isEmailConfigured.mockReturnValue(false);
      service.initialize();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const data: OrderConfirmationData = {
        orderId: 123,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        productName: 'Test Product',
        quantity: 1,
        total: 100,
        address: '123 Main St',
        city: 'City',
        postalCode: '12-345',
        country: 'PL',
        orderDate: '2024-01-01',
      };

      const result = await service.sendOrderConfirmation(data);

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Mock]'),
      );
      consoleSpy.mockRestore();
    });

    it('should send email successfully when configured', async () => {
      mockAppConfig.isEmailConfigured.mockReturnValue(true);
      service.initialize();

      const data: OrderConfirmationData = {
        orderId: 123,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        productName: 'Test Product',
        quantity: 1,
        total: 100,
        address: '123 Main St',
        city: 'City',
        postalCode: '12-345',
        country: 'PL',
        orderDate: '2024-01-01',
      };

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
      mockAppConfig.isEmailConfigured.mockReturnValue(true);
      service.initialize();

      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const data: OrderConfirmationData = {
        orderId: 123,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        productName: 'Test Product',
        quantity: 1,
        total: 100,
        address: '123 Main St',
        city: 'City',
        postalCode: '12-345',
        country: 'PL',
        orderDate: '2024-01-01',
      };

      const result = await service.sendOrderConfirmation(data);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Błąd podczas wysyłania emaila z potwierdzeniem zamówienia'),
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });

    it('should use EMAIL_FROM if available, otherwise EMAIL_USER', async () => {
      mockAppConfig.isEmailConfigured.mockReturnValue(true);
      mockAppConfig.EMAIL_FROM = undefined;
      service.initialize();

      const data: OrderConfirmationData = {
        orderId: 123,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        productName: 'Test Product',
        quantity: 1,
        total: 100,
        address: '123 Main St',
        city: 'City',
        postalCode: '12-345',
        country: 'PL',
        orderDate: '2024-01-01',
      };

      await service.sendOrderConfirmation(data);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Lavirant <test@example.com>',
        }),
      );
    });
  });

  describe('sendPaidInvoiceEmail', () => {
    it('should log mock email and return true in mock mode', async () => {
      mockAppConfig.isEmailConfigured.mockReturnValue(false);
      service.initialize();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const params: PaidInvoiceEmailParams = {
        order: {
          id: 123,
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
        } as any,
        product: { name: 'Test Product' } as any,
        invoiceNumber: 'INV-001',
        invoicePdfPath: '/path/to/invoice.pdf',
      };

      const result = await service.sendPaidInvoiceEmail(params);

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Mock]'),
      );
      consoleSpy.mockRestore();
    });

    it('should send email with PDF attachment when configured', async () => {
      mockAppConfig.isEmailConfigured.mockReturnValue(true);
      service.initialize();

      const params: PaidInvoiceEmailParams = {
        order: {
          id: 123,
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
        } as any,
        product: { name: 'Test Product' } as any,
        invoiceNumber: 'INV-001',
        invoicePdfPath: '/absolute/path/to/invoice.pdf',
      };

      const result = await service.sendPaidInvoiceEmail(params);

      expect(result).toBe(true);
      expect(mockEmailTemplates.generateInvoiceEmail).toHaveBeenCalledWith(
        params.order,
        params.product,
        'INV-001',
      );
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'Lavirant <noreply@example.com>',
        to: 'john@example.com',
        subject: 'Faktura za zakup gry – Lavirant',
        text: 'Invoice text',
        html: '<p>Invoice HTML</p>',
        attachments: [
          {
            filename: 'invoice.pdf',
            path: '/absolute/path/to/invoice.pdf',
          },
        ],
      });
    });

    it('should resolve relative paths to absolute', async () => {
      mockAppConfig.isEmailConfigured.mockReturnValue(true);
      service.initialize();

      const params: PaidInvoiceEmailParams = {
        order: {
          id: 123,
          email: 'john@example.com',
        } as any,
        invoiceNumber: 'INV-001',
        invoicePdfPath: 'storage/invoices/invoice.pdf',
      };

      await service.sendPaidInvoiceEmail(params);

      const expectedPath = path.join(process.cwd(), 'storage/invoices/invoice.pdf');
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [
            {
              filename: 'invoice.pdf',
              path: expectedPath,
            },
          ],
        }),
      );
    });

    it('should keep absolute paths unchanged', async () => {
      mockAppConfig.isEmailConfigured.mockReturnValue(true);
      service.initialize();

      const absolutePath = 'C:\\absolute\\path\\invoice.pdf';
      const params: PaidInvoiceEmailParams = {
        order: {
          id: 123,
          email: 'john@example.com',
        } as any,
        invoiceNumber: 'INV-001',
        invoicePdfPath: absolutePath,
      };

      await service.sendPaidInvoiceEmail(params);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [
            {
              filename: 'invoice.pdf',
              path: absolutePath,
            },
          ],
        }),
      );
    });

    it('should handle transporter error and return false', async () => {
      mockAppConfig.isEmailConfigured.mockReturnValue(true);
      service.initialize();

      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const params: PaidInvoiceEmailParams = {
        order: {
          id: 123,
          email: 'john@example.com',
        } as any,
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
    it('should log mock email and return true in mock mode', async () => {
      mockAppConfig.isEmailConfigured.mockReturnValue(false);
      service.initialize();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const params: ShipmentEmailParams = {
        order: {
          id: 123,
          email: 'john@example.com',
        } as any,
        trackingNumber: 'TRACK123',
        trackingUrl: 'https://tracking.example.com/TRACK123',
      };

      const result = await service.sendShipmentEmail(params);

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Mock]'),
      );
      consoleSpy.mockRestore();
    });

    it('should send email successfully when configured', async () => {
      mockAppConfig.isEmailConfigured.mockReturnValue(true);
      service.initialize();

      const params: ShipmentEmailParams = {
        order: {
          id: 123,
          email: 'john@example.com',
        } as any,
        trackingNumber: 'TRACK123',
        trackingUrl: 'https://tracking.example.com/TRACK123',
      };

      const result = await service.sendShipmentEmail(params);

      expect(result).toBe(true);
      expect(mockEmailTemplates.generateShipmentEmail).toHaveBeenCalledWith(
        params.order,
        'TRACK123',
        'https://tracking.example.com/TRACK123',
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
      mockAppConfig.isEmailConfigured.mockReturnValue(true);
      service.initialize();

      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const params: ShipmentEmailParams = {
        order: {
          id: 123,
          email: 'john@example.com',
        } as any,
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
