import { useMemo, useState } from 'react';
import { Smartphone, ScanLine, Target, Zap, RefreshCw, Copy, CheckCircle2, Info, ChevronRight, Gauge, Activity, Music2, ShieldCheck, Star, Send } from 'lucide-react';

type Device = { brand: string; model: string; platform: string; screen: string; dpr: number; cores: string; memory: string; touch: string; deviceClass: string; };
type Profile = { General: number; RedDot: number; '2x': number; '4x': number; Sniper: number; FreeLook: number; };
type Perf = { fps: number; refresh: number; score: string; };

const DB: Record<string, { class: string; sens: number; note: string }> = {
  'Samsung Galaxy A15': { class: 'Mid-range', sens: 1, note: 'Stable drag profile for the A15 display and touch response.' },
  'Samsung Galaxy A25': { class: 'Mid-range', sens: 3, note: 'Balanced profile with slightly faster Red Dot control.' },
  'Samsung Galaxy A55': { class: 'High-end', sens: 5, note: 'Faster profile suited to a smoother 120Hz-class experience.' },
  'Samsung Galaxy S23': { class: 'High-end', sens: 7, note: 'High-control profile for fast touch response and high refresh.' },
  'Xiaomi Redmi Note 13': { class: 'Mid-range', sens: 4, note: 'Balanced drag profile with medium scope control.' },
  'POCO X6': { class: 'High-end', sens: 6, note: 'Fast profile with higher General/Red Dot starting values.' },
  'Infinix Hot 40': { class: 'Entry / Mid-range', sens: -2, note: 'Stability-first profile to reduce overshoot.' },
  'Infinix Note 40': { class: 'Mid-range', sens: 3, note: 'Balanced profile for quick drag without excess twitch.' },
  'TECNO Camon 30': { class: 'Mid-range', sens: 3, note: 'Balanced touch profile with controlled scopes.' },
  'realme C67': { class: 'Entry / Mid-range', sens: 0, note: 'Stable values aimed at consistent close-range drag.' },
  'iPhone 13': { class: 'High-end', sens: 6, note: 'Fast control profile for responsive touch input.' },
  'iPhone 15': { class: 'High-end', sens: 7, note: 'High-response profile with quick Red Dot movement.' }
};

function identify(): Device {
  const n = navigator as any, ua = n.userAgent || '';
  const brand = /Samsung/i.test(ua) ? 'Samsung' : /Xiaomi|Redmi|POCO/i.test(ua) ? 'Xiaomi / Redmi / POCO' : /Infinix/i.test(ua) ? 'Infinix' : /TECNO/i.test(ua) ? 'TECNO' : /OPPO/i.test(ua) ? 'OPPO' : /vivo/i.test(ua) ? 'vivo' : /realme/i.test(ua) ? 'realme' : /iPhone/i.test(ua) ? 'Apple' : /iPad/i.test(ua) ? 'Apple' : 'Android / Other';
  let model = 'Model not exposed';
  if (/iPhone/i.test(ua)) model = 'iPhone';
  else if (/iPad/i.test(ua)) model = 'iPad';
  else {
    const m = ua.match(/Android[^;)]*;\s*(?:wv;\s*)?([^;)]+?)(?:\s+Build\/|;|\))/i);
    if (m?.[1]) model = m[1].trim().replace(/^(?:[a-z]{2}-[A-Z]{2};\s*)/, '');
  }
  const w = screen.width, h = screen.height, mem = n.deviceMemory, cores = n.hardwareConcurrency;
  const px = Math.max(w, h);
  const cls = px >= 2400 && (mem || 4) >= 6 ? 'High-end' : px >= 1920 && (mem || 4) >= 4 ? 'Mid-range' : 'Entry / Mid-range';
  return { brand, model, platform: /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : 'Desktop / Other', screen: w + ' × ' + h, dpr: window.devicePixelRatio || 1, cores: cores ? cores + ' cores' : 'Not exposed', memory: mem ? mem + ' GB' : 'Not exposed', touch: 'ontouchstart' in window ? 'Yes' : 'No', deviceClass: cls };
}

function findPreset(d: Device) {
  const lower = d.model.toLowerCase();
  const exact = Object.keys(DB).find(k => lower.includes(k.toLowerCase()));
  return exact ? DB[exact] : null;
}

