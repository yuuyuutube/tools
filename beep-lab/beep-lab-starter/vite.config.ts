import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const { SITE_URL } = loadEnv(mode, '.', 'SITE_URL');
  let site: URL | undefined;
  if (SITE_URL) {
    site = new URL(SITE_URL);
    if (!['https:', 'http:'].includes(site.protocol) || site.username || site.password || site.search || site.hash) {
      throw new Error('SITE_URL must be a public http(s) site URL without credentials, query, or hash');
    }
    if (!site.pathname.endsWith('/')) site.pathname += '/';
  }
  return {
    base: './',
    plugins: [{
      name: 'social-image-origin',
      transformIndexHtml(html) {
        if (!site) return html;
        const image = new URL('og-image.png', site).href;
        return html.replaceAll('content="./og-image.png"', `content="${image}"`)
          .replace('</head>', `  <meta property="og:url" content="${site.href}" />\n  </head>`);
      },
    }],
  };
});
