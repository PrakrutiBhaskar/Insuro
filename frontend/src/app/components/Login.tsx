import { useState } from "react";
import { useNavigate } from "react-router";
import { useAppStore } from "../../store";
import { api } from "../../api/client";

export function Login() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const login = useAppStore(state => state.login);

  const doLogin = async () => {
    try {
      setIsLoading(true);
      const res = await api.auth.login(email || "demo@example.com", password || "demo");
      login(res.user.email, res.user.name);
      navigate("/intake");
    } catch (e) {
      console.error(e);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Login failed' }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="screen active" id="screen-login">
      <div className="login-left">
        <div className="hero-tag">
          <span className="live-dot"></span>
          Fidelity LEAP Hackathon 2026 · Problem #4
        </div>
        <h1 className="hero-h1">
          Insurance that<br/>
          <span className="line2">understands you.</span>
        </h1>
        <p className="hero-sub">
          InsuReady is the first AI-powered insurance platform built on a genuine ranking model — not a filtered database. Ingest health data, assess clinical risk, and deliver fully explainable, personalised coverage recommendations.
        </p>

        <div className="stats-row">
          <div className="stat"><span className="stat-n">18</span><span className="stat-l">Health features</span></div>
          <div className="stat"><span className="stat-n">F1 0.87</span><span className="stat-l">Model accuracy</span></div>
          <div className="stat"><span className="stat-n">SHAP</span><span className="stat-l">Explainability</span></div>
        </div>

        <div className="tech-pills">
          <span className="pill"><span className="dot"></span>XGBoost</span>
          <span className="pill"><span className="dot"></span>Bio_ClinicalBERT</span>
          <span className="pill"><span className="dot"></span>FastAPI</span>
          <span className="pill"><span className="dot"></span>React 18</span>
          <span className="pill"><span className="dot"></span>pgvector</span>
          <span className="pill"><span className="dot"></span>BullMQ</span>
        </div>

        <div className="hero-iso">
          <p className="iso-label" style={{ fontSize: '.68rem', color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '16px', textAlign: 'center' }}>AI Inference Pipeline</p>
          <div className="pipeline">
            <div className="pipe-node">
              <div className="pipe-ico" style={{ background: 'rgba(91,155,213,0.1)', borderColor: 'rgba(91,155,213,0.25)' }}>📋</div>
              <p className="pipe-lbl">Health Profile</p>
            </div>
            <div className="pipe-conn"></div>
            <div className="pipe-node">
              <div className="pipe-ico" style={{ background: 'rgba(0,229,160,0.1)', borderColor: 'rgba(0,229,160,0.25)' }}>🧬</div>
              <p className="pipe-lbl">NLP Extract</p>
            </div>
            <div className="pipe-conn"></div>
            <div className="pipe-node">
              <div className="pipe-ico" style={{ background: 'rgba(0,229,160,0.08)', borderColor: 'rgba(0,229,160,0.2)' }}>⚡</div>
              <p className="pipe-lbl">XGBoost Risk</p>
            </div>
            <div className="pipe-conn"></div>
            <div className="pipe-node">
              <div className="pipe-ico" style={{ background: 'rgba(255,179,71,0.1)', borderColor: 'rgba(255,179,71,0.25)' }}>📊</div>
              <p className="pipe-lbl">SHAP Explain</p>
            </div>
            <div className="pipe-conn"></div>
            <div className="pipe-node">
              <div className="pipe-ico" style={{ background: 'rgba(0,229,160,0.12)', borderColor: 'rgba(0,229,160,0.3)' }}>🏆</div>
              <p className="pipe-lbl">Top 5 Plans</p>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <div className="card-logo">
            <svg className="card-logo-mark" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="36" height="36" rx="9" fill="url(#cardLogoGrad)"/>
              <path d="M18 6L9 11v13l9 6 9-6V11L18 6z" stroke="#020D1A" strokeWidth="1.5" fill="none"/>
              <rect x="15.5" y="13.5" width="5" height="2" rx="1" fill="#020D1A"/>
              <rect x="17.5" y="11.5" width="2" height="6" rx="1" fill="#020D1A"/>
              <defs><linearGradient id="cardLogoGrad" x1="0" y1="0" x2="36" y2="36"><stop stopColor="#00E5A0"/><stop offset="1" stopColor="#009960"/></linearGradient></defs>
            </svg>
            <span className="card-logo-text">InsuReady</span>
          </div>
          <h2 className="card-title">Welcome back</h2>
          <p className="card-sub">Sign in to your coverage intelligence dashboard</p>

          <div className="tab-row">
            <button className={`tab-btn ${tab === 'signin' ? 'active' : ''}`} onClick={() => setTab('signin')}>Sign In</button>
            <button className={`tab-btn ${tab === 'signup' ? 'active' : ''}`} onClick={() => setTab('signup')}>Create Account</button>
          </div>

          {tab === "signin" && (
            <div id="signin-form">
              <div className="fg"><label className="fl">Email address</label><input className="fi" type="email" placeholder="arjun@example.com" value={email} onChange={e => setEmail(e.target.value)}/></div>
              <div className="fg"><label className="fl">Password</label><input className="fi" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}/></div>
              <button className="btn btn-em btn-full" style={{ marginBottom: '16px' }} onClick={doLogin} disabled={isLoading}>
                {isLoading ? "Authenticating..." : "Continue →"}
              </button>
              <div className="divider">or</div>
              <div className="demo-tip">🎬 <strong>Demo mode</strong> — click Continue with any input to launch the full experience</div>
            </div>
          )}

          {tab === "signup" && (
            <div id="signup-form">
              <div className="fg"><label className="fl">Full name</label><input className="fi" type="text" placeholder="Arjun Sharma" value={name} onChange={e => setName(e.target.value)}/></div>
              <div className="fg"><label className="fl">Email address</label><input className="fi" type="email" placeholder="arjun@example.com" value={email} onChange={e => setEmail(e.target.value)}/></div>
              <div className="fg"><label className="fl">Password</label><input className="fi" type="password" placeholder="Min 8 chars, mixed case + digit" value={password} onChange={e => setPassword(e.target.value)}/></div>
              <button className="btn btn-em btn-full" style={{ marginBottom: '16px' }} onClick={doLogin} disabled={isLoading}>
                {isLoading ? "Creating account..." : "Create Account →"}
              </button>
              <div className="demo-tip">🎬 <strong>Demo mode</strong> — click Create Account to launch</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
