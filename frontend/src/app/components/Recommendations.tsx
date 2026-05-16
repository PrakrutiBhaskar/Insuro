import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { useAppStore } from "../../store";

const allPlans = [
  { name: 'DiabShield Comprehensive Plus', ins: 'Star Health', price: 2840, tags: ['Diabetes', 'Endocrinology', 'Cashless'] },
  { name: 'CareEdge Chronic Protect 360°', ins: 'HDFC ERGO', price: 2460, tags: ['Preventive', 'HbA1c', 'Screenings'] },
  { name: 'OptimaRestore Active Wellness', ins: 'Max Bupa', price: 2980, tags: ['Cardiac', 'Sum ₹20L', 'Wellness'] },
  { name: 'iHealth Shield Critical Care', ins: 'ICICI Lombard', price: 1980, tags: ['Critical Illness', 'Low Deductible'] },
  { name: 'Niva Bupa ReAssure 360', ins: 'Niva Bupa', price: 2200, tags: ['Mental Health', 'Maternity', 'Cashless'] },
  { name: 'Digit Health Plus', ins: 'Go Digit', price: 1650, tags: ['Affordable', 'Digital First', 'OPD'] },
];

export function Recommendations() {
  const location = useLocation();
  const store = useAppStore();
  const modelResult = location.state?.modelResult || {};
  
  const [tab, setTab] = useState("recommendations");
  const [shapOpen, setShapOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlans, setSelectedPlans] = useState<number[]>([]);
  const [barsAnimated, setBarsAnimated] = useState(false);

  useEffect(() => {
    if (tab === "dashboard") {
      setTimeout(() => setBarsAnimated(true), 100);
    } else {
      setBarsAnimated(false);
    }
  }, [tab]);

  const togglePlanSel = (i: number) => {
    if (selectedPlans.includes(i)) {
      setSelectedPlans(prev => prev.filter(x => x !== i));
    } else if (selectedPlans.length < 3) {
      setSelectedPlans(prev => [...prev, i]);
    } else {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Maximum 3 plans can be compared' }));
    }
  };

  const filteredPlans = allPlans.filter(p => 
    !searchQuery || 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.ins.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="screen active" id="screen-reco">
      <div className="reco-wrap">

        <div className="reco-header">
          <div>
            <p className="reco-greeting">AI Recommendations ready</p>
            <h2 className="reco-name">{store.profile?.name || store.user?.name || "Arjun Sharma"}, {store.profile?.dob ? new Date().getFullYear() - new Date(store.profile.dob).getFullYear() : 35}</h2>
            <p className="reco-meta">Generated · May 2026 · Model v2.4.1 · Inference: 1.3s</p>
          </div>
          <div className="risk-badge">
            <div>
              <div className="rb-lbl">Risk Classification</div>
              <div className="rb-val">{modelResult?.risk_label || "Medium-High"}</div>
              <div className="rb-score">score: {modelResult?.risk_score?.toFixed(2) || "0.71"} / 1.00</div>
            </div>
          </div>
        </div>

        <div className="profile-strip">
          <div className="pchip">🩸 HbA1c: <strong>{store.vitals?.hba1c || 6.1}</strong></div>
          <div className="pchip">🍬 Glucose: <strong>{store.vitals?.glucose || 108} mg/dL</strong></div>
          <div className="pchip">💉 Cholesterol: <strong>{store.vitals?.cholesterol || 210} mg/dL</strong></div>
          <div className="pchip">❤️ BP: <strong>{store.vitals?.systolicBp || 128}/84</strong></div>
          <div className="pchip">⚖️ BMI: <strong>{store.vitals?.weight && store.vitals?.height ? (store.vitals.weight / Math.pow(store.vitals.height / 100, 2)).toFixed(1) : '26.8'}</strong></div>
          <div className="pchip">🧬 Family hx: <strong>{store.history?.familyHx?.join(', ') || 'Diabetes'}</strong></div>
          <div className="pchip">💰 Budget: <strong>₹{store.prefs?.budget?.toLocaleString() || '3,000'}/mo</strong></div>
        </div>

        <div className="reco-tabs">
          <button className={`rtab ${tab === 'recommendations' ? 'active' : ''}`} onClick={() => setTab('recommendations')}>🏆 Top Recommendations</button>
          <button className={`rtab ${tab === 'compare' ? 'active' : ''}`} onClick={() => setTab('compare')}>⚖️ Compare Plans</button>
          <button className={`rtab ${tab === 'explorer' ? 'active' : ''}`} onClick={() => setTab('explorer')}>🔍 Plan Explorer</button>
          <button className={`rtab ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>📊 My Dashboard</button>
        </div>

        {tab === "recommendations" && (
          <div className="plan-list">
            <div className="plan-card rank-1">
              <div className="rank-badge rank-1-badge">⭐1</div>
              <div className="plan-top">
                <div className="plan-logo" style={{ background: 'rgba(0,229,160,0.08)' }}>🛡️</div>
                <div className="plan-info">
                  <p className="plan-name">DiabShield Comprehensive Plus</p>
                  <p className="plan-insurer">Star Health & Allied Insurance</p>
                  <span className="cov-badge cov-comp">Comprehensive</span>
                </div>
              </div>
              <div className="plan-metrics">
                <div className="metric"><div className="metric-lbl">Monthly Premium</div><div className="metric-val em">₹2,840</div></div>
                <div className="metric"><div className="metric-lbl">Sum Insured</div><div className="metric-val">₹15L</div></div>
                <div className="metric"><div className="metric-lbl">Deductible</div><div className="metric-val">₹5,000</div></div>
                <div className="metric"><div className="metric-lbl">Network</div><div className="metric-val">Cashless</div></div>
              </div>
              <div className="suit-bar-wrap">
                <div className="suit-bar-header"><span className="suit-bar-lbl">Suitability Score</span><span className="suit-bar-val">94%</span></div>
                <div className="suit-bar"><div className="suit-fill" style={{ width: '94%' }}></div></div>
              </div>
              <div className="plan-tags">
                <span className="plan-tag">Diabetes OPD</span><span className="plan-tag">Endocrinology</span><span className="plan-tag">Cashless Network</span><span className="plan-tag">HbA1c Monitoring</span>
              </div>
              <div>
                <div className="shap-btn" onClick={() => setShapOpen(!shapOpen)}>
                  <span>🔍 SHAP explainability — why this plan ranks #1</span>
                  <span className={`shap-chev ${shapOpen ? 'open' : ''}`}>▾</span>
                </div>
                <div className={`shap-panel ${shapOpen ? 'open' : ''}`}>
                  <div className="shap-inner">
                    {modelResult?.top_shap_features?.map((f: any) => (
                      <div className="shap-row" key={f.feature}>
                        <span className="shap-feat">{f.feature}</span>
                        <div className="shap-bar">
                          <div className={`shap-fill ${f.shap_val > 0 ? 'pos' : 'neg'}`} style={{ width: `${Math.abs(f.shap_val * 150)}%` }}></div>
                        </div>
                        <span className={`shap-val ${f.shap_val > 0 ? 'pos' : 'neg'}`}>
                          {f.shap_val > 0 ? "+" : ""}{f.shap_val.toFixed(2)}
                        </span>
                      </div>
                    )) || (
                      <>
                        <div className="shap-row"><span className="shap-feat">Pre-diabetic HbA1c (6.1)</span><div className="shap-bar"><div className="shap-fill pos" style={{ width: '88%' }}></div></div><span className="shap-val pos">+0.42</span></div>
                        <div className="shap-row"><span className="shap-feat">Diabetes family history</span><div className="shap-bar"><div className="shap-fill pos" style={{ width: '64%' }}></div></div><span className="shap-val pos">+0.28</span></div>
                        <div className="shap-row"><span className="shap-feat">Elevated cholesterol</span><div className="shap-bar"><div className="shap-fill pos" style={{ width: '42%' }}></div></div><span className="shap-val pos">+0.15</span></div>
                        <div className="shap-row"><span className="shap-feat">Non-smoker</span><div className="shap-bar"><div className="shap-fill neg" style={{ width: '25%' }}></div></div><span className="shap-val neg">−0.09</span></div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="plan-actions">
                <button className="btn btn-em btn-sm">View Policy ↗</button>
                <button className="btn btn-outline btn-sm">Save Plan</button>
                <button className="btn btn-ghost btn-sm">Get Quote</button>
              </div>
            </div>

            {/* Plan 2 */}
            <div className="plan-card">
              <div className="rank-badge rank-n-badge">2</div>
              <div className="plan-top">
                <div className="plan-logo" style={{ background: 'rgba(0,229,160,0.06)' }}>🌿</div>
                <div className="plan-info">
                  <p className="plan-name">CareEdge Chronic Protect 360°</p>
                  <p className="plan-insurer">HDFC ERGO Health Insurance</p>
                  <span className="cov-badge cov-prev">Preventive</span>
                </div>
              </div>
              <div className="plan-metrics">
                <div className="metric"><div className="metric-lbl">Monthly Premium</div><div className="metric-val em">₹2,460</div></div>
                <div className="metric"><div className="metric-lbl">Sum Insured</div><div className="metric-val">₹10L</div></div>
                <div className="metric"><div className="metric-lbl">Deductible</div><div className="metric-val">₹7,500</div></div>
                <div className="metric"><div className="metric-lbl">Network</div><div className="metric-val">5,200+</div></div>
              </div>
              <div className="suit-bar-wrap">
                <div className="suit-bar-header"><span className="suit-bar-lbl">Suitability Score</span><span className="suit-bar-val">87%</span></div>
                <div className="suit-bar"><div className="suit-fill" style={{ width: '87%' }}></div></div>
              </div>
              <div className="plan-tags">
                <span className="plan-tag">Preventive Screenings</span><span className="plan-tag">HbA1c Tests</span><span className="plan-tag">Chronic OPD</span>
              </div>
              <div className="plan-actions">
                <button className="btn btn-em btn-sm">View Policy ↗</button>
                <button className="btn btn-outline btn-sm">Save Plan</button>
              </div>
            </div>

            {/* Plan 3 */}
            <div className="plan-card">
              <div className="rank-badge rank-n-badge">3</div>
              <div className="plan-top">
                <div className="plan-logo" style={{ background: 'rgba(255,179,71,0.08)' }}>💎</div>
                <div className="plan-info">
                  <p className="plan-name">OptimaRestore Active Wellness</p>
                  <p className="plan-insurer">Max Bupa Health Insurance</p>
                  <span className="cov-badge cov-prem">Premium</span>
                </div>
              </div>
              <div className="plan-metrics">
                <div className="metric"><div className="metric-lbl">Monthly Premium</div><div className="metric-val em">₹2,980</div></div>
                <div className="metric"><div className="metric-lbl">Sum Insured</div><div className="metric-val">₹20L</div></div>
                <div className="metric"><div className="metric-lbl">Deductible</div><div className="metric-val">₹0</div></div>
                <div className="metric"><div className="metric-lbl">Network</div><div className="metric-val">Cashless</div></div>
              </div>
              <div className="suit-bar-wrap">
                <div className="suit-bar-header"><span className="suit-bar-lbl">Suitability Score</span><span className="suit-bar-val">81%</span></div>
                <div className="suit-bar"><div className="suit-fill" style={{ width: '81%' }}></div></div>
              </div>
              <div className="plan-tags">
                <span className="plan-tag">Cardiac</span><span className="plan-tag">₹20L Cover</span><span className="plan-tag">Wellness Rewards</span>
              </div>
              <div className="plan-actions">
                <button className="btn btn-em btn-sm">View Policy ↗</button>
                <button className="btn btn-outline btn-sm">Save Plan</button>
              </div>
            </div>
            
            {/* Plan 4 */}
            <div className="plan-card">
              <div className="rank-badge rank-n-badge">4</div>
              <div className="plan-top">
                <div className="plan-logo" style={{ background: 'rgba(255,77,109,0.07)' }}>🔰</div>
                <div className="plan-info">
                  <p className="plan-name">iHealth Shield Critical Care</p>
                  <p className="plan-insurer">ICICI Lombard General Insurance</p>
                  <span className="cov-badge cov-crit">Critical Illness</span>
                </div>
              </div>
              <div className="plan-metrics">
                <div className="metric"><div className="metric-lbl">Monthly Premium</div><div className="metric-val em">₹1,980</div></div>
                <div className="metric"><div className="metric-lbl">Sum Insured</div><div className="metric-val">₹25L</div></div>
                <div className="metric"><div className="metric-lbl">Deductible</div><div className="metric-val">₹2,500</div></div>
                <div className="metric"><div className="metric-lbl">Network</div><div className="metric-val">4,800+</div></div>
              </div>
              <div className="suit-bar-wrap">
                <div className="suit-bar-header"><span className="suit-bar-lbl">Suitability Score</span><span className="suit-bar-val">74%</span></div>
                <div className="suit-bar"><div className="suit-fill" style={{ width: '74%' }}></div></div>
              </div>
              <div className="plan-tags">
                <span className="plan-tag">Critical Illness</span><span className="plan-tag">Low Deductible</span>
              </div>
              <div className="plan-actions">
                <button className="btn btn-em btn-sm">View Policy ↗</button>
                <button className="btn btn-outline btn-sm">Save Plan</button>
              </div>
            </div>
          </div>
        )}

        {tab === "compare" && (
          <div className="compare-grid">
            <div className="compare-col featured">
              <div className="compare-header">
                <div style={{ fontSize: '.65rem', color: 'var(--em)', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '8px' }}>⭐ BEST MATCH</div>
                <div className="compare-plan-name">DiabShield Comprehensive Plus</div>
                <div className="compare-insurer">Star Health</div>
                <div className="compare-price">₹2,840<span>/month</span></div>
              </div>
              <div className="compare-feature-row"><span className="cf-label">Sum Insured</span><span className="cf-val">₹15 Lakhs</span></div>
              <div className="compare-feature-row"><span className="cf-label">Deductible</span><span className="cf-val">₹5,000</span></div>
              <div className="compare-feature-row"><span className="cf-label">OPD Cover</span><span className="cf-val cf-yes">✓ Included</span></div>
              <div className="compare-feature-row"><span className="cf-label">Diabetes OPD</span><span className="cf-val cf-yes">✓ Yes</span></div>
              <div className="compare-feature-row"><span className="cf-label">Preventive</span><span className="cf-val cf-yes">✓ Annual</span></div>
              <div className="compare-feature-row"><span className="cf-label">Cashless Network</span><span className="cf-val cf-yes">✓ 9,000+</span></div>
              <div className="compare-feature-row"><span className="cf-label">Mental Health</span><span className="cf-val cf-no">– Not covered</span></div>
              <div className="compare-feature-row"><span className="cf-label">Suitability</span><span className="cf-val" style={{ color: 'var(--em)' }}>94%</span></div>
            </div>
            <div className="compare-col">
              <div className="compare-header">
                <div style={{ fontSize: '.65rem', color: 'var(--text3)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '8px' }}>RANK 2</div>
                <div className="compare-plan-name">CareEdge Chronic Protect</div>
                <div className="compare-insurer">HDFC ERGO</div>
                <div className="compare-price">₹2,460<span>/month</span></div>
              </div>
              <div className="compare-feature-row"><span className="cf-label">Sum Insured</span><span className="cf-val">₹10 Lakhs</span></div>
              <div className="compare-feature-row"><span className="cf-label">Deductible</span><span className="cf-val">₹7,500</span></div>
              <div className="compare-feature-row"><span className="cf-label">OPD Cover</span><span className="cf-val cf-yes">✓ Included</span></div>
              <div className="compare-feature-row"><span className="cf-label">Diabetes OPD</span><span className="cf-val cf-yes">✓ Yes</span></div>
              <div className="compare-feature-row"><span className="cf-label">Preventive</span><span className="cf-val cf-yes">✓ Quarterly</span></div>
              <div className="compare-feature-row"><span className="cf-label">Cashless Network</span><span className="cf-val">5,200+</span></div>
              <div className="compare-feature-row"><span className="cf-label">Mental Health</span><span className="cf-val cf-no">– Not covered</span></div>
              <div className="compare-feature-row"><span className="cf-label">Suitability</span><span className="cf-val" style={{ color: 'var(--em)' }}>87%</span></div>
            </div>
            <div className="compare-col">
              <div className="compare-header">
                <div style={{ fontSize: '.65rem', color: 'var(--text3)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '8px' }}>RANK 3</div>
                <div className="compare-plan-name">OptimaRestore Active</div>
                <div className="compare-insurer">Max Bupa</div>
                <div className="compare-price">₹2,980<span>/month</span></div>
              </div>
              <div className="compare-feature-row"><span className="cf-label">Sum Insured</span><span className="cf-val">₹20 Lakhs</span></div>
              <div className="compare-feature-row"><span className="cf-label">Deductible</span><span className="cf-val">₹0</span></div>
              <div className="compare-feature-row"><span className="cf-label">OPD Cover</span><span className="cf-val cf-no">– Limited</span></div>
              <div className="compare-feature-row"><span className="cf-label">Diabetes OPD</span><span className="cf-val cf-no">– Add-on</span></div>
              <div className="compare-feature-row"><span className="cf-label">Preventive</span><span className="cf-val cf-yes">✓ Annual</span></div>
              <div className="compare-feature-row"><span className="cf-label">Cashless Network</span><span className="cf-val cf-yes">✓ 7,500+</span></div>
              <div className="compare-feature-row"><span className="cf-label">Mental Health</span><span className="cf-val cf-yes">✓ Included</span></div>
              <div className="compare-feature-row"><span className="cf-label">Suitability</span><span className="cf-val" style={{ color: 'var(--em)' }}>81%</span></div>
            </div>
          </div>
        )}

        {tab === "explorer" && (
          <div>
            <input 
              className="explorer-search" 
              placeholder="🔍  Search plans by name or insurer…" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {selectedPlans.length > 1 && (
              <div style={{ marginBottom: '16px' }}>
                <button className="btn btn-em btn-sm" onClick={() => setTab('compare')}>Compare selected ({selectedPlans.length})</button>
              </div>
            )}
            <div className="plan-grid">
              {filteredPlans.map((p, i) => (
                <div key={i} className={`plan-mini ${selectedPlans.includes(i) ? 'selected' : ''}`} onClick={() => togglePlanSel(i)}>
                  <div className="pmc-sel">{selectedPlans.includes(i) ? '✓' : ''}</div>
                  <p className="pmc-name">{p.name}</p>
                  <p className="pmc-ins">{p.ins}</p>
                  <p className="pmc-price">₹{p.price.toLocaleString()}<span>/mo</span></p>
                  <div className="pmc-tags">
                    {p.tags.map(t => <span key={t} className="pmc-tag">{t}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "dashboard" && (
          <div className="dash-grid">
            <div className="dash-card">
              <div className="dc-label">Risk Score</div>
              <div className="dc-value" style={{ color: 'var(--warn)' }}>{modelResult?.risk_score?.toFixed(2) || "0.71"}</div>
              <div className="dc-sub">Medium-High · 73rd percentile</div>
              <div className="mini-bars">
                {[0.52, 0.58, 0.63, 0.61, 0.66, 0.71].map((v, i) => {
                  const cols = ['#00996044','#00996055','#00998866','#00B87788','#00C882AA','#00E5A0'];
                  return (
                    <div key={i} className="mbar" style={{ flex: 1, background: cols[i], height: barsAnimated ? `${Math.round(v * 56)}px` : '0px' }}></div>
                  );
                })}
              </div>
            </div>
            <div className="dash-card">
              <div className="dc-label">Plans Analysed</div>
              <div className="dc-value" style={{ color: 'var(--em)' }}>47</div>
              <div className="dc-sub">5 recommended · 42 filtered</div>
            </div>
            <div className="dash-card">
              <div className="dc-label">Avg. Premium</div>
              <div className="dc-value">₹2,565</div>
              <div className="dc-sub">Top 5 recommendations</div>
            </div>
            <div className="dash-card wide">
              <div className="dc-label">SHAP Feature Importance</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                <div className="shap-row"><span className="shap-feat">HbA1c (6.1)</span><div className="shap-bar" style={{ flex: 1 }}><div className="shap-fill pos" style={{ width: '88%' }}></div></div><span className="shap-val pos">+0.42</span></div>
                <div className="shap-row"><span className="shap-feat">Family Hx: Diabetes</span><div className="shap-bar" style={{ flex: 1 }}><div className="shap-fill pos" style={{ width: '64%' }}></div></div><span className="shap-val pos">+0.28</span></div>
                <div className="shap-row"><span className="shap-feat">Cholesterol (210 mg/dL)</span><div className="shap-bar" style={{ flex: 1 }}><div className="shap-fill pos" style={{ width: '42%' }}></div></div><span className="shap-val pos">+0.15</span></div>
                <div className="shap-row"><span className="shap-feat">BMI (26.8)</span><div className="shap-bar" style={{ flex: 1 }}><div className="shap-fill pos" style={{ width: '28%' }}></div></div><span className="shap-val pos">+0.09</span></div>
                <div className="shap-row"><span className="shap-feat">Non-smoker</span><div className="shap-bar" style={{ flex: 1 }}><div className="shap-fill neg" style={{ width: '22%' }}></div></div><span className="shap-val neg">−0.09</span></div>
                <div className="shap-row"><span className="shap-feat">Age (35)</span><div className="shap-bar" style={{ flex: 1 }}><div className="shap-fill neg" style={{ width: '16%' }}></div></div><span className="shap-val neg">−0.06</span></div>
              </div>
            </div>
            <div className="dash-card full">
              <div className="dc-label">Session Timeline</div>
              <div className="timeline-row"><div className="t-dot" style={{ background: 'var(--em)' }}></div><div className="t-text">Signed in · demo mode launched</div><div className="t-date">14:02:01</div></div>
              <div className="timeline-row"><div className="t-dot" style={{ background: 'var(--em)' }}></div><div className="t-text">Health profile completed (5 steps)</div><div className="t-date">14:03:47</div></div>
              <div className="timeline-row"><div className="t-dot" style={{ background: 'var(--warn)' }}></div><div className="t-text">AI inference triggered · 18-feature vector sent</div><div className="t-date">14:03:51</div></div>
              <div className="timeline-row"><div className="t-dot" style={{ background: 'var(--em)' }}></div><div className="t-text">XGBoost classification complete · risk_score = 0.71</div><div className="t-date">14:03:52</div></div>
              <div className="timeline-row"><div className="t-dot" style={{ background: 'var(--em)' }}></div><div className="t-text">Top 5 plans returned · recommendations rendered</div><div className="t-date">14:03:53</div></div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
