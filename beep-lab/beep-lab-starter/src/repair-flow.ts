export type RepairStep=1|2|3|4|5;
export type RepairFlow={step:RepairStep;furthest:RepairStep;heardReference:boolean;heardDamaged:boolean;passed:boolean};
export const newRepairFlow=():RepairFlow=>({step:1,furthest:1,heardReference:false,heardDamaged:false,passed:false});
export function markRepairHeard(flow:RepairFlow,kind:'reference'|'damaged'):RepairFlow {
  return {...flow,...(kind==='reference'?{heardReference:true}:{heardDamaged:true})};
}
export function advanceRepair(flow:RepairFlow):RepairFlow {
  if(flow.step===1&&!flow.heardReference||flow.step===2&&!flow.heardDamaged||flow.step>=4)return flow;
  const step=(flow.step+1) as RepairStep;return {...flow,step,furthest:Math.max(flow.furthest,step) as RepairStep};
}
export function canVisitRepair(flow:RepairFlow,step:RepairStep){return step<=flow.furthest&&(step!==5||flow.passed);}
export function visitRepair(flow:RepairFlow,step:RepairStep):RepairFlow {return canVisitRepair(flow,step)?{...flow,step}:flow;}
export function finishRepair(flow:RepairFlow,passed:boolean):RepairFlow {
  return {...flow,step:passed?5:4,furthest:passed?5:4,passed};
}
export function invalidateRepair(flow:RepairFlow):RepairFlow {
  return {...flow,step:flow.step===5?3:flow.step,furthest:Math.min(flow.furthest,4) as RepairStep,passed:false};
}
