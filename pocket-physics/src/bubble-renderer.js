const TAU = Math.PI * 2;

function outline(c, body) {
  c.beginPath();
  const n = body.count;
  c.moveTo((body.x[n - 1] + body.x[0]) / 2, (body.y[n - 1] + body.y[0]) / 2);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    c.quadraticCurveTo(body.x[i], body.y[i], (body.x[i] + body.x[j]) / 2, (body.y[i] + body.y[j]) / 2);
  }
  c.closePath();
}

export class BubbleRenderer {
  constructor(canvas, sim) {
    this.canvas = canvas; this.sim = sim;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) throw new Error('Canvas 2D is unavailable');
    this.width = 0; this.height = 0; this.center = { x: 0, y: 0 }; this.scale = 1;
  }
  resize(width, height) {
    if (width <= 0 || height <= 0) return;
    this.width = width; this.height = height; this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * this.dpr); this.canvas.height = Math.round(height * this.dpr);
    this.scale = Math.min((width - 20) / 560, (height - (window.innerWidth <= 800 ? 55 : 155)) / 460, 1.34);
    this.center = { x: width / 2, y: height * (window.innerWidth <= 800 ? .45 : .43) };
  }
  render() {
    const c = this.ctx, { width, height, dpr, center, scale } = this;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, width, height);
    c.save(); c.translate(center.x, center.y); c.scale(scale, scale);
    // A single soft optical shadow keeps the cluster suspended in its own mint room.
    c.save(); c.translate(0, 222); c.scale(1, .1);
    const shadow = c.createRadialGradient(0, 0, 0, 0, 0, 215);
    shadow.addColorStop(0, '#2448541a'); shadow.addColorStop(1, '#24485400');
    c.fillStyle = shadow; c.beginPath(); c.arc(0, 0, 215, 0, TAU); c.fill(); c.restore();
    for (const body of [...this.sim.bubbles].sort((a,b) => b.radius - a.radius)) this.bubble(c, body);
    for (const grab of this.sim.grabs.values()) {
      const { body, index } = grab;
      c.beginPath(); c.arc(body.x[index], body.y[index], 5, 0, TAU);
      c.fillStyle = '#765ba7'; c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.stroke();
    }
    c.restore();
  }
  bubble(c, body) {
    const center = body.center(), r = body.radius * Math.sqrt(this.sim.inflation);
    c.save(); outline(c, body); c.clip();
    const film = c.createRadialGradient(center.x - r * .42, center.y - r * .48, 0, center.x + r * .1, center.y + r * .1, r * 1.35);
    film.addColorStop(0, '#ffffff8a'); film.addColorStop(.3, '#ffffff08'); film.addColorStop(.6, '#82d8d51c'); film.addColorStop(.82, '#82d8d568'); film.addColorStop(1, '#765ba722');
    c.fillStyle = film; c.fillRect(-300, -250, 600, 500);
    const lens = c.createLinearGradient(center.x - r, center.y - r, center.x + r, center.y + r);
    lens.addColorStop(0, '#ffffff70'); lens.addColorStop(.42, '#ffffff00'); lens.addColorStop(.7, '#ffffff00'); lens.addColorStop(1, '#765ba714');
    c.fillStyle = lens; c.fillRect(-300, -250, 600, 500); c.restore();

    outline(c, body);
    const rim = c.createLinearGradient(center.x - r, center.y - r, center.x + r, center.y + r);
    rim.addColorStop(0, '#ffffff'); rim.addColorStop(.23, '#82d8d5'); rim.addColorStop(.49, '#765ba788'); rim.addColorStop(.7, '#ffffffee'); rim.addColorStop(1, '#65c6c1');
    c.strokeStyle = rim; c.lineWidth = 2.4; c.stroke();
    // Specular arcs follow deformed membrane nodes, rather than a fixed circle overlay.
    const arc = (start, end, inset, color, lineWidth) => {
      c.beginPath();
      for (let i = start; i <= end; i++) {
        const k = i % body.count;
        const x = center.x + (body.x[k] - center.x) * inset, y = center.y + (body.y[k] - center.y) * inset;
        if (i === start) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.strokeStyle = color; c.lineWidth = lineWidth; c.lineCap = 'round'; c.stroke();
    };
    arc(29, 39, .94, '#ffffffdc', 5.5);
    arc(31, 37, .89, '#ffffff70', 1.4);
    arc(3, 13, .975, '#765ba755', 1);
    arc(8, 17, .94, '#82d8d580', 2.3);
  }
  point(x, y) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: (x - rect.left - this.center.x) / this.scale, y: (y - rect.top - this.center.y) / this.scale };
  }
}
