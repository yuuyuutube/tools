import { SandSimulation } from '../src/simulation.js';
const sim = new SandSimulation();
for (let i = 0; i < 120; i++) sim.step();
const samples = [];
for (let i = 0; i < 2400; i++) {
  if (i % 240 === 0) { sim.fieldAngle += .7; sim.rotateTo(sim.angle + .4); }
  const start = performance.now(); sim.step(); samples.push(performance.now() - start);
}
samples.sort((a, b) => a - b);
console.log(JSON.stringify({ particles: sim.count, steps: samples.length, averageMs: samples.reduce((a,b) => a+b) / samples.length, p95Ms: samples[Math.floor(samples.length * .95)], note: 'CPU simulation only; excludes browser rendering.' }, null, 2));
