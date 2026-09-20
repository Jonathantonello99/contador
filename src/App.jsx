import React,{useEffect,useMemo,useRef,useState}from'react';
const CV='https://docs.opencv.org/4.x/opencv.js',R=.04;
const median=a=>{let b=[...a].sort((x,y)=>x-y),i=Math.floor(b.length/2);return b.length?(b.length%2?b[i]:(b[i-1]+b[i])/2):0};
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const sd=a=>{let m=mean(a);return a.length>1?Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1)):0};
export default function App(){
 const v=useRef(),canvas=useRef(),work=useRef(),stream=useRef(),bg=useRef(),prof=useRef(),hist=useRef([]),raf=useRef(),last=useRef(0);
 const[ready,setReady]=useState(false),[cams,setCams]=useState([]),[cam,setCam]=useState(''),[count,setCount]=useState(0),[status,setStatus]=useState('Carregando OpenCV...'),[warn,setWarn]=useState(''),[bgok,setBgok]=useState(false),[profile,setProfile]=useState(null),[cal,setCal]=useState(false),[thr,setThr]=useState(30),[minA,setMinA]=useState(20),[run,setRun]=useState(true),[overlay,setOverlay]=useState(true),[debug,setDebug]=useState(false),[avgA,setAvgA]=useState(0),[avgD,setAvgD]=useState(0),[clusters,setClusters]=useState([]);
 useEffect(()=>{if(!document.querySelector(`script[src="${CV}"]`)){let s=document.createElement('script');s.src=CV;s.async=true;document.body.appendChild(s)}let t=setInterval(async()=>{try{if(window.cv){if(window.cv instanceof Promise)window.cv=await window.cv;if(window.cv.Mat){clearInterval(t);setReady(true);setStatus('OpenCV pronto')}}}catch{}},200);return()=>clearInterval(t)},[]);
 const stop=()=>{stream.current?.getTracks().forEach(t=>t.stop());stream.current=null};
 const list=async()=>{try{let p=await navigator.mediaDevices.getUserMedia({video:true});p.getTracks().forEach(t=>t.stop());let c=(await navigator.mediaDevices.enumerateDevices()).filter(x=>x.kind==='videoinput');setCams(c);if(!cam&&c[0])setCam(c[0].deviceId)}catch{setStatus('Autorize a câmera no Chrome')}};
 useEffect(()=>{list();return()=>stop()},[]);
 useEffect(()=>{if(!cam)return;(async()=>{try{stop();let s=await navigator.mediaDevices.getUserMedia({video:{deviceId:{exact:cam},width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:30}},audio:false});stream.current=s;v.current.srcObject=s;await v.current.play();bg.current?.delete();bg.current=null;prof.current=null;hist.current=[];setBgok(false);setProfile(null);setCount(0);setStatus('Câmera ativa • calibre o fundo vazio')}catch{setStatus('Falha ao abrir a câmera')}})()},[cam]);
 const frame=()=>{if(!v.current||v.current.readyState<2||!v.current.videoWidth)return null;let w=Math.min(1440,v.current.videoWidth),h=Math.round(w*v.current.videoHeight/v.current.videoWidth),c=work.current;c.width=w;c.height=h;c.getContext('2d',{willReadFrequently:true}).drawImage(v.current,0,0,w,h);return window.cv.imread(c)};
 const rect=m=>new window.cv.Rect(Math.round(m.cols*R),Math.round(m.rows*R),Math.round(m.cols*(1-2*R)),Math.round(m.rows*(1-2*R)));
 const gray=f=>{let cv=window.cv,s=f.roi(rect(f)),g=new cv.Mat(),b=new cv.Mat();cv.cvtColor(s,g,cv.COLOR_RGBA2GRAY);cv.GaussianBlur(g,b,new cv.Size(3,3),0);s.delete();g.delete();return b};
 const mask=f=>{if(!bg.current)return null;let cv=window.cv,g=gray(f),d=new cv.Mat(),m=new cv.Mat();if(g.rows!==bg.current.rows){g.delete();d.delete();m.delete();return null}cv.absdiff(g,bg.current,d);cv.threshold(d,m,thr,255,cv.THRESH_BINARY);let k=cv.getStructuringElement(cv.MORPH_ELLIPSE,new cv.Size(3,3));cv.morphologyEx(m,m,cv.MORPH_OPEN,k);cv.morphologyEx(m,m,cv.MORPH_CLOSE,k);k.delete();g.delete();d.delete();return m};
 const cc=m=>{let cv=window.cv,l=new cv.Mat(),s=new cv.Mat(),c=new cv.Mat(),n=cv.connectedComponentsWithStats(m,l,s,c,8,cv.CV_32S);return{n,l,s,c}};
 const calBg=async()=>{if(!ready||cal)return;let cv=window.cv,a=null,n=0;setCal(true);setStatus('Capturando referência do fundo...');try{for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,60));let f=frame();if(!f)continue;let g=gray(f),x=new cv.Mat();g.convertTo(x,cv.CV_32F);if(!a)a=cv.Mat.zeros(x.rows,x.cols,cv.CV_32F);cv.add(a,x,a);n++;x.delete();g.delete();f.delete()}if(n<6)throw Error('frames insuficientes');a.convertTo(a,cv.CV_32F,1/n);let b=new cv.Mat();a.convertTo(b,cv.CV_8U);a.delete();bg.current?.delete();bg.current=b;prof.current=null;setBgok(true);setProfile(null);setStatus('Fundo pronto • coloque 20–50 grãos separados')}catch(e){setStatus('Falha: '+e.message)}finally{setCal(false)}};
 const calGrains=()=>{let f=frame();if(!f)return;let m=mask(f);if(!m){f.delete();return}let cv=window.cv,q=cc(m),items=[];for(let i=1;i<q.n;i++){let a=q.s.intAt(i,cv.CC_STAT_AREA),w=q.s.intAt(i,cv.CC_STAT_WIDTH),h=q.s.intAt(i,cv.CC_STAT_HEIGHT),ratio=Math.max(w,h)/Math.max(1,Math.min(w,h));if(a>=minA&&a<m.rows*m.cols*.01&&ratio<2.7)items.push({a,d:2*Math.sqrt(a/Math.PI),ratio})}q.l.delete();q.s.delete();q.c.delete();m.delete();f.delete();if(items.length<8){setStatus('Mostre pelo menos 8 grãos separados');return}let A=items.map(x=>x.a),D=items.map(x=>x.d);let p={samples:items.length,areaMedian:median(A),areaMean:mean(A),areaStd:sd(A),diameter:median(D),ratio:median(items.map(x=>x.ratio))};prof.current=p;setProfile(p);hist.current=[];setStatus(`Perfil aprendido com ${items.length} grãos • contagem ativa`)};
 const analyze=m=>{let cv=window.cv,q=cc(m),p=prof.current,total=0,totalArea=0,objects=[],dbg=[];for(let i=1;i<q.n;i++){let area=q.s.intAt(i,cv.CC_STAT_AREA);if(area<minA)continue;let x=q.s.intAt(i,cv.CC_STAT_LEFT),y=q.s.intAt(i,cv.CC_STAT_TOP),w=q.s.intAt(i,cv.CC_STAT_WIDTH),h=q.s.intAt(i,cv.CC_STAT_HEIGHT),cx=q.c.doubleAt(i,0),cy=q.c.doubleAt(i,1),units=1,confidence=1,areaEst=1,seeds=1;if(p){areaEst=Math.max(1,Math.round(area/p.areaMedian));let cluster=area>p.areaMedian*1.42||Math.max(w,h)>p.diameter*2.0;if(cluster){let lm=m.roi(new cv.Rect(x,y,w,h)),d=new cv.Mat(),pk=new cv.Mat(),mk=new cv.Mat();cv.distanceTransform(lm,d,cv.DIST_L2,3);let max=cv.minMaxLoc(d).maxVal,best=Infinity,bUnits=areaEst,bSeeds=1;for(let r of [.25,.30,.35,.40,.45,.50,.55,.60]){cv.threshold(d,pk,max*r,255,cv.THRESH_BINARY);pk.convertTo(pk,cv.CV_8U);let ns=Math.max(1,cv.connectedComponents(pk,mk,8,cv.CV_32S)-1),cand=Math.max(ns,areaEst),pred=area/cand,sizeErr=Math.abs(pred-p.areaMedian)/p.areaMedian,gap=Math.abs(ns-areaEst)/Math.max(1,areaEst),score=.8*sizeErr+.2*gap;if(score<best){best=score;bUnits=cand;bSeeds=ns}}units=Math.max(1,bUnits);seeds=bSeeds;confidence=Math.max(0,1-best);dbg.push({id:i,area,areaEst,seeds,units,confidence});lm.delete();d.delete();pk.delete();mk.delete()}}total+=units;totalArea+=area;objects.push({x:cx,y:cy,units,cluster:units>1,confidence})}q.l.delete();q.s.delete();q.c.delete();return{total,totalArea,objects,dbg,avg:total?totalArea/total:0}};
 const stable=x=>{let h=hist.current;h.push(x);if(h.length>9)h.shift();if(h.length<4)return x;let f={};h.forEach(v=>f[v]=(f[v]||0)+1);let b=Object.entries(f).sort((a,b)=>b[1]-a[1])[0];return b[1]>=4?+b[0]:Math.round(median(h))};
 const render=(f,m,a)=>{let cv=window.cv,z=f.clone(),r=rect(f),view=z.roi(r);if(overlay){let pink=new cv.Mat(view.rows,view.cols,view.type(),new cv.Scalar(255,20,147,255)),b=new cv.Mat();cv.addWeighted(view,.55,pink,.45,0,b);b.copyTo(view,m);a.objects.forEach(o=>cv.circle(view,new cv.Point(Math.round(o.x),Math.round(o.y)),o.cluster?5:2,o.cluster?new cv.Scalar(255,215,0,255):new cv.Scalar(255,255,255,255),-1));pink.delete();b.delete()}cv.rectangle(z,new cv.Point(r.x,r.y),new cv.Point(r.x+r.width,r.y+r.height),new cv.Scalar(255,20,147,255),2);cv.imshow(canvas.current,z);view.delete();z.delete()};
 useEffect(()=>{if(!ready)return;let loop=now=>{raf.current=requestAnimationFrame(loop);if(!run||now-last.current<170)return;last.current=now;let f=frame();if(!f)return;try{if(!bg.current){window.cv.imshow(canvas.current,f);return}let m=mask(f);if(!m)return;let a=analyze(m),n=stable(a.total);setCount(n);setAvgA(Math.round(a.avg));setAvgD(a.avg?2*Math.sqrt(a.avg/Math.PI):0);setClusters(a.dbg.slice(0,12));setWarn(a.total!==n?`Estabilizando • instantâneo ${a.total}`:'');render(f,m,a);m.delete()}catch(e){console.error(e);setWarn('Falha em um frame; continuando')}finally{f.delete()}};raf.current=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf.current)},[ready,run,thr,minA,overlay]);
 const quality=useMemo(()=>profile?Math.round(Math.max(0,Math.min(100,100-(profile.areaStd/profile.areaMean)*180))):0,[profile]);
 return <div className="app"><canvas ref={work} hidden/><header><div><h1>Contador de Grãos V2</h1><p>OpenCV.js • calibração estatística • separação adaptativa</p></div><b className={ready?'ok':'wait'}>{ready?'OpenCV pronto':'Carregando...'}</b></header><main><section className="camera"><div className="stage"><video ref={v} autoPlay playsInline muted/><canvas ref={canvas}/></div><div className="bar"><select value={cam} onChange={e=>setCam(e.target.value)}>{cams.map((d,i)=><option key={d.deviceId} value={d.deviceId}>{d.label||`Câmera ${i+1}`}</option>)}</select><button onClick={list}>Atualizar</button><button onClick={()=>setRun(x=>!x)}>{run?'Pausar':'Continuar'}</button></div>{debug&&clusters.length>0&&<div className="debug"><h3>Debug de aglomerados</h3>{clusters.map(c=><div className="cluster" key={c.id}>#{c.id} • área {Math.round(c.area)} • área→{c.areaEst} • centros→{c.seeds} • final→{c.units} • confiança {Math.round(c.confidence*100)}%</div>)}</div>}</section><aside><div className="card center"><small>QUANTIDADE</small><div className="number">{count.toLocaleString('pt-BR')}</div><div className="metrics"><div><small>TAMANHO MÉDIO</small><b>{avgA.toLocaleString('pt-BR')} px²</b></div><div><small>DIÂMETRO EQUIV.</small><b>{avgD.toFixed(1)} px</b></div></div><div className="msg">{status}</div><div className={warn?'count-status stabilizing':'count-status precise'} aria-live="polite"><span className="status-icon">{warn?'●':'✓'}</span><span className="status-text">{warn||'Contagem precisa'}</span></div></div><div className="card"><h3>Calibração avançada</h3><p>1. Fundo vazio. 2. Depois, 20–50 grãos bem separados.</p><button className="pink" disabled={!ready||cal||!stream.current} onClick={calBg}>{cal?'CAPTURANDO...':'1. CALIBRAR FUNDO'}</button><button disabled={!bgok} onClick={calGrains}>2. APRENDER PERFIL DOS GRÃOS</button>{profile&&<div className="profile"><span>Amostras <b>{profile.samples}</b></span><span>Área mediana <b>{Math.round(profile.areaMedian)} px²</b></span><span>Área média <b>{Math.round(profile.areaMean)} px²</b></span><span>Desvio <b>{Math.round(profile.areaStd)} px²</b></span><span>Diâmetro típico <b>{profile.diameter.toFixed(1)} px</b></span><span>Qualidade <b>{quality}%</b></span></div>}</div><div className="card"><h3>Ajustes</h3><label>Sensibilidade: {thr}<input type="range" min="8" max="100" value={thr} onChange={e=>setThr(+e.target.value)}/></label><label>Área mínima: {minA}<input type="range" min="5" max="500" value={minA} onChange={e=>setMinA(+e.target.value)}/></label><label><input type="checkbox" checked={overlay} onChange={e=>setOverlay(e.target.checked)}/> Overlay rosa</label><label><input type="checkbox" checked={debug} onChange={e=>setDebug(e.target.checked)}/> Debug / precisão</label></div></aside></main></div>;
}
  const workCanvasRef = useRef(null);

  const streamRef = useRef(null);

  const backgroundRef = useRef(null);
  const grainProfileRef = useRef(null);

  const countHistoryRef = useRef([]);

  const animationFrameRef = useRef(null);
  const lastProcessingTimeRef = useRef(0);

  /*
   * ==========================================================
   * ESTADOS
   * ==========================================================
   */

  const [openCvReady, setOpenCvReady] =
    useState(false);

  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState("");

  const [count, setCount] = useState(0);

  const [status, setStatus] = useState(
    "Carregando OpenCV..."
  );

  const [warning, setWarning] = useState("");

  const [backgroundCalibrated, setBackgroundCalibrated] =
    useState(false);

  const [grainProfile, setGrainProfile] =
    useState(null);

  const [calibrating, setCalibrating] =
    useState(false);

  const [threshold, setThreshold] = useState(30);
  const [minArea, setMinArea] = useState(20);

  const [running, setRunning] = useState(true);

  const [showOverlay, setShowOverlay] =
    useState(true);

  const [debugMode, setDebugMode] =
    useState(false);

  const [averageArea, setAverageArea] =
    useState(0);

  const [averageDiameter, setAverageDiameter] =
    useState
