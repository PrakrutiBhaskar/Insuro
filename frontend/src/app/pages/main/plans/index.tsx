import { useState } from "react";
import { useNavigate } from "react-router";
import { useAppStore } from "../../../../store";
import { motion, AnimatePresence } from "motion/react";
import { allPlans } from "../../../data/plans";
import { api } from "../../../../api/client";

export default function Plans() {
  const navigate = useNavigate();
  const store = useAppStore();
  const modelResult = store.modelResult;
  
  const [tab, setTab] = useState("recommendations");
  const [searchQuery, setSearchQuery] = useState("");
  const [simBudget, setSimBudget] = useState(modelResult?.user_input?.budget_range || 5000);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResults, setSimResults] = useState<any>(null);
  const [maxBudget, setMaxBudget] = useState(10000);

  const runSimulation = async () => {
    setIsSimulating(true);
    try {
      const payload = { 
        ...modelResult.user_input, 
        budget_range: simBudget 
      };
      const res = await api.ai.runInference(payload);
      setSimResults(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const activeResults = simResults || modelResult;
  const currentPlans = activeResults?.top_plans || [];

  const filteredPlans = allPlans.filter(p => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !p.ins.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (p.price > maxBudget) return false;
    return true;
  });

  return (
    <div className="reco-wrap">
      <div className="reco-tabs" style={{ marginBottom: '32px' }}>
        <button className={`rtab ${tab === 'recommendations' ? 'active' : ''}`} onClick={() => setTab('recommendations')}>🏆 Top Recommendations</button>
        <button className={`rtab ${tab === 'explorer' ? 'active' : ''}`} onClick={() => setTab('explorer')}>🔍 Plan Explorer</button>
      </div>

      {tab === "recommendations" && (
        <div className="plan-list">
          <div className="simulator-card" style={{ background: 'rgba(0, 229, 160, 0.05)', border: '1px solid var(--border3)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>Budget</span>
                <input 
                  type="range" min="1000" max="15000" step="500" 
                  value={simBudget} onChange={(e) => setSimBudget(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--em)' }}
                />
                <span style={{ fontSize: '0.9rem', color: 'var(--em)', fontWeight: 700 }}>₹{simBudget.toLocaleString()}</span>
              </div>
              <button className="btn btn-em btn-sm" onClick={runSimulation} disabled={isSimulating}>
                {isSimulating ? 'Simulating...' : 'Re-rank Plans'}
              </button>
            </div>
          </div>

          {currentPlans.map((p: any, rank: number) => (
            <div key={p.plan_id || rank} className={`plan-card rank-${rank + 1}`}>
              <div className="plan-top">
                <div className="plan-info">
                  <p className="plan-name">{p.name}</p>
                  <p className="plan-insurer">{p.insurer}</p>
                  <span className="cov-badge">{p.coverage_type}</span>
                </div>
                <div className="metric-val em">₹{(p.monthly_premium_inr || p.price).toLocaleString()}</div>
              </div>
              <div className="suit-bar-wrap">
                <div className="suit-bar-header"><span>Suitability Score</span><span>{(p.suitability_score * 100).toFixed(0)}%</span></div>
                <div className="suit-bar"><div className="suit-fill" style={{ width: `${p.suitability_score * 100}%` }}></div></div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/plans/${p.plan_id || '1'}`)}>View Details</button>
            </div>
          ))}
        </div>
      )}

      {tab === "explorer" && (
        <div>
          <input 
            className="explorer-search" 
            placeholder="🔍  Search plans…" 
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', marginBottom: '20px' }}
          />
          <div className="plan-grid">
            {filteredPlans.map((p, i) => (
              <div key={i} className="plan-mini" onClick={() => navigate(`/plans/${p.id}`)}>
                <p className="pmc-name">{p.name}</p>
                <p className="pmc-ins">{p.ins}</p>
                <p className="pmc-price">₹{p.price.toLocaleString()}<span>/mo</span></p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
