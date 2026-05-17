import { useParams, useNavigate } from "react-router";
import { motion } from "motion/react";
import { allPlans } from "../data/plans";

export function PlanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const plan = allPlans.find(p => p.id === id);

  if (!plan) {
    return (
      <div className="screen active" style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Plan not found</h2>
        <button className="btn btn-em" onClick={() => navigate('/reco')}>Back to Recommendations</button>
      </div>
    );
  }

  return (
    <motion.div 
      className="screen active" 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      style={{ padding: '32px', maxWidth: '800px', margin: '0 auto', overflowY: 'auto' }}
    >
      <button 
        style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }} 
        onClick={() => navigate('/reco')}
      >
        ← Back to Plans
      </button>

      <div style={{ background: 'var(--bg2)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <h1 style={{ color: 'white', marginBottom: '8px', fontSize: '2rem' }}>{plan.name}</h1>
        <p style={{ color: 'var(--text2)', marginBottom: '24px', fontSize: '1.1rem' }}>{plan.ins} <span style={{ margin: '0 8px' }}>•</span> <span style={{ color: 'var(--em)' }}>{plan.suitability} Suitability</span></p>

        <div style={{ display: 'flex', gap: '32px', marginBottom: '32px', borderBottom: '1px solid var(--border)', paddingBottom: '24px', flexWrap: 'wrap' }}>
           <div>
             <div style={{ fontSize: '0.85rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly Premium</div>
             <div style={{ fontSize: '1.5rem', color: 'var(--em)', fontWeight: 'bold' }}>₹{plan.price.toLocaleString()}<span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'var(--text2)' }}>/mo</span></div>
           </div>
           <div>
             <div style={{ fontSize: '0.85rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sum Insured</div>
             <div style={{ fontSize: '1.5rem', color: 'white', fontWeight: 'bold' }}>{plan.sumInsured}</div>
           </div>
           <div>
             <div style={{ fontSize: '0.85rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deductible</div>
             <div style={{ fontSize: '1.5rem', color: 'white', fontWeight: 'bold' }}>{plan.deductible}</div>
           </div>
           <div>
             <div style={{ fontSize: '0.85rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Network</div>
             <div style={{ fontSize: '1.5rem', color: 'white', fontWeight: 'bold' }}>{plan.cashlessNetwork}</div>
           </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ color: 'white', marginBottom: '16px', fontWeight: 600 }}>Coverage Highlights</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
             <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px' }}><strong style={{ color: 'var(--text3)', display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>OPD Cover</strong><span style={{ color: 'white' }}>{plan.opdCover}</span></div>
             <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px' }}><strong style={{ color: 'var(--text3)', display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Diabetes Specific</strong><span style={{ color: 'white' }}>{plan.diabetesOpd}</span></div>
             <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px' }}><strong style={{ color: 'var(--text3)', display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Preventive Care</strong><span style={{ color: 'white' }}>{plan.preventive}</span></div>
             <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px' }}><strong style={{ color: 'var(--text3)', display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Mental Health</strong><span style={{ color: 'white' }}>{plan.mentalHealth}</span></div>
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ color: 'white', marginBottom: '16px', fontWeight: 600 }}>Key Benefits</h3>
          <ul style={{ color: 'var(--text2)', paddingLeft: '20px', lineHeight: '1.8' }}>
            {plan.benefits?.map((benefit, i) => <li key={i}>{benefit}</li>)}
          </ul>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ color: 'white', marginBottom: '16px', fontWeight: 600 }}>Notable Exclusions</h3>
          <ul style={{ color: 'var(--text2)', paddingLeft: '20px', lineHeight: '1.8' }}>
            {plan.exclusions?.map((exc, i) => <li key={i}>{exc}</li>)}
          </ul>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ color: 'white', marginBottom: '16px', fontWeight: 600 }}>Pros & Cons</h3>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px', background: 'rgba(0, 229, 160, 0.05)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(0, 229, 160, 0.1)' }}>
              <div style={{ color: 'var(--em)', fontWeight: 'bold', marginBottom: '8px', fontSize: '1.1rem' }}>⊕ Pros</div>
              <div style={{ color: 'var(--text2)', lineHeight: '1.6' }}>{plan.pros}</div>
            </div>
            <div style={{ flex: '1 1 300px', background: 'rgba(255, 77, 109, 0.05)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255, 77, 109, 0.1)' }}>
              <div style={{ color: '#ff4d6d', fontWeight: 'bold', marginBottom: '8px', fontSize: '1.1rem' }}>⊖ Cons</div>
              <div style={{ color: 'var(--text2)', lineHeight: '1.6' }}>{plan.cons}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginTop: '40px' }}>
           <button className="btn btn-em" style={{ flex: 2, padding: '16px', fontSize: '1.1rem' }}>Start Application</button>
           <button className="btn btn-outline" style={{ flex: 1 }}>Save for Later</button>
        </div>
      </div>
    </motion.div>
  );
}
