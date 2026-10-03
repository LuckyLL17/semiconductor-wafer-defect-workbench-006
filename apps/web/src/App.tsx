import {useEffect,useMemo,useState} from 'react';import './styles.css';
type Defect={id:string;x:number;y:number;size:number;kind:string;severity:string;score:number;review:string;note:string};
const api=async(url:string,init?:RequestInit)=>fetch(url,init).then(r=>r.json());
export default function App(){const [tab,setTab]=useState('map');const [data,setData]=useState<any>();const [spatial,setSpatial]=useState<any>();const [window,setWindow]=useState<any>();const [filter,setFilter]=useState('all');const [selected,setSelected]=useState<Defect>();
useEffect(()=>{api('/api/wafer/current').then(setData);api('/api/analysis/spatial').then(setSpatial);api('/api/analysis/process-window').then(setWindow)},[]);
const defects=useMemo(()=>spatial?.clusters??[],[spatial]);const review=async(review:string)=>{if(!selected)return;await api(`/api/defects/${selected.id}/review`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({review})});setSelected({...selected,review})};
return <main><header><div><span className="eyebrow">FAB PROCESS INTELLIGENCE / LOT REVIEW</span><h1>晶圆缺陷空间分布与工艺窗口分析工作台</h1><p>晶圆 {data?.wafer?.id??'加载中'} · {data?.wafer?.product} · {data?.wafer?.layer}</p></div><div className="status">在线 · 数据质量 98.4%</div></header><nav>{[['map','空间缺陷地图'],['window','工艺窗口'],['review','缺陷复核'],['compare','批次对比']].map(([id,label])=><button className={tab===id?'active':''} onClick={()=>setTab(id)} key={id}>{label}</button>)}</nav>{data&&<section className="metrics"><Metric label="缺陷总数" value={data.summary.defectCount}/><Metric label="高风险" value={data.summary.highRisk}/><Metric label="聚类" value={data.summary.clusterCount}/><Metric label="已确认" value={data.summary.confirmed}/></section>}{tab==='map'&&<section className="grid2"><div className="panel waferPanel"><div className="panelHead"><h2>300mm 晶圆缺陷分布</h2><span>自动检测 + 空间聚类</span></div><svg viewBox="0 0 100 100" className="wafer"><circle cx="50" cy="50" r="47"/><circle cx="50" cy="50" r="42" className="notch"/>{spatial&&Array.from({length:48},(_,i)=><circle key={i} cx={50+Math.cos(i*1.73)*(35+(i%7)*12)+(i%3)*3} cy={50+Math.sin(i*1.73)*(35+(i%7)*12)} r={.8+(i%6)*.2} className={i%13===0?'high':i%4===0?'medium':'low'} onClick={()=>setSelected({id:`D-${String(i+1).padStart(3,'0')}`,x:0,y:0,size:0,kind:'particle',severity:i%13===0?'high':i%4===0?'medium':'low',score:.8,review:'unreviewed',note:'候选缺陷'})}/>)}</svg><div className="legend"><span className="dot high"/>高风险 <span className="dot medium"/>中风险 <span className="dot low"/>低风险</div></div><div className="panel"><div className="panelHead"><h2>空间热点聚类</h2><span>按网格与线性缺陷聚类</span></div>{defects.slice(0,8).map((c:any)=><div className="cluster" key={c.id}><div><b>{c.id}</b><small>{c.kind} · {c.tool}</small></div><strong>{c.count} <small>点</small></strong><i className={c.maxSeverity}>{c.maxSeverity}</i></div>)}</div></section>}{tab==='window'&&<section className="grid2"><div className="panel"><div className="panelHead"><h2>工艺窗口与设备关联</h2><span>按设备统计实际批次</span></div>{window?.window.map((x:any)=><div className="windowRow"><b>{x.tool}</b><span>平均良率 {x.meanYield}%</span><span>温度 {x.temperature.min}—{x.temperature.max}°C</span><span>压力 {x.pressure.min}—{x.pressure.max} Torr</span><em>{x.recommended.length?'推荐窗口':'无稳定窗口'}</em></div>)}</div><div className="panel"><div className="panelHead"><h2>因子相关性</h2><span>跨批次分析</span></div>{window?.correlations.map((x:any)=><div className="corr"><div><b>{x.factor} → {x.metric}</b><small>{x.interpretation}</small></div><strong className={x.coefficient<0?'negative':''}>{x.coefficient}</strong></div>)}</div></section>}{tab==='review'&&<section className="grid2"><div className="panel"><div className="panelHead"><h2>缺陷复核队列</h2><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">全部</option><option value="high">高风险</option><option value="medium">中风险</option></select></div>{Array.from({length:12},(_,i)=>({id:`D-${String(i+1).padStart(3,'0')}`,x:0,y:0,size:0,kind:i%3?'particle':'scratch',severity:i%4===0?'high':'medium',score:.72+i*.01,review:'unreviewed',note:'等待工程师确认'})).filter(d=>filter==='all'||d.severity===filter).map(d=><div className="defectRow" onClick={()=>setSelected(d)}><b>{d.id}</b><span>{d.kind}</span><span className={d.severity}>{d.severity}</span><span>置信度 {d.score.toFixed(2)}</span></div>)}</div><div className="panel detail">{selected?<><span className="eyebrow">DEFECT DETAIL / {selected.id}</span><h2>{selected.kind} 缺陷候选</h2><p>检测置信度 {selected.score.toFixed(2)}，当前等级 {selected.severity}</p><textarea defaultValue={selected.note}/><div className="actions"><button onClick={()=>review('confirmed')}>确认缺陷</button><button className="ghost" onClick={()=>review('false_positive')}>标记误报</button></div></>:<div className="empty">选择一个缺陷查看检测证据与复核操作</div>}</div></section>}{tab==='compare'&&<ComparePanel/>}</main>}
function Metric({label,value}:{label:string;value:any}){return <div className="metric"><small>{label}</small><strong>{value}</strong></div>}
type Candidate={lot:string;layer:string;recipe:string;timestamp:string;defects:number;highRisk:number;yield:number;compatible:boolean;error?:string;reason?:string};
type CompareData={current:{lot:string;layer:string;recipe:string;defects:number;highRisk:number;yield:number};baseline:{lot:string;layer:string;recipe:string;defects:number;highRisk:number;yield:number};defaultBaseline:string;delta:{defects:number;highRisk:number;yield:number;directions:{defects:'up'|'down'|'flat';highRisk:'up'|'down'|'flat';yield:'up'|'down'|'flat'}}};
function ComparePanel(){
 const [candidates,setCandidates]=useState<Candidate[]>([]);
 const [compare,setCompare]=useState<CompareData>();
 const [selectedLot,setSelectedLot]=useState('');
 const [defaultLot,setDefaultLot]=useState('');
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const loadCompare=(lot:string,fallbackLot?:string)=>{setLoading(true);setError('');const qs=lot?`?baseline=${encodeURIComponent(lot)}`:'';fetch(`/api/analysis/compare${qs}`).then(async r=>{const body=await r.json();if(!r.ok)throw new Error(body.reason??body.error??'对比请求失败');setCompare(body);setSelectedLot(body.baseline.lot);setDefaultLot(body.defaultBaseline);}).catch(e=>{setError(String(e.message??e));if(fallbackLot)setSelectedLot(fallbackLot);}).finally(()=>setLoading(false));};
 useEffect(()=>{fetch('/api/lots/baselines').then(r=>r.json()).then((b:{candidates:Candidate[];defaultBaseline:string})=>{setCandidates(b.candidates);setDefaultLot(b.defaultBaseline);}).catch(()=>setError('基线批次列表加载失败'));loadCompare('');},[]);
 const onSelect=(lot:string)=>{if(!lot||loading)return;loadCompare(lot,selectedLot);};
 const compatible=candidates.filter(c=>c.compatible);
 const incompatible=candidates.filter(c=>!c.compatible);
 const rows=compare?([
  {key:'defects' as const,label:'缺陷数',unit:'个',adverse:'up',cur:compare.current.defects,base:compare.baseline.defects,d:compare.delta.defects,dir:compare.delta.directions.defects},
  {key:'highRisk' as const,label:'高风险数',unit:'个',adverse:'up',cur:compare.current.highRisk,base:compare.baseline.highRisk,d:compare.delta.highRisk,dir:compare.delta.directions.highRisk},
  {key:'yield' as const,label:'良率',unit:'%',adverse:'down',cur:compare.current.yield,base:compare.baseline.yield,d:compare.delta.yield,dir:compare.delta.directions.yield}
 ]):[];
 const arrow=(dir:string)=>dir==='up'?'▲':dir==='down'?'▼':'—';
 return <section className="grid2">
  <div className="panel">
   <div className="panelHead"><h2>基线批次选择</h2><span>同层 · 同工艺族批次可对比</span></div>
   <div className="baselinePick">
    <label>对比基线</label>
    <select value={selectedLot} disabled={loading||!candidates.length} onChange={e=>onSelect(e.target.value)}>
     {defaultLot&&<option value={defaultLot}>当前基线 {defaultLot}（默认）</option>}
     {compatible.filter(c=>c.lot!==defaultLot).map(c=><option key={c.lot} value={c.lot}>{c.lot} · {c.recipe}</option>)}
    </select>
    <button className="ghost" disabled={loading||!compare||selectedLot===defaultLot} onClick={()=>loadCompare(defaultLot,selectedLot)}>恢复默认基线</button>
   </div>
   {loading&&<div className="compareNote">正在重新计算对比指标…</div>}
   {error&&<div className="compareError">基线切换失败：{error}<br/>已保留当前选择 {selectedLot||'—'}</div>}
   <div className="candidateList">
    <div className="candidateTitle">可兼容批次（{compatible.length}）</div>
    {compatible.map(c=><div className={`candidate ${c.lot===selectedLot?'chosen':''}`} key={c.lot} onClick={()=>onSelect(c.lot)}><div><b>{c.lot}{c.lot===defaultLot&&<em className="baseTag">默认基线</em>}{c.lot===selectedLot&&<em className="baseTag current">使用中</em>}</b><small>{c.layer} · {c.recipe} · {c.timestamp.slice(0,10)}</small></div><span>{c.defects} 缺陷 / {c.highRisk} 高风险 / {c.yield}%</span></div>)}
    <div className="candidateTitle muted">不兼容批次（{incompatible.length}，已拦截不可选）</div>
    {incompatible.map(c=><div className="candidate blocked" key={c.lot}><div><b>{c.lot}</b><small>{c.layer} · {c.recipe}</small></div><span className="blockReason">{c.reason}</span></div>)}
   </div>
  </div>
  <div className="panel detail">
   <div className="panelHead"><h2>批次差异对比</h2><span>后端按所选基线重新计算</span></div>
   {!compare&&!error&&<div className="empty">加载对比数据中…</div>}
   {compare&&<>
    <div className="compareLots"><div><small>当前批次</small><b>{compare.current.lot}</b><span>{compare.current.layer} · {compare.current.recipe}</span></div><div className="vs">VS</div><div><small>基线批次</small><b>{compare.baseline.lot}</b><span>{compare.baseline.layer} · {compare.baseline.recipe}</span></div></div>
    <table className="compareTable"><thead><tr><th>指标</th><th>当前</th><th>基线</th><th>差异</th><th>方向</th></tr></thead><tbody>{rows.map(r=>{const worse=r.dir!=='flat'&&r.dir===r.adverse;const cls=r.dir==='flat'?'flat':worse?'bad':'good';return<tr key={r.key}><td>{r.label}</td><td>{r.cur}{r.unit==='%'?'%':''}</td><td>{r.base}{r.unit==='%'?'%':''}</td><td className={cls}>{r.d>0?'+':''}{r.d}{r.unit==='%'?'%':''}</td><td className={cls}>{arrow(r.dir)} {r.dir==='up'?'上升':r.dir==='down'?'下降':'持平'}{r.dir==='flat'?'':worse?'（不利）':'（有利）'}</td></tr>;})}</tbody></table>
    <p className="compareHint">缺陷数/高风险数上升或良率下降标记为不利方向；基线切换由后端重新计算，批次不存在或层级、工艺不兼容将被拒绝。</p>
   </>}
  </div>
 </section>;
}
