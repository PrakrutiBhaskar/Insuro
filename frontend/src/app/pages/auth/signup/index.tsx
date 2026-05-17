import { useState } from "react";
import { useNavigate } from "react-router";
import { useAppStore } from "../../../../store";
import { api } from "../../../../api/client";
import { motion } from "motion/react";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const login = useAppStore(state => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const res = await api.auth.register(name || "Arjun Sharma", email, password);
      login(res.user.email, res.user.name);
      navigate("/onboarding");
    } catch (e: any) {
      console.error(e);
      const msg = e.response?.data?.detail || 'Registration failed';
      window.dispatchEvent(new CustomEvent('show-toast', { detail: msg }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="login-card">
        <h2 className="card-title">Create Account</h2>
        <p className="card-sub">Join the future of insurance intelligence</p>
        <form onSubmit={handleSubmit} style={{ marginTop: '24px' }}>
          <div className="fg"><label className="fl">Full Name</label><input className="fi" type="text" value={name} onChange={e => setName(e.target.value)} required/></div>
          <div className="fg"><label className="fl">Email address</label><input className="fi" type="email" value={email} onChange={e => setEmail(e.target.value)} required/></div>
          <div className="fg"><label className="fl">Password</label><input className="fi" type="password" value={password} onChange={e => setPassword(e.target.value)} required/></div>
          <button className="btn btn-em btn-full" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create Account →"}
          </button>
        </form>
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text3)' }}>Already have an account? </span>
          <button className="btn-link" onClick={() => navigate("/login")}>Sign In</button>
        </div>
      </motion.div>
    </div>
  );
}
