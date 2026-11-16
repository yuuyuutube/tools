import assert from 'node:assert/strict';
import {signalMarks,shipMarks} from '../chart-ui.mjs';
import {trendChart} from '../trend-chart.mjs';
const data=[{date:'2026-11-14',aircraft_total:10,median_line_cross:4},{date:'2026-11-15',aircraft_total:null,median_line_cross:null},{date:'2026-11-16',aircraft_total:0,median_line_cross:0}];
let count=0;const test=(name,fn)=>{fn();count++;console.log('PASS '+name);};
test('one plane per sortie',()=>assert.equal((signalMarks(31,'plane').match(/<path /g)||[]).length,31));
test('one ship per vessel with row wrapping',()=>{const svg=shipMarks(40);assert.equal((svg.match(/<path /g)||[]).length,40);assert.ok(svg.includes('translate(36,354)'));});
test('missing and zero vessels produce no icons',()=>{assert.equal(shipMarks(null),'');assert.equal(shipMarks(0),'');});
test('square option preserves count',()=>assert.equal((signalMarks(31,'square').match(/<rect /g)||[]).length,31));
test('missing and zero never create markers',()=>{assert.equal(signalMarks(null),'');assert.equal(signalMarks(0),'');});
for(const mode of ['line','bars']){
 test(mode+' has both series, averages and selected date',()=>{const svg=trendChart(data,{mode,means:{aircraft_total:6,median_line_cross:2},selected:'2026-11-16'});assert.ok(svg.includes('data-series="aircraft_total"'));assert.ok(svg.includes('data-series="median_line_cross"'));assert.ok(svg.includes('data-mean="aircraft_total"'));assert.ok(svg.includes('class="selected-date"'));assert.ok(!svg.includes('NaN'));});
 test(mode+' hidden series also hides its mean',()=>{const svg=trendChart(data,{mode,visible:['median_line_cross'],means:{aircraft_total:6,median_line_cross:2}});assert.ok(!svg.includes('data-series="aircraft_total"'));assert.ok(!svg.includes('data-mean="aircraft_total"'));assert.ok(svg.includes('data-mean="median_line_cross"'));});
 test(mode+' average switch hides reference lines',()=>assert.ok(!trendChart(data,{mode,means:{aircraft_total:6},showMeans:false}).includes('class="mean-line"')));
 test(mode+' missing date remains selectable',()=>assert.ok(trendChart(data,{mode,selected:'2026-11-15'}).includes('data-chart-date="2026-11-15"')));
 test(mode+' null mean is omitted',()=>assert.ok(!trendChart(data,{mode,means:{aircraft_total:null}}).includes('data-mean="aircraft_total"')));
}
test('line breaks at missing dates',()=>assert.ok(trendChart(data).includes('d="M40,30  M980,210"')));
console.log(`${count} chart tests passed`);
