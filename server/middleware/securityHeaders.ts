import type { Request, Response, NextFunction } from "express";

/**
 * Security Headers Middleware
 *
 * Applies HTTP security headers to all responses.
 * CSP is tuned to the exact set of external origins used by the app:
 *   - Stripe          (js.stripe.com, api.stripe.com, hooks.stripe.com, ws.stripe.com)
 *   - Google Fonts    (fonts.googleapis.com, fonts.gstatic.com)
 *   - InPost GeoWidget production  (geowidget.inpost.pl)
 *   - InPost GeoWidget sandbox     (sandbox-easy-geowidget-sdk.easypack24.net)
 *   - Unsplash images (images.unsplash.com)
 *   - Wikimedia images (upload.wikimedia.org)
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  const csp = [
    "default-src 'self'",

    // Scripts: own bundle + Stripe + InPost geowidget (both envs)
    [
      "script-src",
      "'self'",
      "https://js.stripe.com",
      "https://geowidget.inpost.pl",
      "https://sandbox-easy-geowidget-sdk.easypack24.net",
    ].join(" "),

    // Styles: own CSS + Google Fonts + InPost geowidget CSS
    // 'unsafe-inline' required by Stripe Elements and InPost custom element
    [
      "style-src",
      "'self'",
      "'unsafe-inline'",
      "https://fonts.googleapis.com",
      "https://geowidget.inpost.pl",
      "https://sandbox-easy-geowidget-sdk.easypack24.net",
    ].join(" "),

    // Fonts: Google Fonts CDN
    "font-src 'self' https://fonts.gstatic.com",

    // Images: own assets + Unsplash + Wikimedia (payment logos)
    "img-src 'self' data: https://images.unsplash.com https://upload.wikimedia.org",

    // Fetch / XHR / WebSocket: own API + Stripe
    "connect-src 'self' https://api.stripe.com https://js.stripe.com wss://ws.stripe.com",

    // Stripe Elements renders inside iframes from these origins
    "frame-src https://js.stripe.com https://hooks.stripe.com",

    // Stripe uses blob: workers internally
    "worker-src blob:",

    // Disallow <object>, <embed>, <applet>
    "object-src 'none'",

    // Require HTTPS for all navigations (production only)
    "upgrade-insecure-requests",
  ].join("; ");

  res.setHeader("Content-Security-Policy", csp);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );

  next();
}
