import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAppStore } from "../../store";
import { motion, AnimatePresence } from "motion/react";
import { allPlans } from "../data/plans";
import { api } from "../../api/client";

export function Recommendations() {
  const location = useLocation();
  const navigate = useNavigate();
  const store = useAppStore();
  const modelResult = location.state?.modelResult || {};
  
  const [tab, setTab] = useState("recommendations");
  const [shapOpen, setShapOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlans, setSelectedPlans] = useState<number[]>([]);
  const [barsAnimated, setBarsAnimated] = useState(false);
  const [maxBudget, setMaxBudget] = useState(10000);
  const [simBudget, setSimBudget] = useState(modelResult?.user_input?.budget_range || 5000);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResults, setSimResults] = useState<any>(null);

  useEffect(() => {
    if (tab === "dashboard") {
      setTimeout(() => setBarsAnimated(true), 100);
    } else {
      setBarsAnimated(false);
    }
  }, [tab]);

  const runSimulation = async () => {
    setIsSimulating(true);
    try {
      const payload = { 
        ...modelResult.user_input, 
        budget_range: simBudget 
      };
      const res = await api.ai.runInference(payload);
      setSimResults(res);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Simulation complete: Recommendation rankings updated.' }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const activeResults = simResults || modelResult;
  const currentPlans = activeResults?.top_plans || [];

  const togglePlanSel = (i: number) => {
    if (selectedPlans.includes(i)) {
      setSelectedPlans(prev => prev.filter(x => x !== i));
    } else if (selectedPlans.length < 3) {
      setSelectedPlans(prev => [...prev, i]);
    } else {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Maximum 3 plans can be compared' }));
    }
  };

  const [filterType, setFilterType] = useState("All");
  const [filterInsurer, setFilterInsurer] = useState("All");
  const [filterPrice, setFilterPrice] = useState("All");

  const filteredPlans = allPlans.filter(p => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !p.ins.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterType !== "All" && p.covType !== filterType) return false;
    if (filterInsurer !== "All" && p.ins !== filterInsurer) return false;
    if (filterPrice === "Under ₹2000" && p.price >= 2000) return false;
    if (filterPrice === "₹2000 - ₹3000" && (p.price < 2000 || p.price > 3000)) return false;
    if (filterPrice === "Over ₹3000" && p.price <= 3000) return false;
    if (p.price > maxBudget) return false;
    return true;
  });

  const FilterPills = ({ options, current, onChange }: any) => (
    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
      {options.map((opt: string) => (
        <button 
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            padding: '6px 12px',
            borderRadius: '20px',
            border: current === opt ? '1px solid var(--em)' : '1px solid var(--border)',
            background: current === opt ? 'rgba(0, 229, 160, 0.1)' : 'transparent',
            color: current === opt ? 'var(--em)' : 'var(--text2)',
            fontSize: '0.85rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s'
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  return (
    <motion.div 
      className="screen active" 
      id="screen-reco"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
    >
      <div className="reco-wrap">

        <div className="reco-header">
          <div className="reco-header-left">
            <p className="reco-greeting">AI Recommendations ready</p>
            <h2 className="reco-name">{store.profile?.name || store.user?.name || "Arjun Sharma"}</h2>
            <p className="reco-meta">Profile · May 2026 · Model v2.4.1 · {modelResult?.inferenceTime || "1.3"}s latency</p>
            
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
                    strokeDashoffset={125.6 * (1 - (modelResult?.risk_score || 0.71))}
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
                  <span className="gt-val">{(modelResult?.risk_score * 100).toFixed(0) || "71"}</span>
                  <span className="gt-lbl">RISK SCORE</span>
                </div>
              </div>
              <div className="risk-details">
                <div className="rd-badge" style={{ 
                  background: modelResult?.risk_label === 'High' ? 'rgba(255, 77, 109, 0.1)' : 'rgba(255, 179, 71, 0.1)',
                  color: modelResult?.risk_label === 'High' ? 'var(--danger)' : 'var(--warn)',
                  borderColor: modelResult?.risk_label === 'High' ? 'rgba(255, 77, 109, 0.2)' : 'rgba(255, 179, 71, 0.2)'
                }}>
                  {modelResult?.risk_label || "Medium-High"} Risk Tier
                </div>
                <p className="rd-desc">
                  Top factor: <strong>{(modelResult?.top_shap_features?.[0]?.feature || "HBA1C").toUpperCase()}</strong> is increasing your risk profile.
                </p>
              </div>
            </div>
          </div>

          <div className="reco-header-right">
            <div className="coverage-gap-widget">
              <div className="cg-title">Coverage Gap Analysis</div>
              <div className="cg-items">
                <div className="cg-item">
                  <span className="cg-ico">🧪</span>
                  <div className="cg-info">
                    <span className="cg-lbl">Diabetes Management</span>
                    <span className="cg-status missing">High Gap</span>
                  </div>
                </div>
                <div className="cg-item">
                  <span className="cg-ico">🫀</span>
                  <div className="cg-info">
                    <span className="cg-lbl">Cardiac Preventive</span>
                    <span className="cg-status covered">Covered</span>
                  </div>
                </div>
                <div className="cg-item">
                  <span className="cg-ico">🏥</span>
                  <div className="cg-info">
                    <span className="cg-lbl">OPD Consultations</span>
                    <span className="cg-status partial">Partial Gap</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-summary-card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, background: modelResult?.risk_label === 'High' ? 'rgba(255, 77, 109, 0.15)' : modelResult?.risk_label === 'Low' ? 'rgba(0, 229, 160, 0.15)' : 'rgba(255, 179, 71, 0.15)', color: modelResult?.risk_label === 'High' ? '#ff4d6d' : modelResult?.risk_label === 'Low' ? '#00e5a0' : '#ffb347' }}>
              {modelResult?.risk_label === 'High' ? '🔴' : modelResult?.risk_label === 'Low' ? '🟢' : '🟡'} {modelResult?.risk_label || 'Medium-High'} Risk
            </div>
            <div style={{ display: 'flex', gap: '16px', flex: 1, flexWrap: 'wrap' }}>
               <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text2)', fontSize: '0.9rem' }}><span style={{ color: 'var(--text3)' }}>Age</span><strong style={{ color: 'white' }}>{store.profile?.dob ? new Date().getFullYear() - new Date(store.profile.dob).getFullYear() : 35}</strong></div>
               <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text2)', fontSize: '0.9rem' }}><span style={{ color: 'var(--text3)' }}>BMI</span><strong style={{ color: 'white' }}>{store.vitals?.weight && store.vitals?.height ? (store.vitals.weight / Math.pow(store.vitals.height / 100, 2)).toFixed(1) : '26.8'}</strong></div>
               <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text2)', fontSize: '0.9rem' }}><span style={{ color: 'var(--text3)' }}>HbA1c</span><strong style={{ color: 'white' }}>{store.vitals?.hba1c || 6.1}</strong></div>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text2)', lineHeight: '1.5' }}>
            Your {store.vitals?.hba1c && store.vitals.hba1c > 6.0 ? 'pre-diabetic HbA1c levels' : 'health metrics'} and {store.history?.familyHx?.join(', ').toLowerCase() || 'diabetes family history'} place you in the {modelResult?.risk_label || 'Medium-High'} risk tier. The plans below have been uniquely matched to prioritize these clinical factors.
          </p>
        </div>

        <div className="reco-tabs">
          <button className={`rtab ${tab === 'recommendations' ? 'active' : ''}`} onClick={() => setTab('recommendations')}>🏆 Top Recommendations</button>
          <button className={`rtab ${tab === 'compare' ? 'active' : ''}`} onClick={() => setTab('compare')}>⚖️ Compare Plans</button>
          <button className={`rtab ${tab === 'explorer' ? 'active' : ''}`} onClick={() => setTab('explorer')}>🔍 Plan Explorer</button>
          <button className={`rtab ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>📊 My Dashboard</button>
        </div>

        {tab === "recommendations" && (
          <motion.div 
            className="plan-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* Affordability Simulator UI */}
            <div className="simulator-card" style={{ background: 'rgba(0, 229, 160, 0.05)', border: '1px solid var(--border3)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--em)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>Affordability Simulator</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>Re-rank plans based on budget changes</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>Budget</span>
                  <input 
                    type="range" 
                    min="1000" 
                    max="15000" 
                    step="500" 
                    value={simBudget}
                    onChange={(e) => setSimBudget(Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--em)' }}
                  />
                  <span style={{ fontSize: '0.9rem', color: 'var(--em)', fontWeight: 700, minWidth: '65px' }}>₹{simBudget.toLocaleString()}</span>
                </div>
                <button 
                  className={`btn btn-em btn-sm ${isSimulating ? 'loading' : ''}`} 
                  onClick={runSimulation}
                  disabled={isSimulating}
                  style={{ width: '140px' }}
                >
                  {isSimulating ? 'Simulating...' : 'Re-rank Plans'}
                </button>
              </div>
            </div>

            {currentPlans.length > 0 ? currentPlans.map((p: any, rank: number) => {
              return (
                <motion.div 
                  key={p.plan_id || rank}
                  className={`plan-card rank-${rank + 1}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * (rank + 1), duration: 0.4 }}
                >
                  <div className={`rank-badge ${rank === 0 ? 'rank-1-badge' : 'rank-n-badge'}`}>{rank === 0 ? '⭐1' : rank + 1}</div>
                  <div className="plan-top">
                    <div className="plan-logo" style={{ background: rank === 0 ? 'rgba(0,229,160,0.08)' : 'rgba(255,255,255,0.05)' }}>{rank === 0 ? '🛡️' : rank === 1 ? '🌿' : rank === 2 ? '💎' : '🔰'}</div>
                    <div className="plan-info">
                      <p className="plan-name">{p.name}</p>
                      <p className="plan-insurer">{p.insurer}</p>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span className={`cov-badge ${p.coverage_type === 'Comprehensive' ? 'cov-comp' : p.coverage_type === 'Preventive' ? 'cov-prev' : p.coverage_type === 'Premium' ? 'cov-prem' : 'cov-crit'}`}>{p.coverage_type}</span>
                        <div style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(0,229,160,0.1)', color: 'var(--em)', fontSize: '0.65rem', fontWeight: 600 }}>
                          {activeResults?.risk_score > 0.85 ? 'High Confidence' : 'Moderate Confidence'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="plan-metrics">
                    <div className="metric"><div className="metric-lbl">Monthly Premium</div><div className="metric-val em">₹{(p.monthly_premium_inr || p.price).toLocaleString()}</div></div>
                    <div className="metric"><div className="metric-lbl">Sum Insured</div><div className="metric-val">{p.sum_insured_inr ? `₹${(p.sum_insured_inr/100000).toFixed(0)}L` : p.sumInsured}</div></div>
                    <div className="metric"><div className="metric-lbl">Co-pay</div><div className="metric-val">{p.features?.copay_pct}%</div></div>
                    <div className="metric"><div className="metric-lbl">Network</div><div className="metric-val">Cashless</div></div>
                  </div>
                  <div className="suit-bar-wrap">
                    <div className="suit-bar-header"><span className="suit-bar-lbl">Suitability Score</span><span className="suit-bar-val">{(p.suitability_score * 100).toFixed(0)}%</span></div>
                    <div className="suit-bar"><div className="suit-fill" style={{ width: `${p.suitability_score * 100}%` }}></div></div>
                  </div>
                  
                  <div className="ai-logic-panel">
                    <div className="alp-header" onClick={() => setShapOpen(!shapOpen)}>
                      <span className="alp-title">AI Rationale: Why this plan?</span>
                      <span className="alp-chev">{(p.suitability_score * 100).toFixed(0)}% MATCH</span>
                    </div>
                    <div className={`alp-content ${shapOpen || rank === 0 ? 'open' : ''}`}>
                      <p className="alp-narrative">"{p.explanation || "Matching your clinical profile to this policy vector yielded high similarity in Diabetes management and outpatient consults."}"</p>
                      <div className="alp-shap">
                        {activeResults?.shap_features?.length > 0 ? activeResults.shap_features.slice(0, 4).map((f: any) => (
                          <div className="alp-shap-row" key={f.feature}>
                            <span className="alp-sf">{f.feature}</span>
                            <div className="alp-sb"><div className={`alp-sf-fill ${f.shap_value > 0 ? 'pos' : 'neg'}`} style={{ width: `${Math.min(100, Math.abs(f.shap_value * 200))}%` }}></div></div>
                          </div>
                        )) : (
                          <div className="alp-no-data">Longitudinal data unavailable</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="plan-actions" style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                    <button className="btn btn-em btn-sm" onClick={() => navigate(`/plans/${p.plan_id}`)}>View Policy ↗</button>
                    <button className="btn btn-outline btn-sm">Save Plan</button>
                    <label style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text2)', cursor: 'pointer'}}>
                      <input 
                        type="checkbox" 
                        checked={selectedPlans.includes(allPlans.findIndex(x => x.name === p.name))} 
                        onChange={() => togglePlanSel(allPlans.findIndex(x => x.name === p.name))} 
                        style={{ accentColor: 'var(--em)', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      Add to Compare
                    </label>
                  </div>
                </motion.div>
              );
            }) : (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text2)' }}>
                 <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🕵️</div>
                 <h3>No plans found for this budget</h3>
                 <p>Try increasing your budget slider above to see more options.</p>
              </div>
            )}
          </motion.div>
        )}

        {tab === "compare" && (
          <div className="compare-grid">
            {selectedPlans.map((planIdx, i) => {
              const p = allPlans[planIdx];
              return (
                <div key={i} className={`compare-col ${i === 0 ? 'featured' : ''}`}>
                  <div className="compare-header">
                    <div style={{ fontSize: '.65rem', color: i === 0 ? 'var(--em)' : 'var(--text3)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
                      {i === 0 ? '⭐ BEST MATCH' : `RANK ${i + 1}`}
                    </div>
                    <div className="compare-plan-name">{p.name}</div>
                    <div className="compare-insurer">{p.ins}</div>
                    <div className="compare-price">₹{p.price.toLocaleString()}<span>/month</span></div>
                  </div>
                  <div className="compare-feature-row"><span className="cf-label">Sum Insured</span><span className="cf-val">{p.sumInsured}</span></div>
                  <div className="compare-feature-row"><span className="cf-label">Deductible</span><span className="cf-val">{p.deductible}</span></div>
                  <div className="compare-feature-row"><span className="cf-label">OPD Cover</span><span className={`cf-val ${p.opdCover.includes('✓') ? 'cf-yes' : 'cf-no'}`}>{p.opdCover}</span></div>
                  <div className="compare-feature-row"><span className="cf-label">Diabetes OPD</span><span className={`cf-val ${p.diabetesOpd.includes('✓') ? 'cf-yes' : 'cf-no'}`}>{p.diabetesOpd}</span></div>
                  <div className="compare-feature-row"><span className="cf-label">Preventive</span><span className={`cf-val ${p.preventive.includes('✓') ? 'cf-yes' : 'cf-no'}`}>{p.preventive}</span></div>
                  <div className="compare-feature-row"><span className="cf-label">Cashless Network</span><span className={`cf-val ${p.cashlessNetwork.includes('✓') ? 'cf-yes' : ''}`}>{p.cashlessNetwork}</span></div>
                  <div className="compare-feature-row"><span className="cf-label">Mental Health</span><span className={`cf-val ${p.mentalHealth.includes('✓') ? 'cf-yes' : 'cf-no'}`}>{p.mentalHealth}</span></div>
                  <div className="compare-feature-row"><span className="cf-label">Suitability</span><span className="cf-val" style={{ color: 'var(--em)' }}>{p.suitability}</span></div>
                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                     <button className="btn btn-outline btn-sm" onClick={() => navigate(`/plan/${p.id}`)}>View Details</button>
                  </div>
                </div>
              );
            })}
            {selectedPlans.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', gridColumn: '1 / -1', color: 'var(--text2)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⚖️</div>
                <h3>No plans selected to compare</h3>
                <p>Go to the Recommendations or Plan Explorer tab and select up to 3 plans.</p>
              </div>
            )}
          </div>
        )}

        {tab === "explorer" && (
          <div>
            <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input 
                className="explorer-search" 
                style={{ width: '100%', margin: 0, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                placeholder="🔍  Search plans by name or insurer…" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text3)', width: '60px' }}>Type</span>
                  <FilterPills 
                    options={["All", "Comprehensive", "Preventive", "Critical Illness", "Basic"]} 
                    current={filterType} 
                    onChange={setFilterType} 
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text3)', width: '60px' }}>Insurer</span>
                  <FilterPills 
                    options={["All", "Star Health", "HDFC ERGO", "Max Bupa", "ICICI Lombard", "Niva Bupa", "Go Digit"]} 
                    current={filterInsurer} 
                    onChange={setFilterInsurer} 
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text3)', width: '60px' }}>Budget</span>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input 
                      type="range" 
                      min="1000" 
                      max="10000" 
                      step="100" 
                      value={maxBudget} 
                      onChange={e => setMaxBudget(Number(e.target.value))}
                      style={{ flex: 1, accentColor: 'var(--em)' }}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--em)', minWidth: '60px' }}>₹{maxBudget.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {selectedPlans.length > 1 && (
              <div style={{ marginBottom: '16px' }}>
                <button className="btn btn-em btn-sm" onClick={() => setTab('compare')}>Compare selected ({selectedPlans.length})</button>
              </div>
            )}
            
            <div className="plan-grid">
              {filteredPlans.map((p) => {
                const i = allPlans.findIndex(x => x.id === p.id);
                return (
                  <div key={i} className={`plan-mini ${selectedPlans.includes(i) ? 'selected' : ''}`} onClick={() => togglePlanSel(i)}>
                    <div className="pmc-sel">{selectedPlans.includes(i) ? '✓' : ''}</div>
                    <p className="pmc-name">{p.name}</p>
                    <p className="pmc-ins">{p.ins}</p>
                    <p className="pmc-price">₹{p.price.toLocaleString()}<span>/mo</span></p>
                    <div className="pmc-tags">
                      {p.tags.map(t => <span key={t} className="pmc-tag">{t}</span>)}
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: '8px' }} onClick={(e) => { e.stopPropagation(); navigate(`/plan/${p.id}`); }}>View Policy ↗</button>
                  </div>
                )
              })}
            </div>
            
            {filteredPlans.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text2)' }}>
                <p>No plans match your current filters.</p>
                <button className="btn btn-outline btn-sm" style={{ marginTop: '12px' }} onClick={() => { setFilterType("All"); setFilterInsurer("All"); setFilterPrice("All"); setSearchQuery(""); }}>Reset Filters</button>
              </div>
            )}
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
              <div className="dc-value" style={{ color: 'var(--em)' }}>{modelResult?.plans_scored || 47}</div>
              <div className="dc-sub">5 recommended · {modelResult?.plans_scored ? modelResult.plans_scored - 5 : 42} filtered</div>
            </div>
            <div className="dash-card">
              <div className="dc-label">Actuarial Claim Prob.</div>
              <div className="dc-value" style={{ color: '#ff4d6d' }}>{(modelResult?.actuarial_claim_probs?.p_claim_12m * 100).toFixed(1) || "12.4"}%</div>
              <div className="dc-sub">12-month horizon (P50)</div>
            </div>
            <div className="dash-card wide">
              <div className="dc-label">Survival Analysis Trajectory</div>
              <div style={{ marginTop: '12px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text2)', marginBottom: '12px' }}>
                  Based on your longitudinal profile, the probability of a major health claim within 36 months is <strong style={{ color: 'white' }}>{((modelResult?.actuarial_claim_probs?.p_claim_36m || 0.284) * 100).toFixed(1)}%</strong>.
                </p>
                <div style={{ height: '40px', display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div key={i} style={{ flex: 1, background: `rgba(255, 77, 109, ${0.1 + (i/40) * 0.4})`, height: `${10 + Math.sin(i/5) * 5 + (i/2)}%`, borderRadius: '1px' }}></div>
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
                      try {
                        const { api } = await import("../../api/client");
                        await api.ai.deleteData();
                        alert("Data deleted successfully.");
                        navigate("/");
                      } catch (e) {
                        alert("Error deleting data.");
                      }
                    }
                  }}
                >
                  🗑️ Purge My Health Data
                </button>
              </div>
            </div>
            <div className="dash-card full">
              <div className="dc-label">Internal Trace Timeline</div>
              <div className="timeline-row"><div className="t-dot" style={{ background: 'var(--em)' }}></div><div className="t-text">Signed in · demo mode launched</div><div className="t-date">T-0ms</div></div>
              <div className="timeline-row"><div className="t-dot" style={{ background: 'var(--em)' }}></div><div className="t-text">Inference request dispatched to XGBoost-V2.4</div><div className="t-date">T-12ms</div></div>
              <div className="timeline-row"><div className="t-dot" style={{ background: 'var(--warn)' }}></div><div className="t-text">Vector constructed: 18 health features | 4 pref dimensions</div><div className="t-date">T-45ms</div></div>
              <div className="timeline-row"><div className="t-dot" style={{ background: 'var(--em)' }}></div><div className="t-text">SHAP explainability computed (KernelExplainer)</div><div className="t-date">T-280ms</div></div>
              <div className="timeline-row"><div className="t-dot" style={{ background: 'var(--em)' }}></div><div className="t-text">Response generated in {modelResult?.inferenceTime || "1.3"}s</div><div className="t-date">Now</div></div>
            </div>
          </div>
        )}

      </div>
    </motion.div>
  );
}
