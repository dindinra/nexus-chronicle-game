import { useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import {
  login,
  register,
  getMe,
  clearToken,
  getToken,
  setToken,
  type UserOut,
} from '../api/auth';

const fieldStyle: CSSProperties = {
  display: 'block',
  marginBottom: 10,
  width: '100%',
  padding: '8px',
  boxSizing: 'border-box',
};

const btnStyle: CSSProperties = {
  padding: '8px 16px',
  cursor: 'pointer',
  marginTop: 6,
};

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [user, setUser] = useState<UserOut | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    try {
      if (mode === 'register') {
        const created = await register({ username, password, email: email || undefined });
        setMsg(`Registered "${created.username}" (id ${created.id}). Now log in.`);
        setMode('login');
        return;
      }
      const t = await login({ username, password });
      setToken(t.access_token);
      setTokenState(t.access_token);
      const me = await getMe();
      setUser(me);
      setMsg(`Logged in as ${me.username} (id ${me.id}).`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  function handleLogout() {
    clearToken();
    setTokenState(null);
    setUser(null);
    setMsg('Logged out.');
  }

  return (
    <section style={{ padding: 24, maxWidth: 440 }}>
      <h1>Login / Auth</h1>
      <p style={{ color: '#9aa0aa', fontSize: 13 }}>
        Fase 6.5 — halaman Login terhubung JWT. Memanggil{' '}
        <code>POST /auth/login</code> &amp; <code>GET /auth/me</code>.
      </p>

      {user && token ? (
        <div style={{ border: '1px solid #2e7d4f', borderRadius: 8, padding: 12, marginTop: 12, background: '#10231a' }}>
          <div>
            ✅ <strong>{user.username}</strong> (id {user.id})
            {user.email ? ` · ${user.email}` : ''}
          </div>
          <div style={{ fontSize: 11, color: '#5a606b', wordBreak: 'break-all', marginTop: 6 }}>
            token: {token.slice(0, 28)}…
          </div>
          <button type="button" style={btnStyle} onClick={handleLogout}>
            Logout
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
          <label style={{ fontSize: 13 }}>
            username
            <input style={fieldStyle} value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>
          <label style={{ fontSize: 13 }}>
            password
            <input
              type="password"
              style={fieldStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {mode === 'register' && (
            <label style={{ fontSize: 13 }}>
              email (optional)
              <input style={fieldStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button type="submit" style={btnStyle}>
              {mode === 'login' ? 'Login' : 'Register'}
            </button>
            <button
              type="button"
              style={btnStyle}
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setErr(null);
                setMsg(null);
              }}
            >
              {mode === 'login' ? 'Need an account? Register' : 'Have an account? Login'}
            </button>
          </div>
        </form>
      )}

      {msg && <p style={{ color: '#52d49a', marginTop: 12 }}>{msg}</p>}
      {err && <p style={{ color: '#ff5470', marginTop: 12 }}>{err}</p>}
    </section>
  );
}
