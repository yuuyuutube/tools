// Local server: `node serve.mjs [port]`, then open http://localhost:5175/ (redirects to the safe).
// It serves the whole pico/ folder because the safe imports ../shared/rotary/, just as it does
// on the static host. Web Serial needs a secure context; http://localhost counts as one.
import { serveSite } from '../shared/dev-server.mjs';

serveSite({
  site: '02-the-impossible-safe',
  port: Number(process.argv[2] || process.env.PORT || 5175),
  label: 'The Impossible Safe',
});
