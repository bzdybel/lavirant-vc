/**
 * SEO Structured Data Schemas
 * Provides JSON-LD structured data for better search engine understanding
 */

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Lavirant",
  "url": "https://lavirant.pl",
  "logo": "https://lavirant.pl/logo-primary.png",
  "description": "Producent strategicznych gier planszowych. Tworzymy innowacyjne gry towarzyskie dla dorosłych.",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+48-123-456-789",
    "contactType": "customer service",
    "email": "kontakt@lavirant.pl",
    "availableLanguage": ["Polish"]
  },
  "sameAs": [
    "https://www.facebook.com/lavirant",
    "https://www.instagram.com/lavirant"
  ]
};

interface ProductSchemaProps {
  name: string;
  description: string;
  image: string;
  price: number; // in PLN
  availability: 'InStock' | 'OutOfStock' | 'PreOrder';
  sku?: string;
}

export function createProductSchema({
  name,
  description,
  image,
  price,
  availability,
  sku = 'LAVIRANT-001'
}: ProductSchemaProps) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": name,
    "description": description,
    "image": image,
    "brand": {
      "@type": "Brand",
      "name": "Lavirant"
    },
    "sku": sku,
    "offers": {
      "@type": "Offer",
      "url": "https://lavirant.pl/checkout?productId=1",
      "priceCurrency": "PLN",
      "price": price.toFixed(2),
      "availability": `https://schema.org/${availability}`,
      "seller": {
        "@type": "Organization",
        "name": "Lavirant"
      }
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "127"
    },
    "category": "Gry planszowe strategiczne"
  };
}

export function createBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
}

export function createWebPageSchema(name: string, description: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": name,
    "description": description,
    "url": url,
    "inLanguage": "pl-PL",
    "isPartOf": {
      "@type": "WebSite",
      "name": "Lavirant",
      "url": "https://lavirant.pl"
    }
  };
}

export function createFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}
