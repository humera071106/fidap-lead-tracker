import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, configured } from './supabase';
import {
  Activity, ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, ChevronDown,
  ClipboardList, Clock3, Database, Edit3, Filter, Home, Info, Layers3,
  Loader2, LogOut, Menu, Plus, RefreshCcw, Search, Send, Settings2,
  ShieldCheck, Smartphone, Trash2, UserCircle, Users, X, AlertCircle
} from 'lucide-react';

const LEVELS = ['Positive', 'Potential', 'No Response', 'Negative'];
const RESPONSES = [
  'Interested', 'Will think about it', 'Requested callback', 'Waiting for details',
  'Cannot afford upfront fee', 'Training enquiry', 'No response', 'Not interested',
  'Converted / Paid', 'Other'
];
const NAV = [
  { id: 'home', title: 'Dashboard', icon: Home },
  { id: 'leads', title: 'All Leads', icon: Users },
  { id: 'add', title: 'Add Leads', icon: Plus },
  { id: 'followups', title: 'Follow-ups', icon: CalendarDays },
  { id: 'settings', title: 'My Profile', icon: Settings2 }
];
const blank = () => ({ key: crypto.randomUUID(), lead_number: '', lead_name: '', interest_level: 'Potential', response_status: 'Will think about it', comments: '', follow_up_date: '', id: null });
const prettyDate = (iso) => iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : 'Not scheduled';
const prettyTime = (iso) => iso ? new Date(iso).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'numeric', minute:'2-digit' }) : '—';
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const statusClass = (value) => ({ 'Positive':'positive','Potential':'potential','No Response':'noresponse','Negative':'negative' }[value] || 'potential');
const displayName = (lead) => lead.lead_name?.trim() || 'Unnamed client';

function Pill({ level }) { return <span className={`pill ${statusClass(level)}`}>{level}</span>; }
function Empty({ icon: Icon = ClipboardList, title, text, action }) { return <div className="empty"><div className="empty-icon"><Icon size={25}/></div><h3>{title}</h3><p>{text}</p>{action}</div>; }
function Spinner({ label = 'Loading...' }) { return <div className="spinner"><Loader2 className="spin" size={23}/>{label}</div>; }

function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const signIn = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(error.message);
    setLoading(false);
  };
  return <main className="auth-page">
    <div className="auth-visual"><div className="brand-icon large">F</div><h1>FIDAP Solutions</h1><p>Everyone's leads, in one shared workspace.</p><div className="auth-points"><span><ShieldCheck size={17}/> Private team access</span><span><RefreshCcw size={17}/> Shared updates</span><span><Smartphone size={17}/> Install on Android</span></div></div>
    <form className="auth-card" onSubmit={signIn}>
      <div className="eyebrow">TEAM SIGN IN</div><h2>Welcome back</h2><p className="muted">Use the account provided by the team administrator.</p>
      <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="employee@company.com" autoComplete="username" required /></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required /></label>
      {error && <p role="alert" className="alert error"><AlertCircle size={16}/>{error}</p>}
      <button className="btn primary full" type="submit" disabled={loading}>{loading ? <Loader2 className="spin" size={18}/> : <ArrowRight size={18}/>} Sign in</button>
      <p className="micro">Accounts are created by the FIDAP administrator; public registration is disabled.</p>
    </form>
  </main>;
}

function LeadItem({ lead, onView, onEdit, compact=false }) {
  return <div className={`lead-card ${compact ? 'compact':''}`}>
    <div className="lead-avatar">{displayName(lead).slice(0,1).toUpperCase()}</div>
    <div className="lead-content"><div className="lead-title"><strong>{displayName(lead)}</strong><span className="mono number">#{lead.lead_number}</span></div>
      <div className="lead-sub">{lead.response_status || 'No response status'} <span className="dot">·</span> {lead.updated_by_name || 'Team member'}</div>
      {!compact && lead.comments && <div className="lead-comment">{lead.comments}</div>}
      <div className="lead-meta"><Pill level={lead.interest_level}/>{lead.follow_up_date && <span className="date-label"><CalendarDays size={13}/>{prettyDate(lead.follow_up_date)}</span>}</div>
    </div>
    <div className="lead-actions"><button className="icon-btn" title="View history" aria-label={`View ${displayName(lead)}`} onClick={()=>onView(lead)}><ClipboardList size={18}/></button><button className="icon-btn" title="Update lead" aria-label={`Update ${displayName(lead)}`} onClick={()=>onEdit(lead)}><Edit3 size={18}/></button></div>
  </div>;
}

