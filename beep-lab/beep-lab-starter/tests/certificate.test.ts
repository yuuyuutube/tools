import {describe,it,expect} from 'vitest';
import {certificateDetails,canIssueCertificate} from '../src/certificate';
import {repairLevels} from '../src/music-core/archaeology';
describe('completion certificate',()=>{
  const ids=repairLevels().map(level=>level.id);
  it('requires all eight actual level IDs, not the count of arbitrary completions',()=>{
    expect(ids).toHaveLength(8);expect(canIssueCertificate(ids.slice(0,6),ids)).toBe(false);
    expect(canIssueCertificate(ids.slice(0,7),ids)).toBe(false);expect(canIssueCertificate([...ids.slice(0,7),'unknown'],ids)).toBe(false);
    expect(canIssueCertificate(Array(8).fill(ids[0]),ids)).toBe(false);expect(canIssueCertificate([],[])).toBe(false);
    expect(canIssueCertificate(ids,ids)).toBe(true);
    expect(canIssueCertificate([...ids.filter(id=>id!=='can-can'&&id!=='william-tell'),'fate','swan-lake'],ids)).toBe(false);
  });
  it('uses the device calendar date, including local midnight and single-digit months',()=>{
    expect(certificateDetails(' 小悠 ',8,new Date(2026,10,8,0,5))).toMatchObject({name:'小悠',levelCount:8,dateLabel:'2026 年 11 月 08 日',dateISO:'2026-11-08'});
    expect(certificateDetails('Yoyo',8,new Date(2027,0,1,23,59)).dateISO).toBe('2027-01-01');
  });
  it('normalizes names without interpreting user text as markup',()=>{
    expect(certificateDetails('  Yoyo   Huang  ',8).name).toBe('Yoyo Huang');
    expect(certificateDetails('e\u0301',8).name).toBe('é');expect(certificateDetails('<b>小悠</b>',8).name).toBe('<b>小悠</b>');
    expect(certificateDetails('小\u202e悠',8).name).toBe('小悠');
  });
  it('rejects empty or overlong names and invalid certificate metadata',()=>{
    expect(()=>certificateDetails('  ',8)).toThrow('輸入');expect(()=>certificateDetails('悠'.repeat(25),8)).toThrow('24');
    expect(certificateDetails('悠'.repeat(24),8).name).toHaveLength(24);
    expect(()=>certificateDetails('Yoyo',0)).toThrow();expect(()=>certificateDetails('Yoyo',8,new Date('bad'))).toThrow();
  });
});
