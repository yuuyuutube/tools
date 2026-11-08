export const LAB_PAGES=[
  {id:'composer',label:'編曲器',href:'./'},
  {id:'card',label:'分享卡片',href:'?view=card&demo=1'},
  {id:'box',label:'音樂盒',href:'?view=box'},
  {id:'archaeology',label:'鈴聲考古',href:'?view=archaeology'},
] as const;
export type LabPage=typeof LAB_PAGES[number]['id'];
export function mountLabNavigation(current:LabPage) {
  const nav=document.createElement('nav');nav.className='lab-nav';nav.setAttribute('aria-label','BEEP LAB 工具導覽');
  LAB_PAGES.forEach(page=>{const link=document.createElement('a');link.href=page.href;link.textContent=page.label;if(page.id===current)link.setAttribute('aria-current','page');nav.append(link);});
  document.querySelector('.site-header')!.after(nav);
}
