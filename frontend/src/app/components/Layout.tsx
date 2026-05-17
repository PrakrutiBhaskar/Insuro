import { Outlet, useNavigate, useLocation } from "react-router";
import { useState, useEffect } from "react";
import { useAppStore } from "../../store";
import { AnimatePresence, motion } from "motion/react";

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppStore(state => state.user);
  const logout = useAppStore(state => state.logout);
  const isAuthenticated = useAppStore(state => state.isAuthenticated);

  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setToastMsg(customEvent.detail);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3200);
    };
    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);

  const isHome = location.pathname === "/";
  const isProfile = location.pathname === "/intake";
  const isDash = location.pathname === "/reco";
  
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      <div className="grid-bg"></div>
      <div className="ambient">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      <nav className="nav">
        <div className="nav-logo" onClick={() => navigate("/")}>
          <div className="logo-mark">
            <svg viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="34" height="34" rx="8" fill="url(#logoGrad)"/>
              <path d="M17 6L8 11v12l9 5 9-5V11L17 6z" stroke="#020D1A" strokeWidth="1.5" fill="none"/>
              <rect x="14" y="13" width="6" height="2" rx="1" fill="#020D1A"/>
              <rect x="16" y="11" width="2" height="6" rx="1" fill="#020D1A"/>
              <defs><linearGradient id="logoGrad" x1="0" y1="0" x2="34" y2="34"><stop stopColor="#00E5A0"/><stop offset="1" stopColor="#009960"/></linearGradient></defs>
            </svg>
          </div>
          <span className="logo-text">INSURO</span>
        </div>
        <div className="nav-center">
          <button className={`nav-link ${location.pathname === "/dashboard" ? "active" : ""}`} onClick={() => navigate("/dashboard")}>Dashboard</button>
          <button className={`nav-link ${location.pathname === "/plans" ? "active" : ""}`} onClick={() => navigate("/plans")}>Plans</button>
          <button className={`nav-link ${location.pathname === "/ai-assistant" ? "active" : ""}`} onClick={() => navigate("/ai-assistant")}>AI Assistant</button>
          <button className={`nav-link ${location.pathname === "/profile" ? "active" : ""}`} onClick={() => navigate("/profile")}>Profile</button>
        </div>
        <div className="nav-right">
          {isAuthenticated ? (
            <>
              <div className="user-chip">
                <div className="user-dot">{(user?.name || 'User').substring(0, 2).toUpperCase()}</div>
                <span>{user?.name || 'Member'}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Sign out</button>
            </>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => navigate("/")}>Sign In</button>
          )}
        </div>
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col flex-1"
          style={{ paddingTop: '60px' }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
      
      <div className={`toast ${showToast ? 'show' : ''}`} id="toast">{toastMsg}</div>
    </>
  );
}
