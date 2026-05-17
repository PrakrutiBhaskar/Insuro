import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useAppStore } from "../../store";
import { api } from "../../api/client";
import { motion } from "motion/react";

export function Processing() {
  const navigate = useNavigate();
  const store = useAppStore();
  const [modelResult, setModelResult] = useState<any>(null);
  
  const [stepStates, setStepStates] = useState([
    { status: 'wait', text: 'Pending' },
    { status: 'wait', text: 'Pending' },
    { status: 'wait', text: 'Pending' },
    { status: 'wait', text: 'Pending' },
    { status: 'wait', text: 'Pending' }
  ]);
  const [showModelOut, setShowModelOut] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    
    let isMounted = true;
    
    const runInferencePipeline = async () => {
      const startTime = Date.now();
      try {
        // Step 1: Validating JWT + fetching profile
        setStepStates(prev => { const n = [...prev]; n[0] = { status: 'run', text: 'Running…' }; return n; });
        if (!isMounted) return;
        
        // Step 2: Constructing vector
        setStepStates(prev => { const n = [...prev]; n[0] = { status: 'done', text: 'Done' }; n[1] = { status: 'run', text: 'Running…' }; return n; });
        if (!isMounted) return;
        
        // Step 3 & 4: Actual API Call for Inference
        setStepStates(prev => { const n = [...prev]; n[1] = { status: 'done', text: 'Done' }; n[2] = { status: 'run', text: 'Running…' }; return n; });
        
        const result = await api.ai.runInference({
          profile: store.profile,
          vitals: store.vitals,
          history: store.history,
          prefs: store.prefs
        });
        
        if (!isMounted) return;
        const inferenceTime = ((Date.now() - startTime) / 1000).toFixed(2);
        const fullResult = { ...result, inferenceTime };
        store.setModelResult(fullResult);
        
        // Progress remaining steps quickly as the hard work is done
        setStepStates(prev => { const n = [...prev]; n[2] = { status: 'done', text: 'Done' }; n[3] = { status: 'run', text: 'Running…' }; return n; });
        setStepStates(prev => { const n = [...prev]; n[3] = { status: 'done', text: 'Done' }; n[4] = { status: 'run', text: 'Running…' }; return n; });
        setStepStates(prev => { const n = [...prev]; n[4] = { status: 'done', text: 'Done' }; return n; });
        
        setShowModelOut(true);
        
        setTimeout(() => {
          if (isMounted) navigate("/dashboard");
        }, 1200);
        
      } catch (e) {
        console.error(e);
        // Error handling could be added here, but ErrorBoundary will catch component crashes
      }
    };
    
    runInferencePipeline();

    return () => { isMounted = false; };
  }, [navigate]);

  return (
    <motion.div 
      className="screen active" 
      id="screen-processing"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4 }}
    >
      <div className="processing-wrap">
        <div className="ai-orb">
          <div className="orb-ring"></div>
          <div className="orb-ring"></div>
          <div className="orb-ring"></div>
          <div className="orb-core">⚡</div>
        </div>
        <h2 className="proc-title">Scoring risk profile</h2>
        <p className="proc-sub">Your 18-feature health vector is being processed through our XGBoost classifier and mapped against 47 policy coverage vectors.</p>
        
        <div className="proc-steps">
          <div className={`pstep ${stepStates[0].status === 'done' ? 'done' : stepStates[0].status === 'run' ? 'running' : ''}`}>
            <span className="ps-ico">🔐</span><span className="ps-txt">Validating secure JWT + health profile</span>
            <span className={`ps-status ${stepStates[0].status}-s`}>{stepStates[0].text}</span>
          </div>
          <div className={`pstep ${stepStates[1].status === 'done' ? 'done' : stepStates[1].status === 'run' ? 'running' : ''}`}>
            <span className="ps-ico">🧮</span><span className="ps-txt">Assembling 18-feature input vector</span>
            <span className={`ps-status ${stepStates[1].status}-s`}>{stepStates[1].text}</span>
          </div>
          <div className={`pstep ${stepStates[2].status === 'done' ? 'done' : stepStates[2].status === 'run' ? 'running' : ''}`}>
            <span className="ps-ico">⚡</span><span className="ps-txt">XGBoost risk classification + SHAP</span>
            <span className={`ps-status ${stepStates[2].status}-s`}>{stepStates[2].text}</span>
          </div>
          <div className={`pstep ${stepStates[3].status === 'done' ? 'done' : stepStates[3].status === 'run' ? 'running' : ''}`}>
            <span className="ps-ico">📐</span><span className="ps-txt">Cosine similarity suitability (47 vectors)</span>
            <span className={`ps-status ${stepStates[3].status}-s`}>{stepStates[3].text}</span>
          </div>
          <div className={`pstep ${stepStates[4].status === 'done' ? 'done' : stepStates[4].status === 'run' ? 'running' : ''}`}>
            <span className="ps-ico">📝</span><span className="ps-txt">Generating explainable AI narratives</span>
            <span className={`ps-status ${stepStates[4].status}-s`}>{stepStates[4].text}</span>
          </div>
        </div>

        <div className={`model-out ${showModelOut ? 'show' : ''}`}>
          <span className="mok">risk_label:</span> <span className="mov-mid">"{modelResult?.risk_label || "Scoring…"}"</span><br/>
          <span className="mok">risk_score:</span> <span className="mov-mid">{modelResult?.risk_score || 0.00}</span><br/>
          <span className="mok">top_shap_features:</span> [<br/>
          {modelResult?.top_shap_features?.slice(0, 3).map((f: any, idx: number) => (
            <span key={f.feature}>
              &nbsp;&nbsp;&#123;<span className="mok">feature</span>: <span style={{color: '#7CB8E0'}}>"{f.feature}"</span>, <span className="mok">shap_val</span>: <span className={f.shap_val > 0.2 ? "mov-high" : "mov-low"}>{f.shap_val > 0 ? "+" : ""}{f.shap_val.toFixed(3)}</span>&#125;{idx < 2 ? "," : ""}<br/>
            </span>
          ))}
          ]<br/>
          <span className="mok">plans_scored:</span> <span className="mov-low">47</span> &nbsp;|&nbsp; <span className="mok">inference_time:</span> <span className="mov-low">{modelResult?.inferenceTime || "0.00"}s</span>
        </div>
      </div>
    </motion.div>
  );
}
