// Local server: `node serve.mjs [port]`, then open http://localhost:5176/ (redirects to the library).
// It serves the whole pico/ folder because the site imports ../shared/rotary/, exactly as on the
// static host. Web Serial needs a secure context; http://localhost counts as one.
import { serveSite } from '../shared/dev-server.mjs';

serveSite({
  site: '03-rotary-stories',
  port: Number(process.argv[2] || process.env.PORT || 5176),
  label: 'Rotary Stories',
});
