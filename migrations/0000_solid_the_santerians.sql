CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer,
	"quantity" integer NOT NULL,
	"total" integer NOT NULL,
	"delivery_cost" integer DEFAULT 0 NOT NULL,
	"delivery_method" text,
	"delivery_point_id" text,
	"status" text NOT NULL,
	"shipment_id" text,
	"shipment_status" text,
	"tracking_number" text,
	"label_generated" boolean,
	"payment_intent_id" text,
	"payment_provider" text,
	"payment_reference" text,
	"payment_pending_at" text,
	"payment_confirmed_at" text,
	"invoice_number" text,
	"invoice_pdf_path" text,
	"invoice_issued_at" text,
	"email_sent_at" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"postal_code" text NOT NULL,
	"country" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"image" text NOT NULL,
	"category" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"provider" text NOT NULL,
	"provider_shipment_id" text,
	"selected_offer_id" text,
	"tracking_number" text NOT NULL,
	"tracking_url" text NOT NULL,
	"status" text NOT NULL,
	"bought_at" text,
	"buy_error" text,
	"created_at" text NOT NULL,
	"shipped_at" text
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"received_at" text NOT NULL,
	"provider" text NOT NULL,
	"status" text NOT NULL,
	"payment_reference" text,
	"order_id" integer,
	"signature_valid" boolean DEFAULT false NOT NULL,
	"raw_payload" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;