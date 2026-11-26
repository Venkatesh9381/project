import { useEffect, useMemo, useRef, useState } from 'react';
import CodingPractice from './CodingPractice.jsx';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, BookOpen,
  BrainCircuit, CalendarDays, Check, ChevronDown, CircleHelp, Clock3,
  Code2, Command, FileText, Flame, Gauge, LayoutDashboard, LogOut,
  Menu, Mic2, Moon, MoreHorizontal, Play, Plus, Search, Settings,
  ShieldCheck, Sparkles, Sun, Target, Trophy, Users, X, Zap
} from 'lucide-react';

const initialSessions = [
  { id: 1, role: 'Frontend Developer', kind: 'Technical', date: 'Today, 10:42 AM', score: 86, duration: '24 min', status: 'Completed' },
  { id: 2, role: 'QA Automation Engineer', kind: 'Mixed', date: 'Yesterday', score: 78, duration: '31 min', status: 'Completed' },
  { id: 3, role: 'Software Engineer', kind: 'Technical', date: '18 Nov 2026', score: 72, duration: '19 min', status: 'Completed' }
];

function mapInterview(item) {
  return { id: item._id, role: item.role, kind: item.interviewType, date: new Date(item.createdAt).toLocaleDateString(), score: item.overallScore ?? 0, duration: Math.round((item.durationSeconds || 0) / 60) + ' min', status: item.status === 'completed' ? 'Completed' : item.status === 'abandoned' ? 'Abandoned' : 'In progress', answers: Array.isArray(item.answers) ? item.answers : [] };
}

const questions = {
  Technical: [
    'How would you explain the difference between let, const, and var in JavaScript?',
    'What is the difference between unit testing and integration testing?',
    'How would you design a reliable API test strategy for a critical user journey?',
    'How do you identify and reduce flaky automated tests in a CI pipeline?',
    'Describe how you would investigate a production issue using logs and test evidence.'
  ],
  HR: [
    'Tell me about yourself and the kind of role you are looking for.',
    'Describe a time you received difficult feedback. What did you do next?',
    'What motivates you to do your best work?',
    'Tell me about a disagreement with a teammate and how you handled it.',
    'What is one professional skill you are actively improving?'
  ],
  Mixed: [
    'Walk me through a project you are proud of and the impact you made.',
    'How do you investigate a bug that you cannot reproduce consistently?',
    'Tell me about a time you had to learn a new tool quickly.',
    'How would you prioritise several bugs reported close to a release?',
    'Explain a technical concept to a non-technical stakeholder.'
  ]
};