function make(d: Device, mode: string, perf: Perf | null): Profile {
  const preset = findPreset(d);
  const base = preset?.sens ?? (d.deviceClass === 'High-end' ? 4 : d.deviceClass === 'Entry / Mid-range' ? -6 : -2);
  const refreshAdj = perf ? (perf.refresh >= 100 ? 3 : perf.refresh < 60 ? -3 : 0) : 0;
  const modeAdj = mode === 'Rush' ? 5 : mode === 'Sniper' ? -2 : 1;
  const touchAdj = d.touch === 'Yes' ? 2 : 0;
  const clamp = (x: number) => Math.max(70, Math.min(200, Math.round(x)));
  return { General: clamp(185 + base + refreshAdj + modeAdj + touchAdj), RedDot: clamp(178 + base + refreshAdj + modeAdj + touchAdj), '2x': clamp(168 + base + refreshAdj + modeAdj), '4x': clamp(158 + base + refreshAdj), Sniper: clamp(92 + base - (mode === 'Sniper' ? 4 : 0)), FreeLook: clamp(180 + touchAdj + modeAdj) };
}

function runBenchmark(): Promise<Perf> {
  return new Promise(resolve => {
    const times: number[] = [];
    let last = performance.now();
    const start = last;
    const tick = (now: number) => {
      times.push(now - last); last = now;
      if (now - start >= 1800) {
        const valid = times.slice(2).filter(x => x > 0 && x < 100);
        const avg = valid.reduce((a, b) => a + b, 0) / Math.max(valid.length, 1);
        const fps = Math.round(Math.min(240, 1000 / avg));
        const refresh = Math.round(fps >= 115 ? 120 : fps >= 85 ? 90 : fps >= 70 ? 75 : 60);
        const score = fps >= 100 ? 'Excellent' : fps >= 70 ? 'Good' : 'Basic';
        resolve({ fps, refresh, score });
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [followedA, setFollowedA] = useState(false);
  const [followedB, setFollowedB] = useState(false);
  const [d, setD] = useState<Device | null>(null);
  const [mode, setMode] = useState('Balanced');
  const [s, setS] = useState<Profile | null>(null);
  const [perf, setPerf] = useState<Perf | null>(null);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [rated, setRated] = useState(false);

  const run = async () => {
    const x = identify();
    setD(x);
    setTesting(true);
    const p = await runBenchmark();
    setPerf(p);
    setTesting(false);
    setS(make(x, mode, p));
    setCopied(false);
  };

  const copy = () => {
    if (!s) return;
    navigator.clipboard?.writeText(Object.entries(s).map(([k, v]) => k + ': ' + v).join('\n'))
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const submitRating = () => {
    if (!rating) return;
    try { localStorage.setItem('sarkar_eren_rating', String(rating)); } catch {}
    setRated(true);
  };

  const preset = useMemo(() => d ? findPreset(d) : null, [d]);
  const canEnter = followedA && followedB;

  return (
    <div className="app">
      {!unlocked && <div className="followGate"><div className="gateGlow" /><div className="gateCard">
        <div className="gateTop"><div className="gateLogo"><Music2 /></div><span>ACCESS REQUIRED</span></div>
        <div className="gateTag">Sᴀʀᴋᴀʀ〆Eʀᴇɴ</div><h2>Unlock your setup.</h2>
        <p>Follow both TikTok accounts, then tap the button below to enter the sensitivity tuner.</p>
        <div className="followList">
          <a className={'followRow ' + (followedA ? 'done' : '')} href="https://www.tiktok.com/@wtf_sarkar79" target="_blank" rel="noreferrer" onClick={() => setFollowedA(true)}><div className="ttBadge">♪</div><div><b>@wtf_sarkar79</b><small>Creator updates & sensitivity tips</small></div><ChevronRight /></a>
          <a className={'followRow ' + (followedB ? 'done' : '')} href="https://www.tiktok.com/@wtf_erenx79" target="_blank" rel="noreferrer" onClick={() => setFollowedB(true)}><div className="ttBadge">♪</div><div><b>@wtf_erenx79</b><small>More Free Fire content</small></div><ChevronRight /></a>
        </div>
        <button className="unlock" disabled={!canEnter} onClick={() => setUnlocked(true)}><ShieldCheck />{canEnter ? 'Enter website' : 'Follow both to continue'}</button>
        <small className="gateNote">Note: a website cannot verify a TikTok follow directly. This gate unlocks after both TikTok buttons are opened.</small>
      </div></div>}

      <header><div className="brand"><span>〆</span><div><b>Sᴀʀᴋᴀʀ〆Eʀᴇɴ</b><small>FREE FIRE DEVICE TUNER</small></div></div><div className="status"><i /> {testing ? 'RUNNING TEST' : 'DEVICE READY'}</div></header>
      <main>
        <section className="hero"><div><div className="tag">DEVICE DATABASE + PERFORMANCE LAB</div><h1>Build your <em>perfect</em><br />game setup.</h1><p>Identify available device details, benchmark browser frame pacing, match a device preset when recognized, and get a practical Free Fire sensitivity starting point.</p><button className="scan" onClick={run}>{testing ? <Activity /> : d ? <RefreshCw /> : <ScanLine />}{testing ? 'Testing FPS…' : d ? 'Re-scan & test' : 'Detect + test device'}<ChevronRight /></button></div><div className="orb"><Target /><div><b>{testing ? 'BENCHMARKING' : perf ? perf.fps + ' FPS' : 'HEADSHOT'}<br />{testing ? 'FRAME PACING' : perf ? perf.refresh + ' Hz ESTIMATE' : 'CONTROL'}</b><span>{perf ? perf.score.toUpperCase() : 'DEVICE TUNED'}</span></div></div></section>
        <div className="modes"><span>PLAY STYLE</span>{['Balanced', 'Rush', 'Sniper'].map(x => <button className={mode === x ? 'sel' : ''} onClick={() => { setMode(x); if (d) setS(make(d, x, perf)); }} key={x}>{x}</button>)}</div>
        {d && <>
          <section className="device"><div className="sectionTitle"><Smartphone /><div><b>Detected device</b><span>{preset ? 'Known model preset matched' : 'Generic hardware profile used'} · browser-exposed signals only</span></div></div><div className="facts">{[['BRAND', d.brand], ['MODEL', d.model], ['DISPLAY', d.screen], ['DPR', d.dpr + '×'], ['CPU', d.cores], ['RAM', d.memory]].map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}</div></section>
          <section className="performance"><div className="sectionTitle"><Gauge /><div><b>Performance lab</b><span>Browser frame pacing benchmark — not the game's internal FPS counter</span></div></div><div className="perfGrid"><div><small>EST. FPS</small><strong>{perf?.fps ?? '—'}</strong></div><div><small>REFRESH EST.</small><strong>{perf?.refresh ?? '—'} Hz</strong></div><div><small>RESULT</small><strong>{perf?.score ?? 'Run test'}</strong></div><div><small>TOUCH</small><strong>{d.touch}</strong></div></div></section>
          <section className="result"><div className="resultHead"><div><div className="tag">DEVICE-MATCHED PROFILE</div><h2>{mode} <span>• {d.deviceClass}</span></h2><p>{preset?.note || 'No exact model preset was exposed; hardware class and benchmark are used instead.'}</p></div><button className="copy" onClick={copy}>{copied ? <CheckCircle2 /> : <Copy />}{copied ? 'Copied' : 'Copy settings'}</button></div><div className="sensGrid">{s && Object.entries(s).map(([k, v]) => <div className="sens" key={k}><small>{k}</small><strong>{v}</strong><div className="bar"><i style={{ width: (v / 200) * 100 + '%' }} /></div></div>)}</div></section>
        </>}
        <section className="ratingCard"><div className="ratingIcon"><Star /></div><div className="ratingCopy"><div className="tag">YOUR FEEDBACK</div><h2>Rate your experience</h2><p>How useful was Sᴀʀᴋᴀʀ〆Eʀᴇɴ for your Free Fire setup?</p></div><div className="stars">{[1,2,3,4,5].map(n => <button key={n} aria-label={n + ' star rating'} onMouseEnter={() => setHoverRating(n)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(n)}><Star className={(hoverRating || rating) >= n ? 'active' : ''} fill={(hoverRating || rating) >= n ? 'currentColor' : 'none'} /></button>)}</div><button className="rateSubmit" disabled={!rating || rated} onClick={submitRating}><Send />{rated ? 'Thanks for rating!' : 'Submit rating'}</button><small className="ratingNote">Your rating is saved on this device. It is not a public site-wide average.</small></section>
        {!d && <section className="how"><div><Zap /><b>1. Detect</b><span>Read model, display and hardware signals</span></div><div><Gauge /><b>2. Benchmark</b><span>Measure browser frame pacing and estimate refresh class</span></div><div><Target /><b>3. Tune</b><span>Generate sensitivity starting values</span></div></section>}
        <section className="disclaimer"><Info /><div><b>Accuracy note</b><span>Android browsers may hide the exact device model, chipset, GPU and game's real FPS. The benchmark uses requestAnimationFrame, which generally tracks browser repaint frequency; it is not a guarantee of Free Fire's in-game FPS. Always test the profile in Training and adjust gradually.</span></div></section>
      </main>
      <footer>Sᴀʀᴋᴀʀ〆Eʀᴇɴ · Independent Free Fire setup tuner</footer>
    </div>
  );
}
