import {describe,it,expect} from 'vitest';
import {newRepairFlow,advanceRepair,markRepairHeard,visitRepair,canVisitRepair,finishRepair,invalidateRepair} from '../src/repair-flow';
describe('guided repair journey',()=>{
  it('starts at the original and requires each listening action before advancing',()=>{
    let flow=newRepairFlow();expect(advanceRepair(flow).step).toBe(1);expect(visitRepair(flow,3).step).toBe(1);
    flow=advanceRepair(markRepairHeard(flow,'reference'));expect(flow.step).toBe(2);expect(advanceRepair(flow).step).toBe(2);
    flow=advanceRepair(markRepairHeard(flow,'damaged'));expect(flow.step).toBe(3);expect(advanceRepair(flow).step).toBe(4);
  });
  it('allows revisiting unlocked steps without resetting music-related progress',()=>{
    let flow=advanceRepair(markRepairHeard(newRepairFlow(),'reference'));flow=advanceRepair(markRepairHeard(flow,'damaged'));flow=advanceRepair(flow);
    const revisited=visitRepair(flow,1);expect(revisited.heardDamaged).toBe(true);expect(revisited.furthest).toBe(4);expect(visitRepair(revisited,4).step).toBe(4);expect(canVisitRepair(flow,5)).toBe(false);
  });
  it('keeps incorrect answers at review and shows success only for a passed result',()=>{
    const failed=finishRepair(newRepairFlow(),false);expect(failed.step).toBe(4);expect(canVisitRepair(failed,5)).toBe(false);
    const passed=finishRepair(failed,true);expect(passed.step).toBe(5);expect(passed.passed).toBe(true);
    const edited=invalidateRepair(passed);expect(edited.step).toBe(3);expect(edited.passed).toBe(false);expect(canVisitRepair(edited,5)).toBe(false);
  });
  it('replaying starts a fresh guided journey, without mutating an old completed state',()=>{
    const passed=finishRepair(newRepairFlow(),true);const replay=newRepairFlow();expect(replay).toMatchObject({step:1,furthest:1,heardReference:false,heardDamaged:false,passed:false});expect(passed.passed).toBe(true);
  });
});
