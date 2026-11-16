import { useEffect, useMemo, useState } from 'react'
import { requests as seed, USERS, STATUS_META, CONFIDENCE_META, STAGES, TODAY } from './data.js'

/* ---------- tiny hash router ---------- */
function useRoute() {
  const get = () => (window.location.hash.replace(/^#/, '') || '/')
  const [route, setRoute] = useState(get)
  useEffect(() => {
    const on = () => { setRoute(get()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}
const go = (path) => { window.location.hash = path }

/* ---------- app ---------- */
export default function App() {
  const route = useRoute()
  const [userId, setUserId] = useState('priya')
  const [all, setAll] = useState(seed)
  const [toast, setToast] = useState(null)
  const user = USERS[userId]

  const mine = useMemo(() => all.filter((r) => r.participants.includes(userId)), [all, userId])

  const completeAction = (id, note) => {
    setAll((list) =>
      list.map((r) =>
        r.id !== id
          ? r
          : {
              ...r,
              status: 'on_track',
              stage: 1,
              plain: r.action.doneText,
              action: { ...r.action, completed: true },
              eta: { ...r.eta, clockPaused: false },
              updated: 'Just now',
              timeline: [
                { when: 'Just now', kind: 'you-done', who: `${user.name} (you)`, text: note },
                ...r.timeline,
              ],
            }
      )
    )
    setToast('Done. The team has been told and the request has moved on.')
    setTimeout(() => setToast(null), 3500)
  }

  let screen
  if (route === '/email') screen = <EmailMock onOpen={() => { setUserId('marcus'); go('/requests/RQ-2077') }} />
  else if (route.startsWith('/requests/')) {
    const req = all.find((r) => r.id === route.split('/')[2])
    screen = req ? <RequestDetail req={req} user={user} onComplete={completeAction} /> : <NotFound />
  } else if (route.startsWith('/requests')) {
    const q = new URLSearchParams(route.split('?')[1] || '')
    screen = <RequestList list={mine} initialStatus={q.get('status') || 'all'} />
  } else screen = <Overview list={mine} user={user} />

  const isEmail = route === '/email'

  return (
    <div className="app">
      <PrototypeBar userId={userId} setUserId={(id) => { setUserId(id); if (route.startsWith('/requests/')) go('/') }} />
      {!isEmail && <TopNav route={route} user={user} needs={mine.filter((r) => r.status === 'needs_you').length} />}
      <main className={isEmail ? 'email-stage' : 'page'}>{screen}</main>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}

/* ---------- chrome ---------- */
function PrototypeBar({ userId, setUserId }) {
  return (
    <div className="proto-bar">
      <span className="proto-tag">Prototype</span>
      <span className="proto-note">Mock data · neutral visuals until the moodboard is ready · “today” is {TODAY}</span>
      <span className="proto-controls">
        <label>
          Viewing as
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="priya">Priya, ops manager (~10 requests)</option>
            <option value="marcus">Marcus, finance analyst (1 urgent)</option>
          </select>
        </label>
        <a href="#/email">Start from notification email</a>
      </span>
    </div>
  )
}

function TopNav({ route, user, needs }) {
  const on = (p) => (p === '/' ? route === '/' : route.startsWith(p))
  return (
    <header className="topnav">
      <div className="topnav-inner">
        <a className="brand" href="#/">
          <span className="brand-mark" aria-hidden>R</span> ResolveHQ
        </a>
        <nav>
          <a className={on('/') ? 'active' : ''} href="#/">Overview</a>
          <a className={on('/requests') ? 'active' : ''} href="#/requests">
            Requests {needs > 0 && <span className="nav-count" aria-label={`${needs} need you`}>{needs}</span>}
          </a>
        </nav>
        <div className="topnav-right">
          <button className="btn btn-primary btn-sm" onClick={() => alertish('New request form is out of scope for this prototype.')}>New request</button>
          <span className="avatar" title={`${user.name}, ${user.org}`}>{user.initials}</span>
        </div>
      </div>
    </header>
  )
}
const alertish = (msg) => { const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg; document.body.appendChild(el); setTimeout(() => el.remove(), 2500) }

/* ---------- shared bits ---------- */
function StatusPill({ status }) {
  const m = STATUS_META[status]
  return <span className={`pill pill-${m.tone}`}><span className="dot" />{m.label}</span>
}

function EtaText({ eta, compact }) {
  if (eta.finished) return <span>Finished {eta.finished}</span>
  const range = eta.from === eta.to ? eta.from : `${eta.from} – ${eta.to}`
  return (
    <span className="eta-text">
      {range}
      {!compact && <span className={`conf conf-${eta.confidence}`}>{CONFIDENCE_META[eta.confidence].label}</span>}
      {compact && <span className={`conf-dot conf-${eta.confidence}`} title={CONFIDENCE_META[eta.confidence].label} />}
    </span>
  )
}

function counts(list) {
  const c = { needs_you: 0, delayed: 0, on_track: 0, done: 0 }
  list.forEach((r) => c[r.status]++)
  return c
}

/* ---------- Overview ---------- */
function Overview({ list, user }) {
  const c = counts(list)
  const needs = list.filter((r) => r.status === 'needs_you')
  const delayed = list.filter((r) => r.status === 'delayed')
  const recent = list.filter((r) => r.status === 'on_track' || r.status === 'done').slice(0, 5)
  const first = user.name.split(' ')[0]

  const summary = [
    c.needs_you && `${c.needs_you} ${c.needs_you === 1 ? 'request needs' : 'requests need'} you`,
    c.delayed && `${c.delayed} ${c.delayed === 1 ? 'is' : 'are'} delayed`,
    c.on_track && `${c.on_track} ${c.on_track === 1 ? 'is' : 'are'} on track`,
  ].filter(Boolean)

  return (
    <div className="overview">
      <section className="hero">
        <p className="eyebrow">{user.org}</p>
        <h1>Good morning, {first}.</h1>
        <p className="lede">{summary.length ? summary.join(', ') + '.' : 'Nothing open right now.'}</p>
      </section>

      <section className="tiles" aria-label="Request counts">
        <Tile tone="action" n={c.needs_you} label="Need you" hint="Waiting on your action" href="#/requests?status=needs_you" />
        <Tile tone="warn" n={c.delayed} label="Delayed" hint="Behind the original estimate" href="#/requests?status=delayed" />
        <Tile tone="ok" n={c.on_track} label="On track" hint="Nothing needed from you" href="#/requests?status=on_track" />
        <Tile tone="muted" n={c.done} label="Done" hint="Last 30 days" href="#/requests?status=done" />
      </section>

      {needs.length > 0 && (
        <section className="block">
          <div className="block-head">
            <h2>Needs you <span className="count count-action">{needs.length}</span></h2>
            <p className="muted">These are paused until you act. The team’s clock is stopped while they wait.</p>
          </div>
          <ul className="needs-list">
            {needs.map((r) => (
              <li key={r.id} className="needs-card" onClick={() => go(`/requests/${r.id}`)}>
                <div className="needs-main">
                  <div className="meta-row">
                    <span className="mono">{r.id}</span>
                    {r.priority === 'Urgent' && <span className="tag tag-urgent">Urgent</span>}
                    <span>{r.team}</span>
                  </div>
                  <h3>{r.action.title}</h3>
                  <p className="muted">{r.title}</p>
                </div>
                <div className="needs-side">
                  <span className="due">Due {r.action.due}</span>
                  <a className="btn btn-primary" href={`#/requests/${r.id}`} onClick={(e) => e.stopPropagation()}>{r.action.cta}</a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="two-col">
        {delayed.length > 0 && (
          <section className="block">
            <div className="block-head">
              <h2>Delayed <span className="count count-warn">{delayed.length}</span></h2>
              <p className="muted">Why, and the new window.</p>
            </div>
            <ul className="plain-list">
              {delayed.map((r) => (
                <li key={r.id}>
                  <a href={`#/requests/${r.id}`}>
                    <strong>{r.title}</strong>
                    <span className="muted small">{r.delay.reason}</span>
                    <span className="small row-gap">
                      <span className="strike">{r.eta.was}</span> → <EtaText eta={r.eta} compact />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="block">
          <div className="block-head">
            <h2>Recently updated</h2>
            <p className="muted">Moving along, nothing needed from you.</p>
          </div>
          <ul className="plain-list">
            {recent.map((r) => (
              <li key={r.id}>
                <a href={`#/requests/${r.id}`}>
                  <span className="row-between"><strong>{r.title}</strong><StatusPill status={r.status} /></span>
                  <span className="muted small">{r.plain}</span>
                </a>
              </li>
            ))}
            {recent.length === 0 && <li className="muted small empty">Nothing else right now.</li>}
          </ul>
          <a className="link-more" href="#/requests">See all requests →</a>
        </section>
      </div>
    </div>
  )
}

function Tile({ tone, n, label, hint, href }) {
  return (
    <a className={`tile tile-${tone}`} href={href}>
      <span className="tile-n">{n}</span>
      <span className="tile-label">{label}</span>
      <span className="tile-hint">{hint}</span>
    </a>
  )
}

/* ---------- Requests list ---------- */
function RequestList({ list, initialStatus }) {
  const [status, setStatus] = useState(initialStatus)
  const [q, setQ] = useState('')
  const [team, setTeam] = useState('all')
  useEffect(() => setStatus(initialStatus), [initialStatus])

  const c = counts(list)
  const teams = [...new Set(list.map((r) => r.team))].sort()
  const order = { needs_you: 0, delayed: 1, on_track: 2, done: 3 }
  const shown = list
    .filter((r) => status === 'all' || r.status === status)
    .filter((r) => team === 'all' || r.team === team)
    .filter((r) => !q || `${r.id} ${r.title} ${r.category} ${r.team} ${r.owner}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => order[a.status] - order[b.status])

  const tabs = [
    ['all', 'All', list.length],
    ['needs_you', 'Needs you', c.needs_you],
    ['delayed', 'Delayed', c.delayed],
    ['on_track', 'On track', c.on_track],
    ['done', 'Done', c.done],
  ]

  return (
    <div>
      <div className="page-head">
        <h1>Requests</h1>
        <p className="muted">Every request your company has open with ResolveHQ that you raised, approve or watch.</p>
      </div>

      <div className="filters">
        <div className="seg" role="tablist">
          {tabs.map(([k, label, n]) => (
            <button key={k} role="tab" aria-selected={status === k} className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>
              {label} <span className="seg-n">{n}</span>
            </button>
          ))}
        </div>
        <div className="filter-right">
          <input className="input" type="search" placeholder="Search by title, ID or team" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Team">
            <option value="all">All teams</option>
            {teams.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="table" role="table">
        <div className="tr th" role="row">
          <span>Request</span><span>Where it is</span><span>With</span><span>Expected</span><span>Updated</span>
        </div>
        {shown.map((r) => (
          <a key={r.id} className={`tr row-${r.status}`} role="row" href={`#/requests/${r.id}`}>
            <span className="cell-title">
              <strong>{r.title}</strong>
              <span className="muted small"><span className="mono">{r.id}</span> · {r.category}{r.priority === 'Urgent' && <span className="tag tag-urgent">Urgent</span>}</span>
            </span>
            <span className="cell-status">
              <StatusPill status={r.status} />
              <span className="small">{r.status === 'needs_you' ? <strong>{r.action.title}</strong> : r.plain}</span>
            </span>
            <span className="small"><span className="label-sm">With</span>{r.team}<br /><span className="muted">{r.owner}</span></span>
            <span className="small"><span className="label-sm">Expected</span><EtaText eta={r.eta} compact /></span>
            <span className="small muted"><span className="label-sm">Updated</span>{r.updated}</span>
          </a>
        ))}
        {shown.length === 0 && <div className="empty">No requests match. <button className="linkish" onClick={() => { setQ(''); setTeam('all'); setStatus('all') }}>Clear filters</button></div>}
      </div>
      <p className="muted small legend">
        <span className="conf-dot conf-high" /> high confidence <span className="conf-dot conf-medium" /> medium <span className="conf-dot conf-low" /> low, in the expected date
      </p>
    </div>
  )
}

/* ---------- Request detail ---------- */
function RequestDetail({ req, user, onComplete }) {
  const [help, setHelp] = useState(null) // null | 'talk' | 'escalate'
  const m = STATUS_META[req.status]

  return (
    <div className="detail">
      <a className="crumb" href="#/requests">← All requests</a>

      <header className={`detail-head head-${m.tone}`}>
        <div className="meta-row">
          <span className="mono">{req.id}</span><span>{req.category}</span>
          {req.priority === 'Urgent' ? <span className="tag tag-urgent">Urgent</span> : <span>{req.priority} priority</span>}
        </div>
        <h1>{req.title}</h1>
        <div className="status-line">
          <StatusPill status={req.status} />
          <p>{req.plain}</p>
        </div>
      </header>

      <div className="detail-grid">
        <div className="detail-main">
          {req.action && !req.action.completed && <ActionBlock req={req} onComplete={onComplete} />}

          <section className="card">
            <h2 className="card-title">Progress</h2>
            <StageTracker req={req} />
          </section>

          <EtaCard req={req} />

          <section className="card">
            <h2 className="card-title">What’s happened</h2>
            <p className="muted small">Every team that has worked on this, newest first.</p>
            <Timeline items={req.timeline} />
          </section>
        </div>

        <aside className="detail-aside">
          <section className="card help-card">
            <h2 className="card-title">Need help with this?</h2>
            <p className="small muted">You can always reach a person. You don’t need to wait for a delay first.</p>
            <button className="btn btn-secondary btn-block" onClick={() => setHelp('talk')}>Talk to someone</button>
            <button className="btn btn-ghost-danger btn-block" onClick={() => setHelp('escalate')}>Escalate</button>
            <p className="tiny muted">Escalations reach a support lead within 2 working hours.</p>
          </section>

          <section className="card">
            <h2 className="card-title">Who’s involved</h2>
            <dl className="people">
              <dt>Working on it</dt><dd>{req.owner}<span className="muted"> · {req.team}</span></dd>
              <dt>Raised by</dt><dd>{USERS[req.people.requester]?.name}{req.people.requester === user.id && ' (you)'}</dd>
              <dt>Approver</dt><dd>{req.people.approver}</dd>
              <dt>Technical contact</dt><dd>{req.people.technical}</dd>
              <dt>Watching</dt><dd>{req.people.watchers.length ? req.people.watchers.join(', ') : '—'}</dd>
            </dl>
            <button className="linkish small" onClick={() => alertish('Watching. You’ll get updates when this changes stage.')}>+ Add a watcher</button>
          </section>
        </aside>
      </div>

      <div className="mobile-help" role="region" aria-label="Get help">
        <button className="btn btn-secondary" onClick={() => setHelp('talk')}>Talk to someone</button>
        <button className="btn btn-ghost-danger" onClick={() => setHelp('escalate')}>Escalate</button>
      </div>

      {help && <HelpDialog mode={help} req={req} onClose={() => setHelp(null)} setMode={setHelp} />}
    </div>
  )
}

function ActionBlock({ req, onComplete }) {
  const a = req.action
  const [file, setFile] = useState(null)
  const [choice, setChoice] = useState('5')
  return (
    <section className="action-block" aria-labelledby="action-title">
      <div className="action-top">
        <span className="action-kicker">Your action · due {a.due}</span>
        <span className="small">The team is paused until you do this.</span>
      </div>
      <h2 id="action-title">{a.title}</h2>
      <p>{a.detail}</p>

      {a.kind === 'upload' && (
        <div className="action-row">
          <label className="drop">
            <input type="file" onChange={(e) => setFile(e.target.files[0]?.name || null)} hidden />
            {file ? <>📄 {file}</> : <>Drop the file here or <u>browse</u></>}
          </label>
          <button className="btn btn-primary" onClick={() => onComplete(req.id, `Uploaded ${file || 'payments_2026-11-13.csv'}.`)}>
            {file ? 'Send to team' : 'Use “payments_2026-11-13.csv”'}
          </button>
        </div>
      )}
      {a.kind === 'approve' && (
        <div className="action-row">
          <button className="btn btn-primary" onClick={() => onComplete(req.id, 'Approved access for 48 users.')}>Approve 48 users</button>
          <button className="btn btn-secondary" onClick={() => alertish('Opens a short form to tell Identity what to change.')}>Ask for changes</button>
          <button className="linkish small" onClick={() => alertish('Shows the 48 names and their role.')}>See the list</button>
        </div>
      )}
      {a.kind === 'choose' && (
        <div className="action-row">
          <div className="choices" role="radiogroup">
            {['3', '5', '7'].map((y) => (
              <label key={y} className={`choice ${choice === y ? 'on' : ''}`}>
                <input type="radio" name="ret" value={y} checked={choice === y} onChange={() => setChoice(y)} />
                {y} years{y === '5' && <span className="tiny muted"> · most common</span>}
              </label>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => onComplete(req.id, `Chose a ${choice}-year retention period.`)}>Confirm {choice} years</button>
        </div>
      )}
      <p className="tiny action-foot">Not the right person? <button className="linkish" onClick={() => alertish('Lets you hand this action to a colleague.')}>Hand this to a colleague</button></p>
    </section>
  )
}

function StageTracker({ req }) {
  const waitingNow = req.stage === 2
  const delayed = req.status === 'delayed'
  return (
    <ol className="stages">
      {STAGES.map((label, i) => {
        let state = i < req.stage ? 'done' : i === req.stage ? 'current' : 'todo'
        // "Waiting for you" only lights up when it's actually needed; otherwise it reads as "only if needed"
        if (i === 2 && !waitingNow && req.stage < 3) state = 'optional'
        if (i === 2 && req.stage === 3) state = 'done'
        if (i === 1 && req.stage === 2) state = 'paused'
        const sub =
          i === 0 ? 'We have it' :
          i === 1 ? (req.stage >= 1 ? req.team : 'A team picks it up') :
          i === 2 ? (waitingNow ? 'Your turn' : 'Only if we need something') :
          req.eta.finished ? req.eta.finished : 'Resolved and confirmed'
        return (
          <li key={label} className={`stage stage-${state} ${state === 'current' && delayed ? 'stage-delayed' : ''} ${state === 'current' && waitingNow ? 'stage-action' : ''}`}>
            <span className="stage-dot" aria-hidden>{state === 'done' ? '✓' : ''}</span>
            <span className="stage-label">{label}</span>
            <span className="stage-sub">{sub}{state === 'current' && delayed ? ' · delayed' : ''}{state === 'paused' ? ' · paused' : ''}</span>
          </li>
        )
      })}
    </ol>
  )
}

function EtaCard({ req }) {
  const { eta, delay } = req
  if (eta.finished) {
    return (
      <section className="card">
        <h2 className="card-title">Finished</h2>
        <p className="eta-big">{eta.finished}</p>
        <p className="small muted">If this isn’t fixed for you, reopen it within 14 days and it goes straight back to {req.team}.</p>
        <button className="btn btn-secondary btn-sm" onClick={() => alertish('Reopens and notifies the team.')}>It’s not fixed, reopen</button>
      </section>
    )
  }
  const conf = CONFIDENCE_META[eta.confidence]
  return (
    <section className={`card ${delay ? 'card-warn' : ''}`}>
      <h2 className="card-title">When to expect it</h2>
      <div className="eta-row">
        <div>
          <p className="eta-big">{eta.from === eta.to ? eta.from : <>{eta.from} – {eta.to}</>}</p>
          {eta.was && <p className="small"><span className="strike">Originally {eta.was}</span></p>}
        </div>
        <ConfidenceMeter level={eta.confidence} />
      </div>
      <p className="small muted">{conf.note}</p>
      {eta.clockPaused && <p className="small note-action">This window assumes you finish your action by the due date. Each day it waits moves the window by about a day.</p>}
      {delay && (
        <div className="delay">
          <p className="delay-title">Why it’s delayed</p>
          <p>{delay.reason}</p>
          <p className="small muted">Delayed since {delay.since}. Next update by <strong>{delay.nextUpdate}</strong>, even if nothing changes.</p>
        </div>
      )}
    </section>
  )
}

function ConfidenceMeter({ level }) {
  const n = { low: 1, medium: 2, high: 3 }[level]
  return (
    <div className={`meter conf-${level}`} aria-label={CONFIDENCE_META[level].label}>
      <span className="meter-bars">{[1, 2, 3].map((i) => <span key={i} className={i <= n ? 'on' : ''} />)}</span>
      <span className="small">{CONFIDENCE_META[level].label}</span>
    </div>
  )
}

function Timeline({ items }) {
  const icon = { received: '•', update: '•', handoff: '⇄', you: '!', 'you-done': '✓', delay: '⏸', done: '✓' }
  const label = { handoff: 'Handed over', you: 'Asked you', delay: 'Delayed', done: 'Done', 'you-done': 'You' }
  return (
    <ol className="timeline">
      {items.map((t, i) => (
        <li key={i} className={`tl tl-${t.kind}`}>
          <span className="tl-icon" aria-hidden>{icon[t.kind]}</span>
          <div>
            <div className="tl-head">
              {label[t.kind] && <span className="tl-kind">{label[t.kind]}</span>}
              <span className="tl-who">{t.who}</span>
              <span className="tl-when muted">{t.when}</span>
            </div>
            <p>{t.text}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function HelpDialog({ mode, req, onClose, setMode }) {
  const [sent, setSent] = useState(false)
  const [reason, setReason] = useState('')
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  return (
    <div className="scrim" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title" onClick={(e) => e.stopPropagation()}>
        <button className="dlg-close" onClick={onClose} aria-label="Close">×</button>
        {sent ? (
          <div className="dlg-done">
            <h2 id="dlg-title">{mode === 'escalate' ? 'Escalated to a support lead' : 'Message sent'}</h2>
            <p>{mode === 'escalate'
              ? `A support lead will review ${req.id} and reply by 12:40 pm today. You’ll see their reply here and by email.`
              : `${req.owner} usually replies within an hour during working hours. Their reply shows up in “What’s happened”.`}</p>
            <button className="btn btn-primary" onClick={onClose}>Back to request</button>
          </div>
        ) : mode === 'talk' ? (
          <>
            <h2 id="dlg-title">Talk to someone</h2>
            <p className="muted small">About {req.id} · {req.title}</p>
            <div className="opt-list">
              <button className="opt" onClick={() => setSent(true)}>
                <strong>Message {req.owner.split(' ')[0] === 'Not' ? 'Support' : req.owner}</strong>
                <span className="small muted">The person working on it · replies in about 1 h</span>
              </button>
              <button className="opt" onClick={() => alertish('Starts a live chat with Support.')}>
                <strong>Live chat with Support</strong>
                <span className="small muted"><span className="live-dot" /> Available now · about 3 min wait</span>
              </button>
              <button className="opt" onClick={() => alertish('Shows your account manager’s calendar.')}>
                <strong>Book a call with your account manager</strong>
                <span className="small muted">Jordan Lee · next slot today 2:30 pm</span>
              </button>
            </div>
            <p className="small">Is this hurting your business right now? <button className="linkish" onClick={() => setMode('escalate')}>Escalate instead</button></p>
          </>
        ) : (
          <>
            <h2 id="dlg-title">Escalate this request</h2>
            <p className="muted small">A support lead reviews it within 2 working hours and can change priority or bring in another team.</p>
            <fieldset className="radios">
              <legend className="small">What’s the impact?</legend>
              {['Work is blocked for my team', 'Money or customers are affected', 'The delay is too long for us', 'Something else'].map((o) => (
                <label key={o} className={`choice ${reason === o ? 'on' : ''}`}>
                  <input type="radio" name="impact" checked={reason === o} onChange={() => setReason(o)} /> {o}
                </label>
              ))}
            </fieldset>
            <label className="small field">
              Anything they should know? (optional)
              <textarea className="input" rows={3} placeholder="e.g. 120 vendor payments are due on Thursday" />
            </label>
            <div className="dlg-actions">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" disabled={!reason} onClick={() => setSent(true)}>Escalate</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ---------- Notification email mock ---------- */
function EmailMock({ onOpen }) {
  return (
    <div className="email-wrap">
      <p className="muted small email-caption">Notification email (mock). Most visits start here and deep-link into the request.</p>
      <div className="mail-client">
        <div className="mail-meta">
          <div><span className="muted">From</span> ResolveHQ &lt;updates@resolvehq.example&gt;</div>
          <div><span className="muted">To</span> Marcus Bell</div>
          <div className="mail-subject">Action needed today: one file for your payments request (RQ-2077)</div>
        </div>
        <div className="mail-body">
          <div className="mail-brand"><span className="brand-mark" aria-hidden>R</span> ResolveHQ</div>
          <p className="mail-kicker">Your action · due today by 5 pm</p>
          <h2>Upload last Friday’s payment batch file</h2>
          <p>Hi Marcus, Payments Engineering found why your vendor payments were failing. To test the fix with your data, they need the original .csv you exported on Fri 13 Nov.</p>
          <p className="mail-status">
            <strong>Where it is:</strong> paused, waiting for you<br />
            <strong>Expected fix:</strong> Tue 17 – Wed 18 Nov, once we have the file<br />
            <strong>Working on it:</strong> Dana Okafor, Payments Engineering
          </p>
          <button className="btn btn-primary" onClick={onOpen}>Open request and upload</button>
          <p className="tiny muted">Can’t do this? Reply to this email and a person will help, or forward it to the right colleague.</p>
        </div>
      </div>
    </div>
  )
}

function NotFound() {
  return <div className="empty">That request doesn’t exist or you don’t have access. <a href="#/">Back to overview</a></div>
}
