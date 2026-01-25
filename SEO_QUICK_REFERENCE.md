# SEO Quick Reference - Lavirant

## 🎯 Key Implementation Points

### 1. Dynamic Meta Tags
Every page now has unique, optimized meta tags:
- **Homepage**: "Lavirant – Strategiczna Gra Planszowa | Gra Towarzyska dla Dorosłych"
- **Checkout**: "Kup Lavirant | Lavirant – Gra Planszowa Strategiczna"
- **404**: "404 - Strona nie znaleziona | Lavirant"

### 2. Structured Data
- **Organization schema** on homepage
- **Product schema** on checkout with price, availability, ratings
- **Breadcrumb schema** for better navigation understanding

### 3. Performance
- Images have `width` and `height` attributes (prevents CLS)
- Hero images use `loading="eager"` (LCP optimization)
- Below-fold images use `loading="lazy"`

### 4. Accessibility
- All images have descriptive alt text in Polish
- ARIA labels on navigation and interactive elements
- Semantic HTML: `<main>`, `<header>`, `<footer>`, `<nav>`, `<article>`

### 5. Indexing Control
- **robots.txt** at `/robots.txt`
- **sitemap.xml** at `/sitemap.xml` (dynamically generated)
- **Canonical URLs** on all pages
- **noindex** on transactional pages (order-success, order-failure)

---

## 📂 Files Created

```
client/src/components/SEOHead.tsx          - Dynamic SEO component
client/src/lib/seo-schemas.ts              - Structured data generators
client/public/robots.txt                   - Crawler directives
server/sitemap.ts                          - Sitemap generator
SEO_IMPLEMENTATION.md                      - Full documentation
```

---

## 📂 Files Modified

```
client/index.html                          - Base meta tags
client/src/pages/home.tsx                  - Homepage SEO + semantic HTML
client/src/pages/checkout.tsx              - Product SEO + schema
client/src/pages/not-found.tsx             - 404 SEO
client/src/pages/order-success.tsx         - noindex meta
client/src/pages/order-failure.tsx         - noindex meta
client/src/components/navbar.tsx           - Semantic nav + ARIA
client/src/components/footer.tsx           - Semantic footer
client/src/components/feature-section.tsx  - <article> wrapper
client/src/components/image-gallery.tsx    - Alt text + dimensions
client/src/components/ui/image-card.tsx    - Lazy loading + dimensions
client/src/hooks/useCheckout.ts            - Added description field
server/index.ts                            - Sitemap route integration
```

---

## 🔍 How to Test

### 1. Meta Tags
```bash
# Open any page and inspect <head>
View > Developer > View Source
```

### 2. Structured Data
Visit: https://validator.schema.org/
Paste your page URL or HTML

### 3. Robots.txt
```bash
curl http://localhost:5000/robots.txt
```

### 4. Sitemap
```bash
curl http://localhost:5000/sitemap.xml
```

### 5. Lighthouse SEO Score
```bash
# Chrome DevTools
F12 > Lighthouse > Generate Report
```

---

## 📊 Expected Lighthouse Scores

### Before:
- SEO: ~70-80
- Accessibility: ~80-85
- Performance: ~75-80

### After:
- SEO: ~95-100 ✅
- Accessibility: ~90-95 ✅
- Performance: ~85-90 ✅

---

## 🚀 Deployment Checklist

### Before Deploy:
- [ ] Update `BASE_URL` env variable for sitemap
- [ ] Verify all images have alt text
- [ ] Test meta tags in browser
- [ ] Validate structured data
- [ ] Check robots.txt and sitemap accessibility

### After Deploy:
- [ ] Submit sitemap to Google Search Console
- [ ] Request indexing for main pages
- [ ] Monitor Core Web Vitals
- [ ] Track keyword rankings
- [ ] Check for rich snippets in 2-4 weeks

---

## 🎓 SEO Best Practices Applied

### ✅ Content
- Keyword-rich titles (under 60 chars)
- Compelling descriptions (150-160 chars)
- Natural keyword usage (no keyword stuffing)
- Clear content hierarchy (H1 > H2 > H3)

### ✅ Technical
- Fast page loads (optimized images)
- Mobile-friendly (responsive design)
- HTTPS ready (use HTTPS in production)
- Clean URLs (no query params in main pages)

### ✅ On-Page
- One H1 per page
- Descriptive alt text
- Internal linking
- Semantic HTML

### ✅ Schema
- Organization markup
- Product markup with pricing
- Breadcrumbs
- FAQ potential (can be added)

---

## 🔧 Maintenance

### Weekly:
- Monitor Google Search Console errors
- Check sitemap indexing status

### Monthly:
- Review top performing keywords
- Update meta descriptions based on CTR
- Check for broken links
- Refresh product schema data

### Quarterly:
- Full SEO audit
- Competitor analysis
- Content gap analysis
- Technical SEO review

---

## 📈 KPIs to Track

1. **Organic Traffic** - Google Analytics
2. **Keyword Rankings** - Google Search Console
3. **Click-Through Rate (CTR)** - Search Console
4. **Core Web Vitals** - PageSpeed Insights
5. **Indexed Pages** - Search Console
6. **Rich Snippets** - Manual search checks
7. **Bounce Rate** - Google Analytics
8. **Conversion Rate** - From organic traffic

---

## 🎯 Target Keywords to Track

### Primary:
- Lavirant
- gra planszowa strategiczna
- gra towarzyska dla dorosłych

### Secondary:
- gra blefowa
- gra dedukcyjna
- najlepsza gra planszowa

### Long-tail:
- gra planszowa strategiczna dla dorosłych
- gra towarzyska 5-8 graczy
- kupić grę planszową Lavirant

---

## 💡 Pro Tips

1. **Content is King**: Keep adding quality content (blog, guides)
2. **User Experience**: Fast, accessible site = better SEO
3. **Mobile-First**: Test on mobile devices frequently
4. **Local SEO**: If selling in specific regions, add location pages
5. **Backlinks**: Quality backlinks boost authority
6. **Social Signals**: Share on social media
7. **Regular Updates**: Fresh content signals active site

---

## 🆘 Troubleshooting

### Issue: Meta tags not updating
**Solution**: Clear browser cache or use incognito mode

### Issue: Sitemap not accessible
**Solution**: Check server logs, verify route is registered

### Issue: Schema validation errors
**Solution**: Use Google's Rich Results Test tool

### Issue: Images still causing CLS
**Solution**: Verify width/height attributes are present

### Issue: Low SEO score
**Solution**: Run Lighthouse audit, fix specific issues flagged

---

## 📞 Support Resources

- Google Search Console: https://search.google.com/search-console
- Schema Validator: https://validator.schema.org/
- PageSpeed Insights: https://pagespeed.web.dev/
- Lighthouse: Chrome DevTools > Lighthouse
- SEO Documentation: `SEO_IMPLEMENTATION.md`

---

**Last Updated**: January 25, 2026
**Status**: ✅ Production Ready
