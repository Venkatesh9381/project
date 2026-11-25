import { useState } from 'react';
import { BrainCircuit, Eye, EyeOff, LockKeyhole, Mail, UserRound, Sparkles } from 'lucide-react';

const API = '/api';

export default function AuthGate({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('interviewos_user') || 'null'); }
    catch { return null; }
  });
  const [token, setToken] = useState(() => sessionStorage.getItem('interviewos_token') || '');
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (token && user) {
    return typeof children === 'function'
      ? children({ user, token, onLogout: () => { sessionStorage.removeItem('interviewos_token'); sessionStorage.removeItem('interviewos_user'); setToken(''); setUser(null); } })
      : children;
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (mode === 'register' && name.trim().length < 2) return setError('Please enter your name (at least 2 characters).');
    if (password.length < 10) return setError('Password must contain at least 10 characters.');
    setBusy(true);
    try {
      const response = await fetch(`${API}/auth/${mode === 'register' ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...(mode === 'register' ? { name: name.trim() } : {}), email: email.trim(), password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to sign in. Please try again.');
      sessionStorage.setItem('interviewos_token', data.token);
      sessionStorage.setItem('interviewos_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      setError(err.message || 'Could not reach the API. Make sure the backend is running.');
    } finally { setBusy(false); }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand"><span className="auth-mark"><BrainCircuit size={24}/></span><span>Interview<span>OS</span></span></div>
        <div className="auth-intro"><div className="eyebrow"><Sparkles size={13}/> YOUR PRACTICE SPACE</div><h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1><p>{mode === 'login' ? 'Sign in to continue building interview confidence.' : 'Set up your account and start practising with purpose.'}</p></div>
        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && <label>Your name<div className="auth-input"><UserRound size={17}/><input autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" required minLength={2} maxLength={80}/></div></label>}
          <label>Email address<div className="auth-input"><Mail size={17}/><input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required maxLength={254}/></div></label>
          <label>Password<div className="auth-input"><LockKeyhole size={17}/><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 10 characters" required minLength={10} maxLength={128}/><button type="button" className="auth-eye" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="btn btn-primary auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <p className="auth-switch">{mode === 'login' ? "Don't have an account?" : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}> {mode === 'login' ? 'Create account' : 'Sign in'}</button></p>
        <p className="auth-security">Your password is sent securely to your own API and stored as a bcrypt hash. This app keeps the short-lived sign-in token in this browser tab only.</p>
      </section>
    </main>
  );
}
