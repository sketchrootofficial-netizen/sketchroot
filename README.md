# SketchRoot website (sketchroot.com)

Static multi-page site. No build step is needed to deploy: upload this folder as is.

## Pages
/ (home) · /memory-palace/ · /neet-mds/ · /neet-mds/previous-year-questions/ · /ini-cet/ · /inbde/ · /aiims/ · /red-book/ · /founder/ · /privacy/ · /sitemap/ · 404.html · thanks.html (noindex)

## SEO and GEO files
- robots.txt: search and AI crawlers allowed (GPTBot, ClaudeBot, OAI-SearchBot, PerplexityBot, Google-Extended and others), sitemap declared
- sitemap.xml: 11 indexable URLs with lastmod and images
- llms.txt: plain summary for AI assistants
- 423baa13ca60718d1b0a39f1a4bdccf0.txt: IndexNow key (Bing, Yandex, others)
- Every page: unique title, meta description, one H1, canonical, Open Graph, Twitter card, JSON-LD (Organization, WebSite, Person, Article, FAQPage, BreadcrumbList)
- Favicons: favicon.ico, favicon.svg, apple-touch-icon.png, 192/512 and maskable icons, site.webmanifest
- _headers and netlify.toml: caching and security headers (Netlify / Cloudflare Pages compatible)

## After deploying
1. Add the site in Google Search Console and Bing Webmaster Tools, submit https://sketchroot.com/sitemap.xml
2. Request indexing for the home page, the memory palace guide and the six exam guides
3. Forms use Netlify Forms (data-netlify). On another host, point the form action at your form service

## Backlinks to the founder's site
Followed links to https://doctorj.in/ sit in: the footer of every page, the byline and author box of every guide, the home page founder note, the founder page (rel="me"), the Person schema sameAs, and llms.txt. Add a link from doctorj.in back to https://sketchroot.com/ (see the snippet in the hand-off notes) to complete the two way link.

## Social thumbnails
Each guide has its own 1200x630 card in assets/img (og-*.jpg, all under 200 KB so WhatsApp, Telegram, LinkedIn and X show them). After changing a page title, regenerate the card and clear the cache in the Facebook Sharing Debugger and LinkedIn Post Inspector.
