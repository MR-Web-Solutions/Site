# MR Web Solutions SEO and Search Console Audit

## Scope

Canonical domain: `https://mrweb.co.za/`

Public pages included in the sitemap:

- Home
- About
- Services
- Projects
- Packages
- FAQs
- Contact

The staff enquiries dashboard is intentionally excluded from the sitemap and marked `noindex, nofollow`.

## Issues found and fixed

- Added unique SEO titles and meta descriptions to every public page.
- Added canonical URLs using `https://mrweb.co.za/`.
- Added robots, author, keywords, viewport, charset and theme-color metadata.
- Added complete Open Graph and Twitter Card metadata.
- Added Organization, ProfessionalService, WebSite, WebPage and BreadcrumbList JSON-LD. The FAQ page also includes FAQPage JSON-LD.
- Added `sitemap.xml`, `robots.txt` and `CNAME` for the custom domain.
- Added a branded `404.html` page.
- Generated standard browser and app icons, a web manifest and a social sharing image.
- Added image dimensions, asynchronous decoding and lazy loading where appropriate.
- Added keyboard-visible focus styling and ensured mobile menu buttons expose their expanded state.
- Added Search Console and Bing verification placeholders. The final verification token must be supplied by Google or Bing.

## Validation completed

- 7 public pages have one H1 each.
- 7 unique titles, descriptions and canonical URLs are present.
- Required Open Graph, Twitter Card and JSON-LD fields are present.
- JSON-LD blocks parse successfully.
- Sitemap XML parses successfully.
- Referenced local image files exist.

## Remaining deployment steps

1. Upload every changed and generated file to the GitHub Pages repository.
2. Confirm that `https://mrweb.co.za/robots.txt` and `https://mrweb.co.za/sitemap.xml` open after publishing.
3. Add `https://mrweb.co.za/` as a URL-prefix property in Google Search Console.
4. Complete ownership verification with Google's generated HTML tag or file, then submit `sitemap.xml`.
5. Add the equivalent Bing verification tag or file in Bing Webmaster Tools.

## Lighthouse and Core Web Vitals

The changes improve discoverability and reduce avoidable layout shift by declaring image dimensions. Actual Lighthouse scores and Core Web Vitals need to be measured against the published custom domain after deployment because they depend on live network, hosting and device conditions.

## Security headers

See `SECURITY-HEADERS.md`. GitHub Pages does not allow response-header configuration directly; use Cloudflare or another proxy if those headers are required.
