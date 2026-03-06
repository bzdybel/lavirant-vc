import helmet from "helmet";

/**
 * Security Headers Middleware (via helmet)
 *
 * CSP is tuned to the exact set of external origins used by the app:
 *   - Stripe          (js.stripe.com, api.stripe.com, hooks.stripe.com, ws.stripe.com)
 *   - Google Fonts    (fonts.googleapis.com, fonts.gstatic.com)
 *   - InPost GeoWidget production  (geowidget.inpost.pl)
 *   - InPost GeoWidget sandbox     (sandbox-easy-geowidget-sdk.easypack24.net)
 *   - Unsplash images (images.unsplash.com)
 *   - Wikimedia images (upload.wikimedia.org)
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],

      // Scripts: own bundle + Stripe + InPost geowidget (both envs)
      scriptSrc: [
        "'self'",
        "https://js.stripe.com",
        "https://geowidget.inpost.pl",
        "https://sandbox-easy-geowidget-sdk.easypack24.net",
      ],

      // Styles: own CSS + Google Fonts + InPost geowidget
      // 'unsafe-inline' required by Stripe Elements and InPost web component
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://geowidget.inpost.pl",
        "https://sandbox-easy-geowidget-sdk.easypack24.net",
      ],

      // Fonts: Google Fonts CDN
      fontSrc: ["'self'", "https://fonts.gstatic.com"],

      // Images: own assets + Unsplash + Wikimedia (payment logos)
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://upload.wikimedia.org"],

      // Fetch / XHR / WebSocket: own API + Stripe
      connectSrc: ["'self'", "https://api.stripe.com", "https://js.stripe.com", "wss://ws.stripe.com"],

      // Stripe Elements renders inside iframes from these origins
      frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com"],

      // Stripe uses blob: workers internally
      workerSrc: ["blob:"],

      // Disallow <object>, <embed>, <applet>
      objectSrc: ["'none'"],

      upgradeInsecureRequests: [],
    },
  },

  // X-Frame-Options: DENY
  frameguard: { action: "deny" },

  // X-Content-Type-Options: nosniff (helmet default)
  noSniff: true,

  // Referrer-Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },

  // Permissions-Policy
  permittedCrossDomainPolicies: false,
});
