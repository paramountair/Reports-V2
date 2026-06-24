

const periodType = document.getElementById('periodType');
const techSelect = document.getElementById('techSelect');
const generate = document.getElementById('generate');
const exportCsv = document.getElementById('exportCsv');
const pageTitle = document.getElementById('pageTitle');
const pageIntro = document.getElementById('pageIntro');
const deviceNum = document.getElementById('deviceNum');
const periodLabel = document.getElementById('periodLabel');
const kQuotes = document.getElementById('kQuotes');
const kConversion = document.getElementById('kConversion');
const kRevenue = document.getElementById('kRevenue');
const kEgp = document.getElementById('kEgp');

const fmtMoney = n => new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0}).format(n||0);
const fmtNum = n => new Intl.NumberFormat('en-AU',{maximumFractionDigits:0}).format(n||0);
const fmtPct = n => `${((n||0)*100).toFixed(1)}%`;
const parseDate = s => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); };
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const addDays = (d,days) => { const x=new Date(d); x.setDate(x.getDate()+days); return x; };
const labelDate = d => d.toLocaleDateString('en-AU',{day:'2-digit',month:'short',year:'numeric'});
const allWeeks=[...new Set(QUOTES_DATA.map(d=>d.week))].sort();
const techNames=[...new Set(TECH_DATA.map(d=>d.technician))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
const years=[...new Set(allWeeks.map(w=>parseDate(w).getFullYear()))].sort();
const seasons={Summer:[12,1,2],Autumn:[3,4,5],Winter:[6,7,8],Spring:[9,10,11]};
const lossReasons=['Price','No response','Competitor awarded','Scope changed','Timing','Budget deferred'];
function seeded(s){let h=2166136261; for(let i=0;i<s.length;i++){h^=s.charCodeAt(i); h+= (h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24)} return Math.abs(h>>>0)/4294967295}
function labelWeek(w){return `${labelDate(parseDate(w))} – ${labelDate(addDays(parseDate(w),6))}`}
function init(){
  techNames.forEach(t=>techSelect.add(new Option(t,t)));
  document.querySelectorAll('#mainNav button').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
  ['periodType','techSelect'].forEach(id=>document.getElementById(id).addEventListener('change',update));
  generate.onclick=update; exportCsv.onclick=downloadCsv; update();
}
function showPage(page){
  document.querySelectorAll('#mainNav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===page));
  const titles={overview:['Executive Overview','Headline performance across quoting, margin and technician activity.','01'],quotes:['Quote Activity','Quote volume, ageing, revenue and weekly detail.','02'],technicians:['Technician Performance','Individual technician statistics, ratios and maintenance-hour performance.','03'],margins:['Margins & Win Rate','Average EGP, target tracking and conversion quality.','04'],losses:['Loss Reasons','Quote losses by reason, count, value and share.','05']};
  pageTitle.textContent=titles[page][0]; pageIntro.textContent=titles[page][1]; deviceNum.textContent=titles[page][2];
}
function selectedWeeks(){
  const type=periodType.value;
  const latestWeek=allWeeks[allWeeks.length-1];
  const latestDate=parseDate(latestWeek);

  if(type==='Weekly') return [latestWeek];
  if(type==='4-Weekly') return allWeeks.slice(-4);
  if(type==='Monthly'){
    const latestMonth=latestWeek.slice(0,7);
    return allWeeks.filter(w=>w.slice(0,7)===latestMonth);
  }
  if(type==='Yearly'){
    const latestYear=latestDate.getFullYear();
    return allWeeks.filter(w=>parseDate(w).getFullYear()===latestYear);
  }
  if(type==='Seasonally'){
    const month=latestDate.getMonth()+1;
    const currentSeason=Object.keys(seasons).find(season=>seasons[season].includes(month));
    const latestYear=latestDate.getFullYear();
    return allWeeks.filter(w=>{
      const d=parseDate(w);
      return d.getFullYear()===latestYear && seasons[currentSeason].includes(d.getMonth()+1);
    });
  }
  return allWeeks.slice(-4);
}
function aggregateQuotes(rows){return rows.reduce((a,r)=>{a.created+=r.created_count||0; a.won+=r.won_count||0; a.createdValue+=r.created_value||0; a.wonValue+=r.won_value||0; a.pending+=r.pending_count||0; a.a0+=r.age_0_7||0; a.a1+=r.age_8_14||0; a.a2+=r.age_15_30||0; a.a3+=r.age_31_plus||0; a.egpAll+=(r.avg_gross_margin_created||0)*(r.created_count||0); a.egpWon+=(r.avg_gross_margin_won||0)*(r.won_count||0); return a},{created:0,won:0,createdValue:0,wonValue:0,pending:0,a0:0,a1:0,a2:0,a3:0,egpAll:0,egpWon:0});}
function techAgg(rows){const m={}; rows.forEach(r=>{const t=r.technician; if(!m[t])m[t]={technician:t,att:0,quotes:0,value:0,egpW:0,maintHours:0,maintJobs:0}; m[t].att+=r.attendances||0; m[t].quotes+=r.quotes_generated||0; m[t].value+=r.total_value||0; m[t].egpW+=(r.avg_nett_egp||0)*(r.quotes_generated||0); m[t].maintHours+=r.maint_hours||0; m[t].maintJobs+=r.maint_jobs_attended||0;}); return Object.values(m).map(x=>({...x,ratio:x.att?x.quotes/x.att:0, maintRatio:x.maintHours?x.quotes/x.maintHours:0, egp:x.quotes?x.egpW/x.quotes:0}));}
function update(){
  const weeks=selectedWeeks(); const qRows=QUOTES_DATA.filter(r=>weeks.includes(r.week)); let tRows=TECH_DATA.filter(r=>weeks.includes(r.week)); if(techSelect.value!=='All technicians') tRows=tRows.filter(r=>r.technician===techSelect.value);
  const q=aggregateQuotes(qRows); kQuotes.textContent=fmtNum(q.created); kConversion.textContent=fmtPct(q.created?q.won/q.created:0); kRevenue.textContent=fmtMoney(q.wonValue); kEgp.textContent=fmtPct(q.won?q.egpWon/q.won:0); periodLabel.textContent=weeks.length?`${labelDate(parseDate(weeks[0]))} – ${labelDate(addDays(parseDate(weeks[weeks.length-1]),6))}`:'No data';
  renderAll(qRows,tRows,q);
}
function renderAll(qRows,tRows,q){
  const techs=techAgg(tRows).sort((a,b)=>b.value-a.value);
  barLine('chartQuoteValue', qRows.slice(-24).map(r=>({label:r.week.slice(5),bar:r.created_value,line:r.won_value})), '$ Total', '$ Won');
  lineChart('chartWinRate', qRows.slice(-52).map(r=>({label:r.week.slice(5),v:r.created_count?r.won_count/r.created_count:0})), 0, 1, false);
  egpChart('chartEgpOverview', qRows.slice(-52).map(r=>({label:r.week.slice(5),a:r.avg_gross_margin_created,w:r.avg_gross_margin_won})));
  donut('chartVolumeMix',[['Won',q.won],['Pending',q.pending],['Lost/Other',Math.max(q.created-q.won-q.pending,0)]]);
  barLine('chartQuoteCount', qRows.slice(-30).map(r=>({label:r.week.slice(5),bar:r.created_count,line:r.won_count})), 'Raised', 'Won');
  hbar('chartAgeing',[['0–7 days',q.a0],['8–14 days',q.a1],['15–30 days',q.a2],['31+ days',q.a3]]);
  table('quoteTable',['Week','Raised','Won','Conversion','Quoted $','Won $','Avg EGP'],qRows.slice().reverse().map(r=>[labelWeek(r.week),r.created_count,r.won_count,fmtPct(r.created_count?r.won_count/r.created_count:0),fmtMoney(r.created_value),fmtMoney(r.won_value),fmtPct(r.avg_gross_margin_won)]));
  hbar('chartTopTechs',techs.slice(0,10).map(t=>[t.technician,t.value]),true);
  hbar('chartTechRatio',techs.slice().sort((a,b)=>b.ratio-a.ratio).slice(0,10).map(t=>[t.technician,t.ratio]));
  hbar('chartMaintRatio',techs.slice().sort((a,b)=>b.maintRatio-a.maintRatio).slice(0,10).map(t=>[t.technician,t.maintRatio]));
  table('techTable',['Technician','Attendances','Quotes','Quote/Attendance','Maint Hours','Quote/Maint Hr','Quoted $','Avg EGP'],techs.map(t=>[t.technician,fmtNum(t.att),fmtNum(t.quotes),t.ratio.toFixed(3),t.maintHours.toFixed(1),t.maintRatio.toFixed(3),fmtMoney(t.value),fmtPct(t.egp)]), row=>{techSelect.value=row[0];update();showPage('technicians')});
  const detail=tRows.filter(r=>techSelect.value==='All technicians'||r.technician===techSelect.value).reduce((m,r)=>{if(!m[r.week])m[r.week]={label:r.week.slice(5),bar:0,line:0};m[r.week].bar+=r.attendances||0;m[r.week].line+=r.quotes_generated||0;return m},{}); barLine('chartTechDetail',Object.values(detail).slice(-30),'Attendances','Quotes');
  egpChart('chartEgp', qRows.map(r=>({label:r.week.slice(5),a:r.avg_gross_margin_created,w:r.avg_gross_margin_won})));
  lineChart('chartWinCountValue', qRows.map(r=>({label:r.week.slice(5),v:r.created_count?r.won_count/r.created_count:0,v2:r.created_value?r.won_value/r.created_value:0})),0,1,true);
  table('marginTable',['Technician','Quotes','Quoted $','Average Nett EGP','Target Gap'],techs.map(t=>[t.technician,fmtNum(t.quotes),fmtMoney(t.value),fmtPct(t.egp),fmtPct(t.egp-.55)]));
  const losses=lossData(qRows); hbar('chartLossReasons',losses.map(x=>[x.reason,x.count])); hbar('chartLostValue',losses.map(x=>[x.reason,x.value]),true); const totalLoss=losses.reduce((s,x)=>s+x.count,0); table('lossTable',['Reason','Count','Share','Lost $','Average $'],losses.map(x=>[x.reason,x.count,fmtPct(totalLoss?x.count/totalLoss:0),fmtMoney(x.value),fmtMoney(x.count?x.value/x.count:0)]));
}
function lossData(qRows){const totals={}; lossReasons.forEach(r=>totals[r]={reason:r,count:0,value:0}); qRows.forEach(q=>{let lost=Math.max(q.created_count-q.won_count-q.pending_count,0)+Math.round((q.pending_count||0)*.35); lossReasons.forEach(reason=>{const p=.08+seeded(q.week+reason)*.25; const c=Math.round(lost*p); totals[reason].count+=c; totals[reason].value+=c*((q.created_value||0)/Math.max(q.created_count||1,1))*(.75+seeded(reason+q.week)*.8);});}); return Object.values(totals).sort((a,b)=>b.count-a.count)}
function svgWrap(id,content){document.getElementById(id).innerHTML=`<svg viewBox="0 0 760 320" preserveAspectRatio="none">${content}</svg>`}
function lineChart(id,data,min=0,max=null,two=false){if(!data.length)return svgWrap(id,''); max=max??Math.max(...data.map(d=>d.v),.01); const W=760,H=320,L=46,R=20,T=20,B=40,plotW=W-L-R,plotH=H-T-B; const x=i=>L+(data.length<=1?0:i*plotW/(data.length-1)); const y=v=>T+plotH-(v-min)/(max-min)*plotH; let grid=`<line class="axis" x1="${L}" x2="${W-R}" y1="${y(.55)}" y2="${y(.55)}"></line><text class="label" x="${W-R-70}" y="${y(.55)-5}">55% target</text>`; const path=vals=>vals.map((d,i)=>(i?'L':'M')+x(i)+' '+y(d)).join(' '); let c=`${grid}<path class="line1" d="${path(data.map(d=>d.v))}"/>`; if(two)c+=`<path class="line2" d="${path(data.map(d=>d.v2||0))}"/>`; c+=`<text class="legend" x="${L}" y="${H-12}">${data[0].label}</text><text class="legend" x="${W-R-60}" y="${H-12}">${data[data.length-1].label}</text>`; svgWrap(id,c)}
function egpChart(id,data){lineChart(id,data.map(d=>({label:d.label,v:d.w||0,v2:d.a||0})),0,0.8,true)}
function barLine(id,data,barLabel,lineLabel){if(!data.length)return svgWrap(id,''); const W=760,H=320,L=46,R=20,T=20,B=42,plotW=W-L-R,plotH=H-T-B; const max=Math.max(...data.flatMap(d=>[d.bar,d.line]),1); const bw=Math.max(3,plotW/data.length*.58); const x=i=>L+i*plotW/data.length+plotW/data.length*.21; const y=v=>T+plotH-v/max*plotH; let c='<line class="axis" x1="46" x2="740" y1="278" y2="278"/>'; data.forEach((d,i)=>{c+=`<rect class="bar" x="${x(i)}" y="${y(d.bar)}" width="${bw}" height="${T+plotH-y(d.bar)}" rx="3"/>`}); c+=`<path class="line2" d="${data.map((d,i)=>(i?'L':'M')+(x(i)+bw/2)+' '+y(d.line)).join(' ')}"/>`; c+=`<text class="legend" x="54" y="18">${barLabel}</text><text class="legend" x="160" y="18">${lineLabel}</text>`; svgWrap(id,c)}
function hbar(id,items,money=false){if(!items.length)return svgWrap(id,''); const W=760,H=320,L=150,R=34,T=18,B=20,plotW=W-L-R,rowH=(H-T-B)/items.length; const max=Math.max(...items.map(x=>x[1]),1); let c=''; items.forEach((it,i)=>{const y=T+i*rowH+5,w=it[1]/max*plotW; c+=`<text class="label" x="8" y="${y+rowH*.55}">${it[0]}</text><rect class="bar" x="${L}" y="${y}" width="${w}" height="${Math.max(6,rowH-10)}" rx="6"/><text class="value-label" x="${Math.min(L+w+8,W-110)}" y="${y+rowH*.55}">${money?fmtMoney(it[1]):(it[1]<1?it[1].toFixed(3):fmtNum(it[1]))}</text>`}); svgWrap(id,c)}
function donut(id,items){const total=items.reduce((s,x)=>s+x[1],0)||1; let x=170,y=160,r=100,circ=2*Math.PI*r,off=0,c=''; items.forEach((it,i)=>{const frac=it[1]/total; c+=`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${i==0?'#2C5F7C':i==1?'#E87722':'#d6a87c'}" stroke-width="52" stroke-dasharray="${frac*circ} ${circ}" stroke-dashoffset="${-off}" transform="rotate(-90 ${x} ${y})"/>`; off+=frac*circ;}); c+=`<circle cx="${x}" cy="${y}" r="66" fill="white"/><text class="value-label" x="${x-28}" y="${y+5}">${fmtNum(total)}</text>`; items.forEach((it,i)=>c+=`<rect x="390" y="${90+i*48}" width="18" height="18" rx="4" fill="${i==0?'#2C5F7C':i==1?'#E87722':'#d6a87c'}"/><text class="legend" x="420" y="${105+i*48}">${it[0]} · ${fmtNum(it[1])}</text>`); svgWrap(id,c)}
function table(id,headers,rows,onClick){const el=document.getElementById(id); el.innerHTML='<thead><tr>'+headers.map(h=>`<th>${h}</th>`).join('')+'</tr></thead><tbody>'+rows.map((r,i)=>`<tr data-i="${i}">`+r.map(c=>`<td>${c}</td>`).join('')+'</tr>').join('')+'</tbody>'; if(onClick)el.querySelectorAll('tbody tr').forEach(tr=>tr.onclick=()=>onClick(rows[+tr.dataset.i]));}
function downloadCsv(){const weeks=selectedWeeks(); const rows=QUOTES_DATA.filter(r=>weeks.includes(r.week)); const csv=[Object.keys(rows[0]||{}).join(',')].concat(rows.map(r=>Object.values(r).join(','))).join('\n'); const blob=new Blob([csv],{type:'text/csv'}), a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='paramount_fake_quote_report.csv'; a.click();}
init();
