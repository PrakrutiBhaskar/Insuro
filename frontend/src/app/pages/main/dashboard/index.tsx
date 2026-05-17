import { useAppStore } from "../../../../store";
import { motion } from "motion/react";
import { useNavigate } from "react-router";

export default function Dashboard() {
  const store = useAppStore();
  const navigate = useNavigate();
  const modelResult = store.modelResult;

  if (!modelResult) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center' }}>
        <h2>No analysis data found</h2>
        <p>Please complete the onboarding process first.</p>
        <button className="btn btn-em" onClick={() => navigate("/onboarding")}>Start Onboarding</button>
      </div>
    );
  }

  return (
    <div className="reco-wrap">
      <div className="reco-header">
        <div className="reco-header-left">
          <p className="reco-greeting">AI Recommendations ready</p>
          <h2 className="reco-name">
            {(store.profile?.name || store.user?.name || "User")
              .split(' ')
              .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : '')
              .join(' ')}
          </h2>
          <p className="reco-meta">Profile · {new Date().toLocaleDateString('default', { month: 'short', year: 'numeric' })} · Model v2.4.1 · {modelResult?.inferenceTime || "0.0"}s latency</p>
          
          <div className="risk-score-overview">
            <div className="gauge-container">
              <svg viewBox="0 0 100 50" className="gauge-svg">
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--border)" strokeWidth="8" strokeLinecap="round" />
                <path 
                  d="M 10 50 A 40 40 0 0 1 90 50" 
                  fill="none" 
                  stroke="url(#gaugeGrad)" 
                  strokeWidth="8" 
                  strokeLinecap="round" 
                  strokeDasharray="125.6" 
                  strokeDashoffset={125.6 * (1 - (modelResult?.risk_score || 0))}
                />
                <defs>
                  <linearGradient id="gaugeGrad">
                    <stop offset="0%" stopColor="var(--em)" />
                    <stop offset="50%" stopColor="var(--warn)" />
                    <stop offset="100%" stopColor="var(--danger)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="gauge-text">
                <span className="gt-val">{typeof modelResult?.risk_score === 'number' ? (modelResult.risk_score * 100).toFixed(0) : "0"}</span>
                <span className="gt-lbl">RISK SCORE</span>
              </div>
            </div>
            <div className="risk-details">
              <p className="rd-badge" style={{ 
                background: modelResult?.risk_label === 'High' ? 'rgba(255, 77, 109, 0.1)' : 'rgba(255, 179, 71, 0.1)',
                color: modelResult?.risk_label === 'High' ? 'var(--danger)' : 'var(--warn)',
                borderColor: modelResult?.risk_label === 'High' ? 'rgba(255, 77, 109, 0.2)' : 'rgba(255, 179, 71, 0.2)'
              }}>
                {modelResult?.risk_label ?? "Assessment"} Risk Tier
              </p>
              <p className="rd-desc">
                Top factor: <strong>{(modelResult?.top_shap_features?.[0]?.feature ?? "Clinical Data").toUpperCase()}</strong> is informing your risk profile.
              </p>
            </div>
          </div>
        </div>

        <div className="reco-header-right">
          <div className="coverage-gap-widget">
            <div className="cg-title">Key Risk Factors</div>
            <div className="cg-items">
              {modelResult?.top_shap_features?.slice(0, 3).map((f: any, i: number) => (
                <div key={i} className="cg-item">
                  <span className="cg-ico">{f.shap_val > 0 ? "⚠️" : "✅"}</span>
                  <div className="cg-info">
                    <span className="cg-lbl" style={{ textTransform: 'capitalize' }}>{f.feature.replace(/_/g, ' ')}</span>
                    <span className={`cg-status ${f.shap_val > 0 ? 'missing' : 'covered'}`}>
                      {f.shap_val > 0 ? "Increases Risk" : "Reduces Risk"}
                    </span>
                  </div>
                </div>
              ))}
              {(!modelResult?.top_shap_features || modelResult.top_shap_features.length === 0) && (
                <div className="cg-item">
                  <div className="cg-info">
                    <span className="cg-lbl">No specific risk factors identified</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="dash-grid" style={{ marginTop: '40px' }}>
        <div className="dash-card">
          <div className="dc-label">Risk Score</div>
          <div className="dc-value" style={{ color: 'var(--warn)' }}>{(modelResult?.risk_score ?? 0).toFixed(2)}</div>
          <div className="dc-sub">{modelResult?.risk_label || 'Unknown'} Risk Tier</div>
        </div>
        <div className="dash-card">
          <div className="dc-label">Plans Analysed</div>
          <div className="dc-value" style={{ color: 'var(--em)' }}>{modelResult?.plans_scored ?? 0}</div>
          <div className="dc-sub">{modelResult?.top_plans?.length || 0} recommended · {(modelResult?.plans_scored ?? 0) - (modelResult?.top_plans?.length || 0)} filtered</div>
        </div>
        <div className="dash-card">
          <div className="dc-label">Actuarial Claim Prob.</div>
          <div className="dc-value" style={{ color: '#ff4d6d' }}>
            {modelResult?.actuarial_claim_probs?.p_claim_12m != null 
              ? (modelResult.actuarial_claim_probs.p_claim_12m * 100).toFixed(1) 
              : "0.0"}%
          </div>
          <div className="dc-sub">12-month horizon (P50)</div>
        </div>
        <div className="dash-card wide">
          <div className="dc-label">Survival Analysis Trajectory</div>
          <div style={{ marginTop: '12px' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text2)', marginBottom: '12px' }}>
              Based on your longitudinal profile, the probability of a major health claim within 36 months is <strong style={{ color: 'white' }}>
                {((modelResult?.actuarial_claim_probs?.p_claim_36m || 0) * 100).toFixed(1)}%
              </strong>.
            </p>
            <div style={{ height: '40px', display: 'flex', alignItems: 'flex-end', gap: '10px', marginTop: '10px' }}>
              {[
                { label: 'Now', val: (modelResult?.risk_score || 0) * 100 },
                { label: '12m', val: (modelResult?.actuarial_claim_probs?.p_claim_12m || 0) * 100 },
                { label: '36m', val: (modelResult?.actuarial_claim_probs?.p_claim_36m || 0) * 100 }
              ].map((pt, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '100%', background: `rgba(255, 77, 109, 0.4)`, height: `${Math.max(pt.val * 0.4, 5)}px`, borderRadius: '2px' }}></div>
                  <span style={{ fontSize: '10px', color: 'var(--text3)' }}>{pt.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="dash-card">
          <div className="dc-label">Privacy & Data</div>
          <div style={{ marginTop: '10px' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text3)', marginBottom: '12px' }}>PS04: HIPAA/IRDAI Right to be Forgotten</p>
            <button 
              className="btn btn-outline btn-sm btn-full" 
              style={{ color: 'var(--danger)', borderColor: 'rgba(255, 77, 109, 0.2)' }}
              onClick={async () => {
                if (confirm("Permanently delete all sensitive health and financial data from this session?")) {
                   // This should call api.ai.deleteData and logout/reset store
                }
              }}
            >
              🗑️ Purge My Health Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
