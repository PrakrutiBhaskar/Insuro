import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAppStore } from "../../store";
import { api } from "../../api/client";

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

  useEffect(() => {
    let isMounted = true;
    
    const runInferencePipeline = async () => {
      try {
        // Step 1: Validating JWT + fetching profile
        setStepStates(prev => { const n = [...prev]; n[0] = { status: 'run', text: 'Running…' }; return n; });
        await new Promise(r => setTimeout(r, 700));
        if (!isMounted) return;
        
        // Step 2: Constructing vector
        setStepStates(prev => { const n = [...prev]; n[0] = { status: 'done', text: 'Done' }; n[1] = { status: 'run', text: 'Running…' }; return n; });
        await new Promise(r => setTimeout(r, 700));
        if (!isMounted) return;
        
        // Step 3 & 4: Actual API Call for Inference (Mocking DB + Model)
        setStepStates(prev => { const n = [...prev]; n[1] = { status: 'done', text: 'Done' }; n[2] = { status: 'run', text: 'Running…' }; return n; });
        
        const result = await api.ai.runInference({
          profile: store.profile,
          vitals: store.vitals,
          history: store.history,
          prefs: store.prefs
        });
        
        if (!isMounted) return;
        setModelResult(result);
        
        setStepStates(prev => { const n = [...prev]; n[2] = { status: 'done', text: 'Done' }; n[3] = { status: 'run', text: 'Running…' }; return n; });
        await new Promise(r => setTimeout(r, 700));
        if (!isMounted) return;
        
        // Step 5: Formatting SHAP
        setStepStates(prev => { const n = [...prev]; n[3] = { status: 'done', text: 'Done' }; n[4] = { status: 'run', text: 'Running…' }; return n; });
        await new Promise(r => setTimeout(r, 600));
        if (!isMounted) return;
        
        setStepStates(prev => { const n = [...prev]; n[4] = { status: 'done', text: 'Done' }; return n; });
        setShowModelOut(true);
        
        setTimeout(() => {
          if (isMounted) navigate("/reco", { state: { modelResult: result } });
        }, 1800);
        
      } catch (e) {
        console.error(e);
      }
    };
    
    runInferencePipeline();

    return () => { isMounted = false; };
  }, [navigate, store]);

  return (
    <div className="screen active" id="screen-processing">
      <div className="processing-wrap">
        <div className="ai-orb">
          <div className="orb-ring"></div>
          <div className="orb-ring"></div>
          <div className="orb-ring"></div>
          <div className="orb-core">⚡</div>
        </div>
        <h2 className="proc-title">Running AI inference</h2>
        <p className="proc-sub">Your 18-feature health vector is being scored against our XGBoost model and 47 active plan coverage vectors.</p>
        
        <div className="proc-steps">
          <div className={`pstep ${stepStates[0].status === 'done' ? 'done' : stepStates[0].status === 'run' ? 'running' : ''}`}>
            <span className="ps-ico">🔐</span><span className="ps-txt">Validating JWT + fetching health profile</span>
            <span className={`ps-status ${stepStates[0].status}-s`}>{stepStates[0].text}</span>
          </div>
          <div className={`pstep ${stepStates[1].status === 'done' ? 'done' : stepStates[1].status === 'run' ? 'running' : ''}`}>
            <span className="ps-ico">🧮</span><span className="ps-txt">Constructing 18-feature input vector</span>
            <span className={`ps-status ${stepStates[1].status}-s`}>{stepStates[1].text}</span>
          </div>
          <div className={`pstep ${stepStates[2].status === 'done' ? 'done' : stepStates[2].status === 'run' ? 'running' : ''}`}>
            <span className="ps-ico">⚡</span><span className="ps-txt">XGBoost risk classification + SHAP values</span>
            <span className={`ps-status ${stepStates[2].status}-s`}>{stepStates[2].text}</span>
          </div>
          <div className={`pstep ${stepStates[3].status === 'done' ? 'done' : stepStates[3].status === 'run' ? 'running' : ''}`}>
            <span className="ps-ico">📐</span><span className="ps-txt">Cosine similarity suitability scoring (47 plans)</span>
            <span className={`ps-status ${stepStates[3].status}-s`}>{stepStates[3].text}</span>
          </div>
          <div className={`pstep ${stepStates[4].status === 'done' ? 'done' : stepStates[4].status === 'run' ? 'running' : ''}`}>
            <span className="ps-ico">📝</span><span className="ps-txt">Generating natural language SHAP explanations</span>
            <span className={`ps-status ${stepStates[4].status}-s`}>{stepStates[4].text}</span>
          </div>
        </div>

        <div className={`model-out ${showModelOut ? 'show' : ''}`}>
          <span className="mok">risk_label:</span> <span className="mov-mid">"{modelResult?.risk_label || "Medium-High"}"</span><br/>
          <span className="mok">risk_score:</span> <span className="mov-mid">{modelResult?.risk_score || 0.71}</span><br/>
          <span className="mok">top_shap_features:</span> [<br/>
          {modelResult?.top_shap_features?.slice(0, 3).map((f: any, idx: number) => (
            <span key={f.feature}>
              &nbsp;&nbsp;&#123;<span className="mok">feature</span>: <span style={{color: '#7CB8E0'}}>"{f.feature}"</span>, <span className="mok">shap_val</span>: <span className={f.shap_val > 0.2 ? "mov-high" : "mov-mid"}>{f.shap_val > 0 ? "+" : ""}{f.shap_val}</span>&#125;{idx < 2 ? "," : ""}<br/>
            </span>
          ))}
          ]<br/>
          <span className="mok">plans_scored:</span> <span className="mov-low">{modelResult?.plans_scored || 47}</span> &nbsp;|&nbsp; <span className="mok">top_5_returned:</span> <span className="mov-low">{modelResult?.top_5_returned ? "true" : "false"}</span>
        </div>
      </div>
    </div>
  );
}
