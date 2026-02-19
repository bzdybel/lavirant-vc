import express from 'express';

/**
 * Sitemap Generator Route
 * Dynamically generates XML sitemap for search engine crawlers
 * Improves SEO by providing clear site structure
 */
export function setupSitemapRoute(app: express.Application) {
  app.get('/sitemap.xml', (req, res) => {
    const baseUrl = process.env.BASE_URL || 'https://lavirant.pl';
    const currentDate = new Date().toISOString().split('T')[0];

    const urls = [
      {
        loc: `${baseUrl}/`,
        changefreq: 'weekly',
        priority: '1.0',
        lastmod: currentDate
      },
      {
        loc: `${baseUrl}/checkout`,
        changefreq: 'monthly',
        priority: '0.8',
        lastmod: currentDate
      },
      {
        loc: `${baseUrl}/Regulamin.pdf`,
        changefreq: 'yearly',
        priority: '0.3',
        lastmod: currentDate
      },
      {
        loc: `${baseUrl}/Polityka_Prywatnosci.pdf`,
        changefreq: 'yearly',
        priority: '0.3',
        lastmod: currentDate
      },
      {
        loc: `${baseUrl}/Polityka_Cookies.pdf`,
        changefreq: 'yearly',
        priority: '0.3',
        lastmod: currentDate
      }
    ];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  });
}
