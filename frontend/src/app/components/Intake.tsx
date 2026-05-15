import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAppStore } from "../../store";
import { api } from "../../api/client";

// Zod Schema
const intakeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.string(),
  income: z.string(),
  city: z.string().min(1, "City is required"),
  occupation: z.string(),
  
  height: z.coerce.number().min(50).max(300),
  weight: z.coerce.number().min(20).max(300),
  hba1c: z.coerce.number(),
  glucose: z.coerce.number(),
  cholesterol: z.coerce.number(),
  systolicBp: z.coerce.number(),
  heartRate: z.coerce.number(),
  spo2: z.coerce.number(),

  conditions: z.array(z.string()),
  familyHx: z.array(z.string()),
  smoking: z.string(),

  budget: z.coerce.number(),
  coverageType: z.string(),
  priority: z.array(z.string())
});

type IntakeForm = z.infer<typeof intakeSchema>;

export function Intake() {
  const navigate = useNavigate();
  const store = useAppStore();
  const user = store.user;
  
  const [step, setStep] = useState(store.intakeStep || 1);
  
  const { register, handleSubmit, control, watch, setValue, trigger, formState: { errors } } = useForm<IntakeForm>({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      name: store.profile?.name || user?.name || "Arjun Sharma",
      dob: store.profile?.dob || "1989-03-15",
      gender: store.profile?.gender || "Male",
      income: store.profile?.income || "₹10L – ₹20L",
      city: store.profile?.city || "Mumbai",
      occupation: store.profile?.occupation || "Employed — Tech",

      height: store.vitals?.height || 175,
      weight: store.vitals?.weight || 82,
      hba1c: store.vitals?.hba1c || 6.1,
      glucose: store.vitals?.glucose || 108,
      cholesterol: store.vitals?.cholesterol || 210,
      systolicBp: store.vitals?.systolicBp || 128,
      heartRate: store.vitals?.heartRate || 72,
      spo2: store.vitals?.spo2 || 97.0,

      conditions: store.history?.conditions || ["Elevated Cholesterol"],
      familyHx: store.history?.familyHx || ["Diabetes"],
      smoking: store.history?.smoking || "Never",

      budget: store.prefs?.budget || 3000,
      coverageType: store.prefs?.coverageType || "Comprehensive",
      priority: store.prefs?.priority || ["Diabetes management", "Endocrinology consults"]
    }
  });

  // Watch values for UI
  const watchHeight = watch("height");
  const watchWeight = watch("weight");
  const watchHba1c = watch("hba1c");
  const watchGlucose = watch("glucose");
  const watchCholesterol = watch("cholesterol");
  const watchBp = watch("systolicBp");
  const watchHr = watch("heartRate");
  const watchSpo2 = watch("spo2");
  const watchConditions = watch("conditions");
  const watchFamilyHx = watch("familyHx");
  const watchSmoking = watch("smoking");
  const watchBudget = watch("budget");
  const watchCoverageType = watch("coverageType");
  const watchPriority = watch("priority");

  const bmi = watchHeight && watchWeight ? (watchWeight / Math.pow(watchHeight / 100, 2)).toFixed(1) : "0";

  const [uploadPhase, setUploadPhase] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [extractComplete, setExtractComplete] = useState(false);

  const startUpload = async () => {
    if (isUploading || extractComplete) return;
    setIsUploading(true);
    
    const phases = ['Uploading document…', 'Tokenising with Bio_ClinicalBERT…', 'Running NLP extraction…', 'Mapping UMLS entities…', '✓ Extraction complete'];
    setUploadPhase(phases[0]);
    
    // Simulate upload and NLP extraction calling our API client mock
    let pct = 0;
    let phaseIdx = 0;
    const iv = setInterval(() => {
      pct += Math.random() * 8 + 3;
      if (pct > 100) pct = 100;
      setUploadProgress(pct);
      if (pct > 20 && phaseIdx < 1) { phaseIdx = 1; setUploadPhase(phases[1]); }
      if (pct > 45 && phaseIdx < 2) { phaseIdx = 2; setUploadPhase(phases[2]); }
      if (pct > 70 && phaseIdx < 3) { phaseIdx = 3; setUploadPhase(phases[3]); }
    }, 120);

    try {
      const result = await api.ai.extractText(new File([], "report.pdf"));
      clearInterval(iv);
      setUploadProgress(100);
      setUploadPhase(phases[4]);
      setIsUploading(false);
      setExtractComplete(true);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: '✓ Bio_ClinicalBERT extraction complete — 4 indicators found' }));
      
      // Update form values based on mock extraction
      setValue("hba1c", 6.1);
      setValue("glucose", 108);
      setValue("cholesterol", 210);
      // Ensure condition includes Dyslipidaemia
      if (!watchConditions.includes("Dyslipidaemia")) {
        setValue("conditions", [...watchConditions, "Dyslipidaemia"]);
      }
    } catch (e) {
      clearInterval(iv);
      setIsUploading(false);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Extraction failed' }));
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) fieldsToValidate = ["name", "dob", "gender", "income", "city", "occupation"];
    else if (step === 2) fieldsToValidate = ["height", "weight", "hba1c", "glucose", "cholesterol", "systolicBp", "heartRate", "spo2"];
    
    if (fieldsToValidate.length > 0) {
      const isValid = await trigger(fieldsToValidate);
      if (!isValid) return;
    }

    if (step < 5) {
      setStep(step + 1);
      store.setIntakeStep(step + 1);
    } else {
      handleSubmit(onSubmit)();
    }
  };

  const onSubmit = (data: IntakeForm) => {
    store.setProfile({
      name: data.name, dob: data.dob, gender: data.gender,
      income: data.income, city: data.city, occupation: data.occupation
    });
    store.setVitals({
      height: data.height, weight: data.weight, hba1c: data.hba1c,
      glucose: data.glucose, cholesterol: data.cholesterol,
      systolicBp: data.systolicBp, heartRate: data.heartRate, spo2: data.spo2
    });
    store.setHistory({
      conditions: data.conditions, familyHx: data.familyHx, smoking: data.smoking
    });
    store.setPrefs({
      budget: data.budget, coverageType: data.coverageType, priority: data.priority
    });
    navigate("/processing");
  };

  const toggleArrayItem = (field: "conditions" | "familyHx" | "priority", item: string) => {
    const current = watch(field);
    if (current.includes(item)) {
      setValue(field, current.filter(x => x !== item));
    } else {
      setValue(field, [...current, item]);
    }
  };

  return (
    <div className="screen active" id="screen-intake">
      <div className="intake-wrap">
        <div className="breadcrumb">
          <span onClick={() => navigate("/")}>Home</span>
          <span className="sep">›</span>
          <span style={{ color: "var(--em)" }}>Health Profile</span>
        </div>

        <div className="stepper">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: 'contents' }}>
              <div className={`sdot ${i < step ? 'done' : i === step ? 'active' : ''}`}>{i < step ? '✓' : i}</div>
              {i < 5 && <div className={`sline ${i < step ? 'done' : ''}`}></div>}
            </div>
          ))}
        </div>
        <div className="step-labels">
          <span>Personal</span>
          <span>Vitals</span>
          <span>History</span>
          <span>Docs</span>
          <span>Prefs</span>
        </div>

        {step === 1 && (
          <div className="form-step active">
            <p className="step-num">Step 1 of 5</p>
            <h2 className="step-title">Personal Information</h2>
            <p className="step-desc">Basic demographic details that inform your baseline risk profile and policy eligibility.</p>
            <div className="fgrid">
              <div className="fdark">
                <label className="fdark-label">Full name</label>
                <input className="fdark-input" type="text" {...register("name")}/>
                {errors.name && <span style={{color: 'var(--danger)', fontSize: '0.7rem'}}>{errors.name.message}</span>}
              </div>
              <div className="fdark">
                <label className="fdark-label">Date of birth</label>
                <input className="fdark-input" type="date" {...register("dob")}/>
                {errors.dob && <span style={{color: 'var(--danger)', fontSize: '0.7rem'}}>{errors.dob.message}</span>}
              </div>
              <div className="fdark">
                <label className="fdark-label">Gender</label>
                <select className="fdark-input" {...register("gender")}>
                  <option>Male</option><option>Female</option><option>Non-binary</option><option>Prefer not to say</option>
                </select>
              </div>
              <div className="fdark">
                <label className="fdark-label">Annual income band</label>
                <select className="fdark-input" {...register("income")}>
                  <option>Below ₹5L</option><option>₹5L – ₹10L</option><option>₹10L – ₹20L</option><option>₹20L – ₹50L</option><option>Above ₹50L</option>
                </select>
              </div>
              <div className="fdark">
                <label className="fdark-label">City</label>
                <input className="fdark-input" type="text" {...register("city")}/>
                {errors.city && <span style={{color: 'var(--danger)', fontSize: '0.7rem'}}>{errors.city.message}</span>}
              </div>
              <div className="fdark">
                <label className="fdark-label">Occupation</label>
                <select className="fdark-input" {...register("occupation")}>
                  <option>Employed — Office</option><option>Employed — Tech</option><option>Self-employed</option><option>Other</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="form-step active">
            <p className="step-num">Step 2 of 5</p>
            <h2 className="step-title">Clinical Vitals</h2>
            <p className="step-desc">These 9 numerical features feed directly into our XGBoost risk classifier as part of the 18-feature input vector.</p>
            <div className="fgrid">
              <div className="fdark"><label className="fdark-label">Height (cm)</label><input className="fdark-input" type="number" {...register("height")}/></div>
              <div className="fdark"><label className="fdark-label">Weight (kg)</label><input className="fdark-input" type="number" {...register("weight")}/></div>
            </div>
            <div className="fdark" style={{ marginTop: '4px' }}>
              <label className="fdark-label">BMI — <span style={{ color: "var(--em)", fontFamily: "var(--font-mono)" }}>{bmi}</span> <span style={{ color: "var(--text3)", fontSize: ".72rem" }}>(auto-calculated)</span></label>
              <div className="risk-bar"><div className="risk-fill" style={{ width: '55%', background: 'linear-gradient(90deg,var(--em3),var(--em))' }}></div></div>
            </div>
            <div className="fgrid" style={{ marginTop: '20px' }}>
              <div className="fdark">
                <label className="fdark-label">HbA1c (mmol/mol)</label>
                <div className="range-row">
                  <input type="range" className="range-track" min="4" max="12" step="0.1" {...register("hba1c")} />
                  <span className="range-val">{Number(watchHba1c).toFixed(1)}</span>
                </div>
                {Number(watchHba1c) >= 6.0 && Number(watchHba1c) <= 6.4 && <p style={{ fontSize: '.7rem', color: 'var(--warn)', marginTop: '5px' }}>⚠ Pre-diabetic</p>}
              </div>
              <div className="fdark">
                <label className="fdark-label">Fasting Glucose (mg/dL)</label>
                <div className="range-row">
                  <input type="range" className="range-track" min="70" max="200" step="1" {...register("glucose")} />
                  <span className="range-val">{watchGlucose}</span>
                </div>
              </div>
              <div className="fdark">
                <label className="fdark-label">Total Cholesterol (mg/dL)</label>
                <div className="range-row">
                  <input type="range" className="range-track" min="100" max="300" step="1" {...register("cholesterol")} />
                  <span className="range-val">{watchCholesterol}</span>
                </div>
              </div>
              <div className="fdark">
                <label className="fdark-label">Blood Pressure (systolic)</label>
                <div className="range-row">
                  <input type="range" className="range-track" min="90" max="180" step="1" {...register("systolicBp")} />
                  <span className="range-val">{watchBp}</span>
                </div>
              </div>
              <div className="fdark">
                <label className="fdark-label">Resting Heart Rate (bpm)</label>
                <div className="range-row">
                  <input type="range" className="range-track" min="50" max="110" step="1" {...register("heartRate")} />
                  <span className="range-val">{watchHr}</span>
                </div>
              </div>
              <div className="fdark">
                <label className="fdark-label">SpO₂ (%)</label>
                <div className="range-row">
                  <input type="range" className="range-track" min="90" max="100" step="0.5" {...register("spo2")} />
                  <span className="range-val">{Number(watchSpo2).toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="form-step active">
            <p className="step-num">Step 3 of 5</p>
            <h2 className="step-title">Health History</h2>
            <p className="step-desc">Condition flags are binary features in the model. Family history carries separate weight in the SHAP attribution layer.</p>
            <div className="fdark">
              <label className="fdark-label">Current conditions</label>
              <div className="chip-group">
                {['Pre-diabetes', 'Elevated Cholesterol', 'Hypertension', 'Asthma', 'Thyroid Disorder', 'Dyslipidaemia', 'None'].map(c => (
                  <button key={c} className={`chip ${watchConditions.includes(c) ? 'selected' : ''}`} onClick={() => toggleArrayItem("conditions", c)}>{c}</button>
                ))}
              </div>
            </div>
            <div className="fdark" style={{ marginTop: '20px' }}>
              <label className="fdark-label">Family history</label>
              <div className="chip-group">
                {['Diabetes', 'Heart Disease', 'Hypertension', 'Cancer', 'None'].map(c => (
                  <button key={c} className={`chip ${watchFamilyHx.includes(c) ? 'selected' : ''}`} onClick={() => toggleArrayItem("familyHx", c)}>{c}</button>
                ))}
              </div>
            </div>
            <div className="fdark" style={{ marginTop: '20px' }}>
              <label className="fdark-label">Smoking status</label>
              <div className="chip-group">
                {['Never', 'Former', 'Current'].map(s => (
                  <button key={s} className={`chip ${watchSmoking === s ? 'selected' : ''}`} onClick={() => setValue("smoking", s)}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="form-step active">
            <p className="step-num">Step 4 of 5</p>
            <h2 className="step-title">Medical Documents</h2>
            <p className="step-desc">Upload a recent lab report, discharge summary, or prescription. Our Bio_ClinicalBERT NLP pipeline will extract structured health indicators automatically.</p>
            <div className={`upload-zone ${isUploading ? 'uploading' : ''}`} onClick={startUpload}>
              <div className="upload-icon">{extractComplete ? '✅' : isUploading ? '⏳' : '🧬'}</div>
              <p className="upload-title">{extractComplete ? 'Lab report processed' : isUploading ? 'Processing with Bio_ClinicalBERT…' : 'Upload medical record'}</p>
              <p className="upload-sub">PDF, JPG, PNG · Max 10MB — NLP extraction powered by Bio_ClinicalBERT</p>
              
              {(isUploading || extractComplete) && (
                <div className="upload-progress" style={{ marginTop: '20px' }}>
                  <div style={{ fontSize: '.75rem', color: 'var(--em)', marginBottom: '8px' }}>{uploadPhase}</div>
                  <div className="pbar"><div className="pfill" style={{ width: `${uploadProgress}%` }}></div></div>
                </div>
              )}
            </div>
            
            <div className={`extract-result ${extractComplete ? 'show' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ color: 'var(--em)', fontSize: '1rem' }}>✓</span>
                <span style={{ fontSize: '.82rem', color: 'var(--em)', fontWeight: 600 }}>Bio_ClinicalBERT extraction complete — 4 indicators found</span>
              </div>
              <div className="ef-row"><span className="ef-key">HbA1c Level</span><span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><span className="ef-val">6.1 mmol/mol</span><span className="conf-badge conf-hi">98.4% conf</span></span></div>
              <div className="ef-row"><span className="ef-key">Fasting Glucose</span><span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><span className="ef-val">108 mg/dL</span><span className="conf-badge conf-hi">96.2% conf</span></span></div>
              <div className="ef-row"><span className="ef-key">Total Cholesterol</span><span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><span className="ef-val">210 mg/dL</span><span className="conf-badge conf-mid">88.7% conf</span></span></div>
              <div className="ef-row"><span className="ef-key">Dx Mention</span><span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><span className="ef-val">Dyslipidaemia</span><span className="conf-badge conf-hi">94.1% conf</span></span></div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="form-step active">
            <p className="step-num">Step 5 of 5</p>
            <h2 className="step-title">Coverage Preferences</h2>
            <p className="step-desc">Your stated preferences combine with clinical signals to rank plans using cosine similarity against 47 coverage vectors.</p>
            <div className="fdark">
              <label className="fdark-label">Monthly premium budget</label>
              <div className="range-row">
                <input type="range" className="range-track" min="500" max="10000" step="100" {...register("budget")}/>
                <span className="range-val">₹{Number(watchBudget).toLocaleString()}</span>
              </div>
            </div>
            <div className="fdark" style={{ marginTop: '20px' }}>
              <label className="fdark-label">Preferred coverage type</label>
              <div className="chip-group">
                {['Comprehensive', 'Critical Illness', 'Preventive', 'Top-up'].map(c => (
                  <button key={c} className={`chip ${watchCoverageType === c ? 'selected' : ''}`} onClick={() => setValue("coverageType", c)}>{c}</button>
                ))}
              </div>
            </div>
            <div className="fdark" style={{ marginTop: '20px' }}>
              <label className="fdark-label">Priority conditions to cover</label>
              <div className="chip-group">
                {['Diabetes management', 'Endocrinology consults', 'Cardiac care', 'Preventive screening', 'Mental health'].map(p => (
                  <button key={p} className={`chip ${watchPriority.includes(p) ? 'selected' : ''}`} onClick={() => toggleArrayItem("priority", p)}>{p}</button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(0,229,160,0.05)', border: '1px solid rgba(0,229,160,0.18)', borderRadius: '12px' }}>
              <p style={{ fontSize: '.84rem', fontWeight: 600, color: 'var(--em)', marginBottom: '5px' }}>✓ Profile complete — ready for AI inference</p>
              <p style={{ fontSize: '.76rem', color: 'var(--text2)', lineHeight: 1.65 }}>18-feature vector constructed. XGBoost classifier + SHAP explainer will run on submission. Estimated inference time: 1–2 seconds.</p>
            </div>
          </div>
        )}

        <div className="step-nav">
          <button className="btn btn-ghost" style={{ visibility: step > 1 ? 'visible' : 'hidden' }} onClick={() => { setStep(step - 1); store.setIntakeStep(step - 1); }}>← Back</button>
          <div className="autosave"><span className="save-dot"></span>Auto-saved</div>
          <button className="btn btn-em" onClick={nextStep}>{step === 5 ? 'Submit & Analyse →' : 'Continue →'}</button>
        </div>
      </div>
    </div>
  );
}
