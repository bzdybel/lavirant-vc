/* global console */
const db = require('better-sqlite3')('data-staging.db');
db.prepare('DELETE FROM shipments').run();
db.prepare('DELETE FROM webhook_events').run();
db.prepare(`UPDATE orders SET status='PAYMENT_PENDING', invoice_number=NULL, invoice_pdf_path=NULL, invoice_issued_at=NULL, email_sent_at=NULL, tracking_number=NULL, shipment_id=NULL, shipment_status=NULL, label_generated=0, shipment_poll_failures=0 WHERE id=1`).run();
console.log('Order reset');
console.table(db.prepare('SELECT id, status, invoice_number, email_sent_at, tracking_number FROM orders').all());