function App({ user, token, onLogout }) {
  const [active, setActive] = useState('Overview');
  const [dark, setDark] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [showSetup, setShowSetup] = useState(false);
  const [interview, setInterview] = useState(null);
  const [answer, setAnswer] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [settings, setSettings] = useState({ role: 'QA Automation Engineer', type: 'Technical', level: 'Intermediate', count: '3' });
  const [toast, setToast] = useState('');

  const nav = [
    { group: 'WORKSPACE', items: [{ label: 'Overview', icon: LayoutDashboard }, { label: 'Mock interview', icon: Mic2 }, { label: 'Coding practice', icon: Code2 }] },
    { group: 'INSIGHTS', items: [{ label: 'Performance', icon: Activity }, { label: 'Interview history', icon: FileText }] },
    { group: 'PREFERENCES', items: [{ label: 'Settings', icon: Settings }, { label: 'Help centre', icon: CircleHelp }] }
  ];

  const scoredSessions = useMemo(() => sessions.filter(item => item.status === 'Completed' && item.score > 0), [sessions]);
  const scoreAverage = useMemo(() => scoredSessions.length ? Math.round(scoredSessions.reduce((sum, item) => sum + item.score, 0) / scoredSessions.length) : 0, [scoredSessions]);
  const completedCount = sessions.filter(item => item.status === 'Completed').length;
  const totalPracticeMinutes = sessions.reduce((sum, item) => sum + (parseInt(item.duration, 10) || 0), 0);
  const currentQuestions = interview ? questions[interview.type] : [];

  useEffect(() => {
    let active = true;
    async function loadSessions() {
      try {
        const response = await fetch('/api/interviews', { headers: { Authorization: `Bearer ${token}` } });
        if (response.status === 401) { onLogout(); return; }
        if (!response.ok) throw new Error('Could not load interview history');
        const data = await response.json();
        if (!active) return;
        setSessions((data.interviews || []).map(mapInterview));
      } catch (error) {
        if (active) notify('Unable to load saved interviews. Check the API and database.');
      } finally { if (active) setLoadingSessions(false); }
    }
    loadSessions();
    return () => { active = false; };
  }, [token]);

  async function apiRequest(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) { onLogout(); throw new Error('Your session expired. Please sign in again.'); }
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function notify(message) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }

  async function startInterview() {
    try {
      const data = await apiRequest('/api/interviews', {
        method: 'POST',
        body: JSON.stringify({ role: settings.role.trim(), interviewType: settings.type, level: settings.level })
      });
      setInterview({ ...settings, id: data.interview._id, startedAt: Date.now() });
      setAnswers([]);
      setQuestionIndex(0);
      setAnswer('');
      setFeedback(null);
      setShowSetup(false);
      setActive('Mock interview');
    } catch (error) { notify(error.message); }
  }

  useEffect(() => () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
  }, []);

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      notify('Audio recording is not supported in this browser. Try a recent version of Chrome or Edge.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = event => { if (event.data?.size) audioChunksRef.current.push(event.data); };
      recorder.onerror = () => notify('Recording failed. Check microphone permissions and try again.');
      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        audioChunksRef.current = [];
        if (!blob.size) { notify('No audio was captured. Please try again.'); return; }
        setTranscribing(true);
        try {
          const form = new FormData();
          const extension = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'm4a' : 'webm';
          form.append('audio', blob, 'answer.' + extension);
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token },
            body: form
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || data.detail || 'Transcription failed');
          const transcript = (data.text || '').trim();
          if (!transcript) throw new Error('No speech was detected. Try again.');
          setAnswer(previous => previous.trim() ? previous.trim() + ' ' + transcript : transcript);
          notify('Local Whisper transcription added to your answer.');
        } catch (error) {
          notify(error.message || 'Could not transcribe this recording.');
        } finally { setTranscribing(false); }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (error) {
      notify(error.name === 'NotAllowedError' ? 'Microphone permission was denied.' : 'Could not access the microphone. Check that it is connected and available.');
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      setRecording(false);
    }
  }

  async function reviewAnswer() {
    if (answer.trim().length < 12) {
      notify('Add a little more detail before reviewing your answer.');
      return;
    }
    setReviewing(true);
    try {
      const result = await apiRequest('/api/review', {
        method: 'POST',
        body: JSON.stringify({
          question: currentQuestions[questionIndex % currentQuestions.length],
          answer: answer.trim(),
          role: interview.role,
          interviewType: interview.type
        })
      });
      const nextFeedback = {
        score: result.score,
        mode: result.mode,
        strengths: result.strengths || [],
        improve: result.improvements || [],
        sample: result.suggested_structure || 'Use a clear example and explain the result.'
      };
      setFeedback(nextFeedback);
      const updatedAnswers = [...answers];
      updatedAnswers[questionIndex] = {
        question: currentQuestions[questionIndex % currentQuestions.length],
        answer: answer.trim(),
        feedback: nextFeedback
      };
      setAnswers(updatedAnswers);
      await apiRequest(`/api/interviews/${interview.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ answers: updatedAnswers })
      });
    } catch (error) {
      notify(error.message || 'Could not review this answer.');
    } finally {
      setReviewing(false);
    }
  }

  async function nextQuestion() {
    if (questionIndex + 1 >= Number(interview.count)) {
      const completedAnswers = [...answers];
      if (answer.trim()) {
        completedAnswers[questionIndex] = {
          question: currentQuestions[questionIndex % currentQuestions.length],
          answer: answer.trim(),
          feedback: feedback ?? completedAnswers[questionIndex]?.feedback ?? null
        };
      }
      const scoredAnswers = completedAnswers.filter(item => item?.feedback?.score != null);
      const score = scoredAnswers.length
        ? Math.round(scoredAnswers.reduce((sum, item) => sum + item.feedback.score, 0) / scoredAnswers.length)
        : 0;
      const durationSeconds = Math.max(1, Math.round((Date.now() - interview.startedAt) / 1000));
      try {
        await apiRequest(`/api/interviews/${interview.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'completed', overallScore: score, durationSeconds, answers: completedAnswers })
        });
        const data = await apiRequest('/api/interviews');
        setSessions((data.interviews || []).map(mapInterview));
        notify('Interview saved to your account.');
      } catch (error) { notify('Could not finish saving this interview: ' + error.message); return; }
      setInterview(null);
      setFeedback(null);
      setAnswers([]);
      setActive('Overview');
      return;
    }
    const updatedAnswers = [...answers];
    updatedAnswers[questionIndex] = {
      question: currentQuestions[questionIndex % currentQuestions.length],
      answer: answer.trim(),
      feedback: feedback ?? updatedAnswers[questionIndex]?.feedback ?? null
    };
    try {
      await apiRequest('/api/interviews/' + interview.id, {
        method: 'PATCH',
        body: JSON.stringify({ answers: updatedAnswers })
      });
      setAnswers(updatedAnswers);
      setQuestionIndex(index => index + 1);
      setAnswer('');
      setFeedback(null);
    } catch (error) {
      notify('Could not save this answer: ' + error.message);
    }
  }

  const pageTitle = active === 'Overview' ? 'Good afternoon' : active;
  const pageSubtitle = active === 'Overview'
    ? 'A little practice today can make a big difference tomorrow.'
    : 'Build confidence through deliberate practice and useful feedback.';

  return (
    <div className={dark ? 'app dark' : 'app light'}>
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><BrainCircuit size={21} /></div><span>Interview<span className="brand-accent">OS</span></span><button className="icon-btn mobile-close" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
        <div className="workspace-switch"><div className="workspace-avatar">{(user?.name || "U").charAt(0).toUpperCase()}</div><div><strong>Personal workspace</strong><small>Personal practice workspace</small></div><ChevronDown size={15}/></div>
        <nav>
          {nav.map(section => <div className="nav-section" key={section.group}><p>{section.group}</p>{section.items.map(item => <button key={item.label} onClick={() => { setActive(item.label); setInterview(null); setMobileNav(false); }} className={`nav-link ${active === item.label ? 'active' : ''}`}><item.icon size={18}/><span>{item.label}</span>{item.label === 'Mock interview' && <span className="nav-dot"/>}</button>)}</div>)}
        </nav>
        <div className="sidebar-bottom"><div className="upgrade-card"><div className="upgrade-icon"><Zap size={17}/></div><strong>Make every answer count</strong><p>Your practice history helps you spot what to improve next.</p><button onClick={() => setActive('Performance')}>View progress <ArrowRight size={14}/></button></div><button className="nav-link" onClick={onLogout}><LogOut size={18}/><span>Sign out</span></button><div className="user-row"><div className="user-avatar">{(user?.name || "U").split(" ").map(part => part[0]).join("").slice(0,2).toUpperCase()}</div><div><strong>{user?.name || "Candidate"}</strong><small>{user?.email || "Candidate account"}</small></div><MoreHorizontal size={18}/></div></div>
      </aside>

      {mobileNav && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)}/>}

      <main className="main">
        <header className="topbar"><button className="icon-btn mobile-menu" onClick={() => setMobileNav(true)}><Menu size={20}/></button><div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{active}</strong></div><div className="top-actions"><div className="search-box"><Search size={16}/><span>Search anything</span><kbd>⌘ K</kbd></div><button className="icon-btn" aria-label="Toggle theme" onClick={() => setDark(value => !value)}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="icon-btn notification" aria-label="Notifications"><Bell size={18}/><i/></button><div className="top-avatar">{(user?.name || "U").split(" ").map(part => part[0]).join("").slice(0,2).toUpperCase()}</div></div></header>

        <div className="content">
          {active === 'Mock interview' && interview ? (
            <section className="interview-screen">
              <div className="page-heading"><div><div className="eyebrow"><span className="live-dot"/> INTERVIEW IN PROGRESS</div><h1>{interview.role}</h1><p>{interview.type} interview <span className="muted-dot">·</span> {interview.level} <span className="muted-dot">·</span> Question {questionIndex + 1} of {interview.count}</p></div><button className="btn btn-ghost" onClick={async () => { try { await apiRequest('/api/interviews/' + interview.id, { method: 'PATCH', body: JSON.stringify({ status: 'abandoned', durationSeconds: Math.max(0, Math.round((Date.now() - interview.startedAt) / 1000)), answers }) }); } catch (error) { notify('Could not save this session as abandoned: ' + error.message); return; } setInterview(null); setFeedback(null); setActive('Overview'); }}>End interview</button></div>
              <div className="interview-grid"><div className="panel question-panel"><div className="panel-top"><span className="label-pill"><Sparkles size={13}/> QUESTION {questionIndex + 1}</span><span className="time-label"><Clock3 size={14}/> Take your time</span></div><h2>{currentQuestions[questionIndex % currentQuestions.length]}</h2><p className="helper-text">Structure your answer clearly. Use a real example where possible.</p><label className="field-label" htmlFor="answer">YOUR ANSWER</label><textarea id="answer" className="answer-area" placeholder="Start typing your answer here..." value={answer} onChange={event => setAnswer(event.target.value)}/><div className="answer-footer"><span>{answer.trim() ? answer.trim().split(/\s+/).length : 0} words</span><div className="answer-controls">{recording ? <button className="btn btn-recording" onClick={stopRecording}><span className="recording-dot"/> Stop recording</button> : <button className="btn btn-ghost" onClick={startRecording} disabled={transcribing || reviewing}><Mic2 size={15}/> Record answer</button>}<button className="btn btn-primary" onClick={reviewAnswer} disabled={reviewing || recording || transcribing}><Sparkles size={15}/> {reviewing ? "Reviewing..." : "Review my answer"}</button></div></div>{recording && <p className="recording-status">Recording in progress. Select Stop recording when you finish.</p>}{transcribing && <p className="recording-status">Transcribing locally with Whisper. Please wait...</p>}{feedback && <div className="feedback-card"><div className="feedback-head"><div><span className="eyebrow">{feedback.mode === "ollama" ? "LOCAL OLLAMA AI FEEDBACK" : "HEURISTIC DEMO FEEDBACK"}</span><h3>Answer review</h3></div><div className="score-ring">{feedback.score}<small>/100</small></div></div><div className="feedback-columns"><div><strong className="good"><Check size={14}/> What worked</strong>{feedback.strengths.map(text => <p key={text}>{text}</p>)}</div><div><strong className="needs"><Target size={14}/> Improve next</strong>{feedback.improve.map(text => <p key={text}>{text}</p>)}</div></div><div className="sample-answer"><strong>Try this approach</strong><p>{feedback.sample}</p></div></div>}<div className="question-actions"><button className="btn btn-ghost" onClick={() => { setAnswer(''); setFeedback(null); }}>Clear answer</button><button className="btn btn-primary" onClick={nextQuestion}>{questionIndex + 1 >= Number(interview.count) ? 'Finish interview' : 'Next question'} <ArrowRight size={15}/></button></div></div><div className="panel coach-panel"><div className="coach-orb"><div className="orb-core"><BrainCircuit size={34}/></div><span className="orb-wave wave-one"/><span className="orb-wave wave-two"/></div><h3>Your AI coach</h3><p>I'm here to help you practise. Type your answer or record it for local speech-to-text.</p><div className="coach-status"><span className="status-dot"/> Text and voice practice</div><div className="coach-tip"><Sparkles size={16}/><div><strong>Quick tip</strong><p>For experience questions, try the STAR method: Situation, Task, Action, Result.</p></div></div><div className="demo-note"><ShieldCheck size={15}/> Voice transcription uses optional local Whisper. Answer feedback uses Ollama when available, otherwise a labelled demo fallback.</div></div></div>
            </section>
          ) : active === 'Mock interview' ? (
            <section><div className="page-heading"><div><div className="eyebrow">PRACTISE WITH PURPOSE</div><h1>Mock interview</h1><p>Set up a focused session that matches your next opportunity.</p></div></div><div className="setup-layout"><div className="panel setup-panel"><div className="panel-title"><div className="title-icon violet"><Mic2 size={19}/></div><div><h2>Configure your session</h2><p>Choose what you want to practise today.</p></div></div><div className="form-grid"><label>Target role<input value={settings.role} onChange={e => setSettings({...settings, role:e.target.value})}/></label><label>Interview type<select value={settings.type} onChange={e => setSettings({...settings, type:e.target.value})}><option>Technical</option><option>HR</option><option>Mixed</option></select></label><label>Experience level<select value={settings.level} onChange={e => setSettings({...settings, level:e.target.value})}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label><label>Number of questions<select value={settings.count} onChange={e => setSettings({...settings, count:e.target.value})}><option value="3">3 questions · Quick</option><option value="5">5 questions · Standard</option></select></label></div><div className="session-info"><div><Clock3 size={17}/><span><strong>About 15–25 minutes</strong><small>Answer at your own pace</small></span></div><div><ShieldCheck size={17}/><span><strong>Saved practice</strong><small>Session linked to your account</small></span></div></div><button className="btn btn-primary start-btn" disabled={!settings.role.trim()} onClick={startInterview}><Play size={16} fill="currentColor"/> Start practice session <ArrowRight size={16}/></button></div><div className="panel setup-aside"><div className="aside-illustration"><div className="illustration-card card-back"><span/><span/><span/></div><div className="illustration-card card-front"><Sparkles size={20}/><strong>Be ready<br/>for anything.</strong><small>One question at a time</small></div></div><h3>Make practice count</h3><p>Give specific examples, explain your thinking, and reflect on the feedback after each answer.</p><div className="tip-row"><Check size={15}/> No pressure, just progress</div><div className="tip-row"><Check size={15}/> Feedback after every answer</div><div className="tip-row"><Check size={15}/> Track improvement over time</div></div></div></section>
          ) : active === 'Overview' ? (
            <>
              <div className="page-heading"><div><div className="eyebrow"><span className="live-dot"/> YOUR PRACTICE SPACE</div><h1>{pageTitle}, {user?.name?.split(" ")[0] || "there"} <span className="wave-emoji">✦</span></h1><p>{pageSubtitle}</p></div><button className="btn btn-primary" onClick={() => setActive('Mock interview')}><Plus size={17}/> New interview</button></div>
              <div className="stats-grid"><Stat icon={Target} label="Interviews completed" value={String(completedCount)} trend={sessions.length + ' total sessions'}/><Stat icon={Gauge} label="Average score" value={scoreAverage ? scoreAverage + '%' : '—'} trend={scoredSessions.length + ' scored sessions'}/><Stat icon={Clock3} label="Practice time" value={(totalPracticeMinutes / 60).toFixed(1) + 'h'} trend="From saved sessions"/><Stat icon={Flame} label="Current streak" value="—" trend="Streak tracking not enabled" /></div>
              <div className="dashboard-grid"><div className="panel performance-panel"><div className="panel-heading"><div><h2>Score history</h2><p>Saved scores from completed interviews</p></div></div><div className="score-history-list">{scoredSessions.slice(0,7).reverse().map(session => <div className="score-history-row" key={session.id}><span>{session.role}</span><div className="skill-track"><div className="skill-fill purple" style={{width: session.score + '%'}}/></div><strong>{session.score}%</strong></div>)}{!scoredSessions.length && <p className="analytics-empty">Complete and review an interview to see your score history.</p>}</div></div><div className="panel skills-panel"><div className="panel-heading"><div><h2>Recent coaching notes</h2><p>Suggestions saved from answer reviews</p></div></div>{sessions.flatMap(session => session.answers.map((answer,index) => ({answer,role:session.role,key:session.id + '-' + index}))).filter(item => item.answer.feedback).flatMap(item => (item.answer.feedback.improve || item.answer.feedback.improvements || []).map(text => ({text,role:item.role,key:item.key + text}))).slice(-4).reverse().map(item => <div className="coaching-note" key={item.key}><span className="coaching-bullet"/><div><strong>{item.text}</strong><small>{item.role}</small></div></div>)}{!sessions.some(session => session.answers.some(answer => answer.feedback)) && <p className="analytics-empty">Your saved answer feedback will appear here after your first review.</p>}</div></div>
              <div className="panel sessions-panel"><div className="panel-heading"><div><h2>Recent interviews</h2><p>Your saved practice sessions</p></div><button className="text-link" onClick={() => setActive('Interview history')}>View all <ArrowRight size={14}/></button></div><div className="table-wrap"><table><thead><tr><th>INTERVIEW</th><th>DATE</th><th>DURATION</th><th>SCORE</th><th>STATUS</th><th/></tr></thead><tbody>{sessions.slice(0,4).map(session => <tr key={session.id}><td><div className="session-name"><div className="session-icon"><Code2 size={16}/></div><div><strong>{session.role}</strong><small>{session.kind} interview</small></div></div></td><td>{session.date}</td><td>{session.duration}</td><td><span className="score-text">{session.score}%</span></td><td><span className="status-pill"><i/>{session.status}</span></td><td><button className="more-btn"><MoreHorizontal size={18}/></button></td></tr>)}</tbody></table></div></div>
              <div className="bottom-banner"><div className="banner-icon"><BookOpen size={21}/></div><div><strong>Small steps. Strong interviews.</strong><p>Consistency beats cramming. Try one focused session today.</p></div><button onClick={() => setActive('Mock interview')}>Start practising <ArrowRight size={15}/></button><div className="banner-decoration">✳</div></div>
            </>
          ) : active === 'Coding practice' ? <CodingPractice dark={dark} />
          : active === 'Performance' ? <section><div className="page-heading"><div><div className="eyebrow">MEASURE WHAT MATTERS</div><h1>Performance</h1><p>Insights calculated from your saved interview sessions.</p></div></div><div className="stats-grid"><Stat icon={Gauge} label="Average score" value={scoreAverage ? scoreAverage + '%' : '—'} trend={scoredSessions.length + ' scored sessions'}/><Stat icon={Trophy} label="Best score" value={scoredSessions.length ? Math.max(...scoredSessions.map(s => s.score)) + '%' : '—'} trend="From completed interviews"/><Stat icon={Users} label="Sessions completed" value={String(completedCount)} trend={sessions.length + ' total sessions'}/></div><div className="panel performance-panel"><div className="panel-heading"><div><h2>Score history</h2><p>Completed interviews with a saved review score</p></div></div><div className="score-history-list">{scoredSessions.map(session => <div className="score-history-row" key={session.id}><span>{session.role} · {session.date}</span><div className="skill-track"><div className="skill-fill purple" style={{width: session.score + '%'}}/></div><strong>{session.score}%</strong></div>)}{!scoredSessions.length && <p className="analytics-empty">No scored interviews yet. Complete a session and review at least one answer.</p>}</div></div></section>
          : active === 'Interview history' ? <section><div className="page-heading"><div><div className="eyebrow">YOUR PRACTICE JOURNEY</div><h1>Interview history</h1><p>Review recent sessions and keep your progress moving.</p></div><button className="btn btn-primary" onClick={() => setActive('Mock interview')}><Plus size={16}/> New interview</button></div><div className="panel sessions-panel history-panel"><div className="panel-heading"><div><h2>All sessions</h2><p>{loadingSessions ? 'Loading saved sessions…' : sessions.length + ' saved sessions'}</p></div></div><div className="table-wrap"><table><thead><tr><th>INTERVIEW</th><th>DATE</th><th>DURATION</th><th>SCORE</th><th>STATUS</th></tr></thead><tbody>{sessions.map(session => <tr key={session.id}><td><div className="session-name"><div className="session-icon"><Code2 size={16}/></div><div><strong>{session.role}</strong><small>{session.kind} interview</small></div></div></td><td>{session.date}</td><td>{session.duration}</td><td><span className="score-text">{session.score}%</span></td><td><span className="status-pill"><i/>{session.status}</span></td></tr>)}</tbody></table></div></div></section>
          : active === 'Settings' ? <section><div className="page-heading"><div><div className="eyebrow">MAKE IT YOURS</div><h1>Settings</h1><p>Manage your workspace preferences.</p></div></div><div className="panel settings-panel"><div className="settings-row"><div><strong>Appearance</strong><p>Choose the look that feels right for you.</p></div><button className="select-button" onClick={() => setDark(value => !value)}>{dark ? 'Dark mode' : 'Light mode'} {dark ? <Moon size={15}/> : <Sun size={15}/>}</button></div><div className="settings-row"><div><strong>Practice mode</strong><p>Reviews use local Ollama when available, with a clearly labelled heuristic fallback when it is unavailable.</p></div><span className="label-pill">LOCAL AI + FALLBACK</span></div><div className="settings-row"><div><strong>Account</strong><p>You are signed in as {user?.email}.</p></div><span className="label-pill">SIGNED IN</span></div></div></section>
          : <section><div className="page-heading"><div><div className="eyebrow">WE'RE HERE TO HELP</div><h1>Help centre</h1><p>Quick answers for your practice workspace.</p></div></div><div className="panel help-panel"><h3>How does demo feedback work?</h3><p>Answer review uses local Ollama when available. If the model service is unavailable, the app uses a clearly labelled rule-based heuristic fallback. The fallback is not an AI evaluation and should not be treated as an objective interview score.</p><h3>Will my practice be saved?</h3><p>Completed and in-progress interview records are loaded from your account when the API and database are available.</p></div></section>}
          <footer className="footer"><span>© 2026 InterviewOS</span><span><span className="footer-status"/> API-backed practice workspace</span><span>Built for better practice <Sparkles size={12}/></span></footer>
        </div>
      </main>
      {toast && <div className="toast"><Check size={16}/>{toast}</div>}
    </div>
  );
}

function Stat({ icon: Icon, label, value, trend, positive }) {
  return <div className="panel stat-card"><div className="stat-top"><span>{label}</span><div className="stat-icon"><Icon size={17}/></div></div><div className="stat-value">{value}</div><div className={`stat-trend ${positive ? 'positive' : ''}`}>{positive && <ArrowUpRight size={13}/>}<span>{trend}</span></div></div>;
}

function Skill({ name, score, color }) {
  return <div className="skill-row"><div className="skill-meta"><span>{name}</span><strong>{score}%</strong></div><div className="skill-track"><div className={`skill-fill ${color}`} style={{ width: score + '%' }}/></div></div>;
}

export default App;
