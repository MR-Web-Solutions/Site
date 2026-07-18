# Recommended security headers

GitHub Pages does not let this project set HTTP response headers directly. If you place Cloudflare or another proxy in front of `mrweb.co.za`, configure:

```text
Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' https://esm.sh; connect-src 'self' https://umcyfejhbngaiuqmjhwm.supabase.co; frame-ancestors 'self'; base-uri 'self'; form-action 'self'
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

Test the Content Security Policy in report-only mode first because the contact form uses Supabase and the staff dashboard imports Supabase from esm.sh.
