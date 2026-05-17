import { useAppStore } from "../../../../store";
import { allPlans } from "../../../data/plans";
import { useNavigate } from "react-router";

export default function Compare() {
  const navigate = useNavigate();
  // In a real app, we'd store selected plans in the store or URL
  // For now, I'll just show the Comparison UI from Recommendations
  
  return (
    <div className="reco-wrap">
      <h2 style={{ marginBottom: '32px' }}>Plan Comparison</h2>
      <div className="compare-grid">
        {/* Placeholder for selected plans comparison */}
        <div style={{ padding: '60px', textAlign: 'center', gridColumn: '1 / -1', color: 'var(--text2)', background: 'var(--glass)', borderRadius: '16px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⚖️</div>
          <h3>Select plans to compare</h3>
          <p>Go to the <button className="btn-link" onClick={() => navigate("/plans")}>Plan Explorer</button> to add plans to comparison.</p>
        </div>
      </div>
    </div>
  );
}