function NewLeadForm({ lead, index, canRemove, onChange, onRemove, duplicates }) {
  const set = (field, val) => onChange(index, { ...lead, [field]:val });
  const sameNumber = !lead.id && lead.lead_number.length === 4 && duplicates.some(x=>x.lead_number===lead.lead_number);
  return <div className="entry-card">
    <div className="entry-header"><div><span className="entry-number">{lead.id ? 'UPDATE EXISTING LEAD' : `LEAD ${index+1}`}</span><h3>{lead.id ? (lead.lead_name || `#${lead.lead_number}`) : 'Lead details'}</h3></div>{canRemove && <button type="button" className="icon-btn danger" aria-label="Remove lead" onClick={()=>onRemove(index)}><Trash2 size={19}/></button>}</div>
    <div className="form-grid">
      <label>Lead Number <span className="req">*</span><input value={lead.lead_number} onChange={e=>set('lead_number', e.target.value.replace(/\D/g,'').slice(0,4))} inputMode="numeric" maxLength={4} placeholder="e.g. 6692" pattern="[0-9]{4}" required /></label>
      <label>Lead Name <span className="optional">Optional</span><input value={lead.lead_name} onChange={e=>set('lead_name', e.target.value)} placeholder="Client's name" maxLength={100}/></label>
      <label>Interest Level <span className="req">*</span><select value={lead.interest_level} onChange={e=>set('interest_level',e.target.value)}>{LEVELS.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Response Status <span className="req">*</span><select value={lead.response_status} onChange={e=>set('response_status',e.target.value)}>{RESPONSES.map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="span2">Comments <span className="optional">Optional</span><textarea value={lead.comments} onChange={e=>set('comments',e.target.value)} rows={2} maxLength={1500} placeholder="What did the client say?" /></label>
      <label>Follow-up Date <span className="optional">Optional</span><input type="date" value={lead.follow_up_date} onChange={e=>set('follow_up_date',e.target.value)} /></label>
    </div>
    {sameNumber && <div className="warn"><Info size={17}/><span>Lead #{lead.lead_number} already exists. Use <b>All Leads → Edit</b> to update that client. Create a new record only if this is a different client with the same last four digits.</span></div>}
  </div>;
}

function LeadHistory({ lead, onClose, onEdit }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,setError] = useState('');
  useEffect(() => {
    let active = true;
    supabase.from('lead_updates').select('*').eq('lead_id',lead.id).order('created_at',{ascending:false}).then(({data,error})=>{
      if (!active) return;
      if (error) setError(error.message);
      setEvents(data||[]); setLoading(false);
    });
    return () => {active=false;};
  }, [lead.id]);
  return <div className="modal-backdrop" onClick={onClose} role="presentation"><div className="modal" role="dialog" aria-modal="true" aria-label="Lead history" onClick={e=>e.stopPropagation()}>
    <div className="modal-top"><div><div className="eyebrow">CLIENT RECORD</div><h2>{displayName(lead)} <span className="mono text-muted">#{lead.lead_number}</span></h2></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={22}/></button></div>
    <div className="modal-summary"><Pill level={lead.interest_level}/><span><UserCircle size={15}/> {lead.updated_by_name || 'Team member'}</span><span><Clock3 size={15}/> {prettyTime(lead.updated_at)}</span></div>
    <div className="modal-section-head"><h3>Update history</h3><button className="btn small secondary" onClick={()=>{onClose();onEdit(lead);}}><Edit3 size={15}/> Update lead</button></div>
    {loading ? <Spinner/> : error ? <p className="alert error">{error}</p> : !events.length ? <p className="muted">No history recorded yet.</p> : <div className="timeline">{events.map(event => <div className="timeline-event" key={event.id}><span className="timeline-dot"/><strong>{event.actor_name || 'Team member'} <span className="muted normal">{event.action === 'INSERT' ? 'added this lead' : 'updated this lead'}</span></strong><div className="small-muted">{prettyTime(event.created_at)}</div><div className="timeline-data"><Pill level={event.new_data?.interest_level || 'Potential'}/><span>{event.new_data?.response_status || '—'}</span></div>{event.new_data?.comments && <p>{event.new_data.comments}</p>}</div>)}</div>}
  </div></div>;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(configured);
  const [profile,setProfile] = useState(null);
  const [page, setPage] = useState('home');
  const [leads, setLeads] = useState([]);
  const [loadingLeads,setLoadingLeads] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [filter,setFilter] = useState('All');
  const [search,setSearch] = useState('');
  const [entries,setEntries] = useState([blank()]);
  const [viewLead,setViewLead] = useState(null);
  const [nameInput,setNameInput] = useState('');
  const [installPrompt,setInstallPrompt] = useState(null);
  const [isInstalled,setIsInstalled] = useState(window.matchMedia?.('(display-mode: standalone)').matches || false);
  const [menuOpen,setMenuOpen] = useState(false);

  useEffect(()=>{
    const listener = e => { e.preventDefault(); setInstallPrompt(e); };
    const installed = () => {setIsInstalled(true);setInstallPrompt(null);};
    window.addEventListener('beforeinstallprompt',listener);
    window.addEventListener('appinstalled',installed);
    return ()=>{window.removeEventListener('beforeinstallprompt',listener);window.removeEventListener('appinstalled',installed);};
  },[]);
  useEffect(()=>{
    if (!supabase) return;
    let live = true;
    supabase.auth.getSession().then(({data})=>{if(live){setSession(data.session);setCheckingAuth(false);}}).catch(()=>setCheckingAuth(false));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,newSession)=>{setSession(newSession);setCheckingAuth(false);});
    return ()=>{live=false;subscription.unsubscribe();};
  },[]);
  const loadLeads = useCallback(async () => {
    if (!supabase) return;
    setLoadingLeads(true);
    try {
      // Supabase responses are paged. Collect all pages instead of silently dropping leads beyond 1,000.
      const all = [];
      for (let start=0;;start+=1000) {
        const {data,error} = await supabase.from('leads').select('*').order('updated_at',{ascending:false}).range(start,start+999);
        if (error) throw error;
        all.push(...(data||[]));
        if (!data || data.length<1000) break;
      }
      setLeads(all);
    } catch(e) { setError(e.message || 'Unable to load leads.'); }
    finally {setLoadingLeads(false);}
  },[]);
  useEffect(()=>{
    if (!session?.user?.id) {setProfile(null);setLeads([]);return;}
    let active=true;
    (async()=>{
      const {data,error}=await supabase.from('profiles').select('*').eq('id',session.user.id).single();
      if(active){if(error){setError('Profile not found. Ask the administrator to run the SQL setup.');}setProfile(data||null);setNameInput(data?.display_name||'');}
    })();
    loadLeads();
    const channel=supabase.channel('fidap-leads-shared').on('postgres_changes',{event:'*',schema:'public',table:'leads'},()=>{loadLeads();}).subscribe();
    return ()=>{active=false;supabase.removeChannel(channel);};
  },[session?.user?.id,loadLeads]);

  const total = leads.length;
  const counts = useMemo(()=>Object.fromEntries(LEVELS.map(l=>[l,leads.filter(x=>x.interest_level===l).length])),[leads]);
  const today=todayISO();
  const due = useMemo(()=>leads.filter(x=>x.follow_up_date && x.interest_level!=='Negative' && x.follow_up_date<=today),[leads,today]);
  const future=useMemo(()=>leads.filter(x=>x.follow_up_date && x.interest_level!=='Negative').sort((a,b)=>a.follow_up_date.localeCompare(b.follow_up_date)),[leads]);
  const filtered=useMemo(()=>leads.filter(x=>(filter==='All'||x.interest_level===filter) && [x.lead_number,x.lead_name,x.updated_by_name,x.response_status,x.comments].some(v=>String(v||'').toLowerCase().includes(search.toLowerCase().trim()))),[leads,filter,search]);
  const grouped=useMemo(()=>Object.entries(filtered.reduce((g,l)=>{const n=l.updated_by_name||'Unassigned';(g[n]??=[]).push(l);return g;},{})).sort((a,b)=>a[0].localeCompare(b[0])),[filtered]);
  const groups=useMemo(()=>Object.entries(leads.reduce((g,l)=>{const n=l.updated_by_name||'Unassigned';g[n]=(g[n]||0)+1;return g;},{})).sort((a,b)=>b[1]-a[1]),[leads]);
  const go=(id)=>{setPage(id);setMenuOpen(false);setError('');setNotice('');window.scrollTo(0,0);};
  const edit=(lead)=>{setEntries([{...blank(),...lead,follow_up_date:lead.follow_up_date||'',lead_name:lead.lead_name||'',comments:lead.comments||''}]);go('add');};
  const newEntry=()=>{setEntries([blank()]);go('add');};
  const updateEntry=(index,item)=>setEntries(old=>old.map((e,i)=>i===index?item:e));
  const save=async(e)=>{
    e.preventDefault();setError('');setNotice('');
    if(!profile?.display_name?.trim()){setError('Set your team member name under My Profile before adding leads.');return;}
    if(entries.some(x=>!/^\d{4}$/.test(x.lead_number)||!x.response_status||!x.interest_level)){setError('Please enter four digits and select the required fields for every lead.');return;}
    setBusy(true);
    try {
      const normalized=entries.map(x=>({lead_number:x.lead_number,lead_name:x.lead_name.trim()||null,interest_level:x.interest_level,response_status:x.response_status,comments:x.comments.trim()||null,follow_up_date:x.follow_up_date||null}));
      if (entries[0].id) {
        const {error}=await supabase.from('leads').update(normalized[0]).eq('id',entries[0].id);
        if(error)throw error;
        setNotice(`Lead #${entries[0].lead_number} updated. The change is saved in lead history.`);
      } else {
        const {error}=await supabase.from('leads').insert(normalized);
        if(error)throw error;
        setNotice(`${entries.length} ${entries.length===1?'lead':'leads'} saved successfully.`);
      }
      setEntries([blank()]);setPage('leads');setFilter('All');setSearch('');await loadLeads();
    } catch(err){setError(err.message||'Unable to save leads.');}
    finally{setBusy(false);}
  };
  const saveProfile=async(e)=>{e.preventDefault();setError('');setNotice('');setBusy(true);
    const value=nameInput.trim();if(!value){setError('Enter a name.');setBusy(false);return;}
    const {data,error}=await supabase.from('profiles').update({display_name:value}).eq('id',session.user.id).select().single();
    if(error)setError(error.message);else{setProfile(data);setNotice('Profile saved. Future lead updates will use this name.');}
    setBusy(false);
  };
  const install=()=>{if(installPrompt){installPrompt.prompt();installPrompt.userChoice.then(()=>setInstallPrompt(null));}else{setNotice('On Android Chrome, open the three-dot menu and choose “Install app” or “Add to Home screen”.');}};

  if(!configured)return <div className="setup-screen"><div className="brand-icon large">F</div><h1>FIDAP Lead Tracker</h1><div className="setup-box"><Database size={28}/><h2>Database connection needed</h2><p>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your Cloudflare Pages build environment variables, then redeploy.</p><p>Run <code>supabase-schema.sql</code> in the Supabase SQL editor first. Follow the README.</p></div></div>;
  if(checkingAuth)return <div className="center-page"><Spinner label="Opening FIDAP..."/></div>;
  if(!session)return <AuthScreen/>;

  const cur= NAV.find(x=>x.id===page)||NAV[0];
  return <div className="app-frame">
    <aside className={`sidebar ${menuOpen?'open':''}`}>
      <div className="sidebar-top"><div className="brand-icon">F</div><div className="brand-copy"><strong>FIDAP</strong><span>Lead Workspace</span></div><button className="icon-btn mobile-only" aria-label="Close menu" onClick={()=>setMenuOpen(false)}><X size={20}/></button></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav>{NAV.map(({id,title,icon:Icon})=><button key={id} className={`nav-link ${page===id?'active':''}`} onClick={()=>go(id)}><Icon size={19}/>{title}{id==='followups' && due.length>0 && <b className="count-bubble">{due.length}</b>}</button>)}</nav>
      <div className="sidebar-spacer"/>
      <div className="sidebar-footer"><button className="install-link" onClick={install}><Smartphone size={18}/>{isInstalled?'App installed':'Install on phone'}</button><div className="profile-mini"><div className="profile-avatar">{(profile?.display_name||session.user.email||'T').charAt(0).toUpperCase()}</div><div className="min-w-0"><strong>{profile?.display_name||'Team Member'}</strong><span>{session.user.email}</span></div></div></div>
    </aside>
    {menuOpen && <div className="sidebar-scrim" onClick={()=>setMenuOpen(false)} />}
    <div className="main-area">
      <header className="topbar"><button className="icon-btn mobile-only" onClick={()=>setMenuOpen(true)} aria-label="Open menu"><Menu size={22}/></button><div className="topbar-title"><span className="eyebrow">FIDAP SOLUTIONS</span><h1>{cur.title}</h1></div><div className="topbar-right"><span className="live-status"><span className="live-dot"/> Shared database</span><button className="icon-btn" aria-label="Refresh leads" title="Refresh leads" onClick={loadLeads}><RefreshCcw size={19}/></button><div className="topbar-avatar">{(profile?.display_name||'T')[0].toUpperCase()}</div></div></header>
      <main className="page-content">
        {error && <div role="alert" className="alert error"><AlertCircle size={17}/><span>{error}</span><button onClick={()=>setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}
        {notice && <div role="status" className="alert success"><CheckCircle2 size={18}/><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Dismiss notice"><X size={16}/></button></div>}
        {page==='home' && <>
          <section className="welcome-card"><div><div className="eyebrow light">TEAM OVERVIEW</div><h2>Good to see you, {(profile?.display_name||'Team').split(' ')[0]}.</h2><p>All of our team’s lead activity, together in one place.</p><button className="btn white" onClick={newEntry}><Plus size={17}/> Add new leads</button></div><div className="welcome-graphic"><Layers3 size={82} strokeWidth={1.1}/></div></section>
          <div className="stats-grid"><div className="stat-card"><div className="stat-icon blue"><Users size={19}/></div><span>Total Leads</span><strong>{total}</strong><small>Shared across our team</small></div>
            {LEVELS.map(level=><div className="stat-card" key={level}><div className={`stat-icon ${statusClass(level)}`}><Activity size={19}/></div><span>{level}</span><strong>{counts[level]||0}</strong><small>Current status</small></div>)}</div>
          <div className="content-grid"><section className="panel"><div className="panel-heading"><div><h3>Recent Lead Updates</h3><p>Latest changes from all employees</p></div><button className="text-action" onClick={()=>go('leads')}>View all <ArrowRight size={15}/></button></div>
              {loadingLeads && !leads.length ? <Spinner/> : leads.length ? leads.slice(0,6).map(l=><LeadItem key={l.id} lead={l} onView={setViewLead} onEdit={edit} compact/>) : <Empty title="No leads yet" text="The first submitted lead will appear here." action={<button className="btn primary" onClick={newEntry}>Add a lead</button>}/>}</section>
            <section className="panel"><div className="panel-heading"><div><h3>Follow-up Snapshot</h3><p>Stay on top of our callbacks</p></div><CalendarDays size={19} className="muted-icon"/></div><div className="followup-summary"><div><strong>{due.length}</strong><span>Due / overdue</span></div><div><strong>{future.length}</strong><span>Total scheduled</span></div></div><button className="btn outline full" onClick={()=>go('followups')}>Open follow-ups <ArrowRight size={16}/></button>
              <div className="panel-heading team-heading"><div><h3>Team Activity</h3><p>Leads by last updating employee</p></div></div>{groups.length ? groups.slice(0,7).map(([name,c])=><div className="team-line" key={name}><span className="team-dot">{name[0].toUpperCase()}</span><span>{name}</span><strong>{c}</strong></div>) : <p className="small-muted">No activity yet.</p>}</section></div>
        </>}
        {page==='leads' && <><div className="section-head"><div><h2>Everyone’s leads</h2><p>View, search and update leads submitted by our whole team.</p></div><button className="btn primary" onClick={newEntry}><Plus size={17}/> Add leads</button></div>
          <div className="panel toolbar"><div className="search-input"><Search size={18}/><input placeholder="Search number, name, team member or response" value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button onClick={()=>setSearch('')} aria-label="Clear search"><X size={15}/></button>}</div><div className="filter-scroll"><Filter size={16} className="muted-icon"/>{['All',...LEVELS].map(l=><button key={l} onClick={()=>setFilter(l)} className={`filter-tab ${filter===l?'active':''}`}>{l}</button>)}</div></div>
          <div className="results-note">Showing <strong>{filtered.length}</strong> of <strong>{total}</strong> lead records {loadingLeads && <Loader2 className="spin" size={14}/>}</div>
          {grouped.length ? grouped.map(([name,items])=><section className="group-card" key={name}><div className="group-heading"><div className="group-member"><span className="group-avatar">{name[0].toUpperCase()}</span><div><span className="eyebrow">LAST UPDATED BY</span><h3>{name}</h3></div></div><span className="group-count">{items.length} {items.length===1?'lead':'leads'}</span></div>{items.map(l=><LeadItem key={l.id} lead={l} onView={setViewLead} onEdit={edit}/>)}</section>) : <Empty icon={Search} title="No matching leads" text={total?'Try a different search or status filter.':'Add the first lead to start tracking our team.'} action={<button className="btn primary" onClick={newEntry}>Add leads</button>}/>}
        </>}
        {page==='add' && <><div className="section-head"><div><h2>{entries[0]?.id?'Update lead':'Add leads'}</h2><p>{entries[0]?.id?'The previous information stays in Lead History.':'Enter multiple leads and submit them together.'}</p></div><div className="staff-indicator"><UserCircle size={18}/>{profile?.display_name||'Set profile name'}</div></div>
          <form onSubmit={save} className="lead-form"><div className="form-stack">{entries.map((lead,index)=><NewLeadForm key={lead.key||lead.id} lead={lead} index={index} canRemove={!lead.id&&entries.length>1} onChange={updateEntry} onRemove={index=>setEntries(current=>current.filter((_,i)=>i!==index))} duplicates={leads}/>)}</div>
            {!entries[0]?.id && <button type="button" className="add-another" onClick={()=>setEntries(x=>[...x,blank()])}><Plus size={20}/> Add Another Lead</button>}
            <div className="submit-row"><button type="button" className="btn outline" onClick={()=>go('leads')}>Cancel</button><button type="submit" disabled={busy} className="btn primary submit-btn">{busy?<Loader2 size={17} className="spin"/>:<Send size={17}/>} {entries[0]?.id?'Save Changes':`Submit ${entries.length} ${entries.length===1?'Lead':'Leads'}`}</button></div></form>
        </>}
        {page==='followups' && <><div className="section-head"><div><h2>Follow-up Queue</h2><p>Upcoming and overdue callbacks from everyone on the team.</p></div><span className="queue-chip"><Clock3 size={16}/>{due.length} due</span></div>
          <div className="panel followup-panel">{future.length ? future.map(l=><div className="followup-row" key={l.id}><div className={`date-box ${l.follow_up_date<=today?'overdue':''}`}><strong>{new Date(`${l.follow_up_date}T12:00:00`).getDate()}</strong><span>{new Date(`${l.follow_up_date}T12:00:00`).toLocaleDateString('en-IN',{month:'short'})}</span></div><div className="followup-details"><strong>{displayName(l)} <span className="mono muted">#{l.lead_number}</span></strong><p>{l.response_status} · {l.updated_by_name}</p><span className={`followup-label ${l.follow_up_date<today?'late':l.follow_up_date===today?'today':''}`}>{l.follow_up_date<today?'Overdue':l.follow_up_date===today?'Due today':'Scheduled'}</span></div><button className="btn small outline" onClick={()=>edit(l)}>Update <Edit3 size={14}/></button></div>) : <Empty icon={CalendarDays} title="No follow-ups scheduled" text="Follow-ups appear here after adding a date to a non-negative lead."/>}</div>
        </>}
        {page==='settings' && <><div className="section-head"><div><h2>My Profile</h2><p>Your name is recorded with every lead update.</p></div></div><div className="settings-grid"><form className="panel settings-panel" onSubmit={saveProfile}><div className="settings-avatar">{(profile?.display_name||'T')[0].toUpperCase()}</div><h3>Team member details</h3><label>Display Name<input value={nameInput} onChange={e=>setNameInput(e.target.value)} maxLength={80} placeholder="Your name" required/></label><label>Login Email<input value={session.user.email||''} disabled /></label><button className="btn primary" type="submit" disabled={busy}>{busy?<Loader2 size={16} className="spin"/>:<CheckCircle2 size={16}/>} Save profile</button></form>
            <div className="panel settings-panel"><h3>App & account</h3><p className="muted">Everyone signed in can view and update the same shared leads. Changes are recorded automatically in the history.</p><button className="btn outline full" onClick={install}><Smartphone size={17}/>{isInstalled?'Already installed':'Install app on this phone'}</button><button className="btn danger-outline full" onClick={()=>supabase.auth.signOut()}><LogOut size={17}/> Sign out</button><div className="help-note"><Info size={18}/><span>Data is stored in Supabase, not on this phone. Internet is required for submitting updates.</span></div></div></div>
        </>}
      </main>
    </div>
    <nav className="bottom-nav">{NAV.filter(x=>x.id!=='settings').map(({id,title,icon:Icon})=><button key={id} aria-label={title} className={page===id?'selected':''} onClick={()=>go(id)}><Icon size={22}/><span>{id==='home'?'Home':id==='leads'?'Leads':id==='add'?'Add':'Follow-ups'}</span></button>)}</nav>
    {viewLead && <LeadHistory lead={viewLead} onClose={()=>setViewLead(null)} onEdit={edit}/>}
  </div>;
}
