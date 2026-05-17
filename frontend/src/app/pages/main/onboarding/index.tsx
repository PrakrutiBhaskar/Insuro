import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAppStore } from "../../../../store";
import { api } from "../../../../api/client";
import { motion, AnimatePresence } from "motion/react";

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

export default function Onboarding() {
  const navigate = useNavigate();
  const store = useAppStore();
  const user = store.user;
  
  const [step, setStep] = useState(store.intakeStep || 1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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



  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    if (isUploading || extractComplete) return;
    setIsUploading(true);
    
    const phases = ['Uploading document…', 'Tokenising with Bio_ClinicalBERT…', 'Running NLP extraction…', 'Mapping UMLS entities…', '✓ Extraction complete'];
    setUploadPhase(phases[0]);
    
    let pct = 0;
    let phaseIdx = 0;
    const iv = setInterval(() => {
      pct += Math.random() * 8 + 3;
      if (pct > 95) pct = 95;
      setUploadProgress(pct);
      if (pct > 20 && phaseIdx < 1) { phaseIdx = 1; setUploadPhase(phases[1]); }
      if (pct > 45 && phaseIdx < 2) { phaseIdx = 2; setUploadPhase(phases[2]); }
      if (pct > 70 && phaseIdx < 3) { phaseIdx = 3; setUploadPhase(phases[3]); }
    }, 150);

    try {
      const result = await api.ai.extractText(file);
      clearInterval(iv);
      setUploadProgress(100);
      setUploadPhase(phases[4]);
      setIsUploading(false);
      setExtractComplete(true);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: '✓ Extraction complete — structured indicators mapped' }));
      
      const data = result.raw_data.extracted_fields;
      if (data) {
        if (data.hba1c) setValue("hba1c", data.hba1c);
        if (data.fasting_glucose) setValue("glucose", data.fasting_glucose);
        if (data.cholesterol) setValue("cholesterol", data.cholesterol);
        if (data.systolic_bp) setValue("systolicBp", data.systolic_bp);
        if (data.bmi) setValue("weight", Math.round(data.bmi * Math.pow(watchHeight / 100, 2))); // Basic reverse BMI calc
        
        if (data.conditions && Array.isArray(data.conditions)) {
          const newConditions = [...new Set([...watchConditions, ...data.conditions])];
          setValue("conditions", newConditions);
        }
      }
    } catch (e: any) {
      clearInterval(iv);
      setIsUploading(false);
      const msg = e.response?.data?.detail || 'Extraction failed';
      window.dispatchEvent(new CustomEvent('show-toast', { detail: msg }));
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

  const [isHindi, setIsHindi] = useState(false);


  const t = (en: string, hi: string) => isHindi ? hi : en;

  const vSteps = [
    { n: 1, lbl: t("Personal", "व्यक्तिगत"), desc: t("DEMOGRAPHICS", "जनसांख्यिकी") },
    { n: 2, lbl: t("Vitals", "वाइटल्स"), desc: t("CLINICAL MARKERS", "क्लीनिकल मार्कर") },
    { n: 3, lbl: t("History", "इतिहास"), desc: t("MEDICAL RECORD", "चिकित्सा रिकॉर्ड") },
    { n: 4, lbl: t("Documents", "दस्तावेज़"), desc: t("NLP EXTRACTION", "एनएलपी एक्सट्रैक्शन") },
    { n: 5, lbl: t("Preferences", "प्राथमिकताएं"), desc: t("COVERAGE GOALS", "कवरेज लक्ष्य") }
  ];


  return (
    <div className="screen active" id="screen-intake">
      <div className="intake-layout">
        <aside className="intake-sidebar">
          <div className="v-stepper">
            {vSteps.map((s) => (
              <div key={s.n} className={`v-step ${s.n < step ? 'done' : s.n === step ? 'active' : ''}`}>
                <div className={`v-sdot ${s.n < step ? 'done' : s.n === step ? 'active' : ''}`}>
                  {s.n < step ? '✓' : s.n}
                </div>
                <div className="v-stxt">
                  <span className="v-sdesc">{s.desc}</span>
                  <span className="v-slbl">{s.lbl}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div style={{ marginTop: 'auto', padding: '20px', background: 'var(--glass)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '8px' }}>Security & Compliance</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '.75rem', color: 'var(--text2)' }}>
              <span style={{ color: 'var(--em)' }}>🔒</span> 256-bit AES Encryption
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '.75rem', color: 'var(--text2)', marginTop: '4px' }}>
              <span style={{ color: 'var(--em)' }}>🛡️</span> IRDAI / HIPAA Compliant
            </div>
          </div>
        </aside>

        <main className="intake-main">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
            <div className="breadcrumb" style={{ margin: 0 }}>
              <span onClick={() => navigate("/")}>Home</span>
              <span className="sep">›</span>
              <span style={{ color: "var(--primary-bright)" }}>{t("Health Profile", "स्वास्थ्य प्रोफ़ाइल")}</span>
            </div>
            <button 
              onClick={() => setIsHindi(!isHindi)}
              style={{ padding: '6px 16px', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--glass)', color: 'white', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
            >
              {isHindi ? 'English' : 'हिंदी'}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="form-step active"
              >
                <p className="step-num">{t("Step 1 of 5", "चरण 1/5")}</p>
                <h2 className="step-title">{t("Personal Information", "व्यक्तिगत जानकारी")}</h2>
                <p className="step-desc">{t("Basic demographic details that inform your baseline risk profile and policy eligibility.", "बुनियादी जनसांख्यिकीय विवरण जो आपके आधारभूत जोखिम प्रोफ़ाइल और नीति पात्रता को सूचित करते हैं।")}</p>
                <div className="fgrid">
                  <div className="fdark">
                    <label className="fdark-label">{t("Full name", "पूरा नाम")}</label>
                    <input className="fdark-input" type="text" {...register("name")}/>
                    {errors.name && <span style={{color: 'var(--danger)', fontSize: '0.7rem'}}>{errors.name.message}</span>}
                  </div>
                  <div className="fdark">
                    <label className="fdark-label">{t("Date of birth", "जन्म तिथि")}</label>
                    <input className="fdark-input" type="date" {...register("dob")}/>
                    {errors.dob && <span style={{color: 'var(--danger)', fontSize: '0.7rem'}}>{errors.dob.message}</span>}
                  </div>
                  <div className="fdark">
                    <label className="fdark-label">{t("Gender", "लिंग")}</label>
                    <select className="fdark-input" {...register("gender")}>
                      <option>{t("Male", "पुरुष")}</option><option>{t("Female", "महिला")}</option><option>{t("Non-binary", "गैर-बाइनरी")}</option><option>{t("Prefer not to say", "बताने से बचें")}</option>
                    </select>
                  </div>
                  <div className="fdark">
                    <label className="fdark-label">{t("Annual income band", "वार्षिक आय वर्ग")}</label>
                    <select className="fdark-input" {...register("income")}>
                      <option>Below ₹5L</option><option>₹5L – ₹10L</option><option>₹10L – ₹20L</option><option>₹20L – ₹50L</option><option>Above ₹50L</option>
                    </select>
                  </div>
                  <div className="fdark">
                    <label className="fdark-label">{t("City", "शहर")}</label>
                    <input className="fdark-input" type="text" {...register("city")}/>
                    {errors.city && <span style={{color: 'var(--danger)', fontSize: '0.7rem'}}>{errors.city.message}</span>}
                  </div>
                  <div className="fdark">
                    <label className="fdark-label">{t("Occupation", "व्यवसाय")}</label>
                    <select className="fdark-input" {...register("occupation")}>
                      <option>{t("Employed — Office", "नौकरी — कार्यालय")}</option><option>{t("Employed — Tech", "नौकरी — टेक")}</option><option>{t("Self-employed", "स्वरोजगार")}</option><option>{t("Other", "अन्य")}</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="form-step active"
              >
                <p className="step-num">{t("Step 2 of 5", "चरण 2/5")}</p>
                <h2 className="step-title">{t("Clinical Vitals", "क्लीनिकल वाइटल्स")}</h2>
                <p className="step-desc">{t("These 9 numerical features feed directly into our XGBoost risk classifier as part of the 18-feature input vector.", "ये 9 संख्यात्मक विशेषताएं सीधे 18-विशेषताओं वाले इनपुट वेक्टर के हिस्से के रूप में हमारे XGBoost जोखिम क्लासिफायर में फीड होती हैं।")}</p>
                <div className="fgrid">
                  <div className="fdark"><label className="fdark-label">{t("Height (cm)", "लंबाई (सेमी)")}</label><input className="fdark-input" type="number" {...register("height")}/></div>
                  <div className="fdark"><label className="fdark-label">{t("Weight (kg)", "वजन (किलोग्राम)")}</label><input className="fdark-input" type="number" {...register("weight")}/></div>
                </div>
                <div className="fdark" style={{ marginTop: '4px' }}>
                  <label className="fdark-label">{t("BMI", "बीएमआई")} — <span style={{ color: "var(--em)", fontFamily: "var(--font-mono)" }}>{bmi}</span> <span style={{ color: "var(--text3)", fontSize: ".72rem" }}>{t("(auto-calculated)", "(स्वचालित गणना)")}</span></label>
                  <div className="risk-bar"><div className="risk-fill" style={{ width: `${Math.min(100, (Number(bmi)/40)*100)}%`, background: Number(bmi) > 30 ? 'var(--danger)' : Number(bmi) > 25 ? 'var(--warn)' : 'var(--em)' }}></div></div>
                </div>
                <div className="fgrid" style={{ marginTop: '20px' }}>
                  <div className="fdark">
                    <label className="fdark-label">HbA1c (mmol/mol)</label>
                    <div className="range-row">
                      <input type="range" className="range-track" min="4" max="12" step="0.1" {...register("hba1c")} />
                      <span className="range-val">{Number(watchHba1c).toFixed(1)}</span>
                    </div>
                    {Number(watchHba1c) >= 6.0 && Number(watchHba1c) <= 6.4 && <p style={{ fontSize: '.7rem', color: 'var(--warn)', marginTop: '5px' }}>⚠ {t("Pre-diabetic", "मधुमेह पूर्व")}</p>}
                  </div>
                  <div className="fdark">
                    <label className="fdark-label">{t("Fasting Glucose (mg/dL)", "फास्टिंग ग्लूकोज")}</label>
                    <div className="range-row">
                      <input type="range" className="range-track" min="70" max="200" step="1" {...register("glucose")} />
                      <span className="range-val">{watchGlucose}</span>
                    </div>
                  </div>
                  <div className="fdark">
                    <label className="fdark-label">{t("Total Cholesterol (mg/dL)", "कुल कोलेस्ट्रॉल")}</label>
                    <div className="range-row">
                      <input type="range" className="range-track" min="100" max="300" step="1" {...register("cholesterol")} />
                      <span className="range-val">{watchCholesterol}</span>
                    </div>
                  </div>
                  <div className="fdark">
                    <label className="fdark-label">{t("Blood Pressure (systolic)", "रक्तचाप (सिस्टोलिक)")}</label>
                    <div className="range-row">
                      <input type="range" className="range-track" min="90" max="180" step="1" {...register("systolicBp")} />
                      <span className="range-val">{watchBp}</span>
                    </div>
                  </div>
                  <div className="fdark">
                    <label className="fdark-label">{t("Resting Heart Rate (bpm)", "विश्राम हृदय गति")}</label>
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
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="form-step active"
              >
                <p className="step-num">{t("Step 3 of 5", "चरण 3/5")}</p>
                <h2 className="step-title">{t("Health History", "स्वास्थ्य इतिहास")}</h2>
                <p className="step-desc">{t("Condition flags are binary features in the model. Family history carries separate weight in the SHAP attribution layer.", "कंडीशन फ्लैग मॉडल में बाइनरी विशेषताएं हैं। पारिवारिक इतिहास SHAP एट्रिब्यूशन लेयर में अलग वजन रखता है।")}</p>
                <div className="fdark">
                  <label className="fdark-label">{t("Current conditions", "वर्तमान स्थितियां")}</label>
                  <div className="chip-group">
                    {['Pre-diabetes', 'Elevated Cholesterol', 'Hypertension', 'Asthma', 'Thyroid Disorder', 'Dyslipidaemia', 'None'].map(c => (
                      <button key={c} className={`chip ${watchConditions.includes(c) ? 'selected' : ''}`} onClick={() => toggleArrayItem("conditions", c)}>{c}</button>
                    ))}
                  </div>
                </div>
                <div className="fdark" style={{ marginTop: '20px' }}>
                  <label className="fdark-label">{t("Family history", "पारिवारिक इतिहास")}</label>
                  <div className="chip-group">
                    {['Diabetes', 'Heart Disease', 'Hypertension', 'Cancer', 'None'].map(c => (
                      <button key={c} className={`chip ${watchFamilyHx.includes(c) ? 'selected' : ''}`} onClick={() => toggleArrayItem("familyHx", c)}>{c}</button>
                    ))}
                  </div>
                </div>
                <div className="fdark" style={{ marginTop: '20px' }}>
                  <label className="fdark-label">{t("Smoking status", "धूम्रपान की स्थिति")}</label>
                  <div className="chip-group">
                    {['Never', 'Former', 'Current'].map(s => (
                      <button key={s} className={`chip ${watchSmoking === s ? 'selected' : ''}`} onClick={() => setValue("smoking", s)}>{s}</button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="form-step active"
              >
                <p className="step-num">{t("Step 4 of 5", "चरण 4/5")}</p>
                <h2 className="step-title">{t("Medical Documents", "चिकित्सा दस्तावेज़")}</h2>
                <p className="step-desc">{t("Upload a recent lab report, discharge summary, or prescription. Our Bio_ClinicalBERT NLP pipeline will extract structured health indicators automatically.", "हालिया लैब रिपोर्ट, डिस्चार्ज सारांश या नुस्खा अपलोड करें। हमारा Bio_ClinicalBERT NLP पाइपलाइन स्वचालित रूप से स्वास्थ्य संकेतकों को निकालेगा।")}</p>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                  accept=".pdf,.jpg,.jpeg,.png,.tiff,.bmp"
                />

                <div 
                  className={`upload-zone ${isUploading ? 'uploading' : ''}`} 
                  onClick={() => !isUploading && !extractComplete && fileInputRef.current?.click()}
                >
                  <div className="upload-icon">{extractComplete ? '✅' : isUploading ? '⏳' : '🧬'}</div>
                  <p className="upload-title">{extractComplete ? t('Lab report processed', 'लैब रिपोर्ट प्रोसेस हो गई') : isUploading ? t('Processing with Bio_ClinicalBERT…', 'Bio_ClinicalBERT के साथ प्रोसेस हो रहा है…') : t('Upload medical record', 'चिकित्सा रिकॉर्ड अपलोड करें')}</p>
                  <p className="upload-sub">PDF, JPG, PNG · Max 10MB — NLP extraction powered by Bio_ClinicalBERT</p>
                  
                  {(isUploading || extractComplete) && (
                    <div className="upload-progress" style={{ marginTop: '20px' }}>
                      <div style={{ fontSize: '.75rem', color: 'var(--primary-bright)', marginBottom: '8px' }}>{uploadPhase}</div>
                      <div className="pbar"><div className="pfill" style={{ width: `${uploadProgress}%` }}></div></div>
                    </div>
                  )}
                </div>
                
                <div className={`extract-result ${extractComplete ? 'show' : ''}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--em)', fontSize: '1rem' }}>✓</span>
                    <span style={{ fontSize: '.82rem', color: 'var(--em)', fontWeight: 600 }}>{t('Extraction complete — indicators found', 'एक्सट्रैक्शन पूर्ण — स्वास्थ्य संकेतक मिले')}</span>
                  </div>
                  <div className="ef-row">
                    <span className="ef-key">HbA1c</span>
                    <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span className="ef-val">{watchHba1c ? `${watchHba1c} %` : 'N/A'}</span>
                    </span>
                  </div>
                  <div className="ef-row">
                    <span className="ef-key">Fasting Glucose</span>
                    <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span className="ef-val">{watchGlucose ? `${watchGlucose} mg/dL` : 'N/A'}</span>
                    </span>
                  </div>
                  <div className="ef-row">
                    <span className="ef-key">Total Cholesterol</span>
                    <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span className="ef-val">{watchCholesterol ? `${watchCholesterol} mg/dL` : 'N/A'}</span>
                    </span>
                  </div>
                  <div className="ef-row">
                    <span className="ef-key">Conditions</span>
                    <span className="ef-val">{watchConditions.join(", ") || 'None'}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div 
                key="step5"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="form-step active"
              >
                <p className="step-num">{t("Step 5 of 5", "चरण 5/5")}</p>
                <h2 className="step-title">{t("Coverage Preferences", "कवरेज प्राथमिकताएं")}</h2>
                <p className="step-desc">{t("Your stated preferences combine with clinical signals to rank plans using cosine similarity against 47 coverage vectors.", "आपकी बताई गई प्राथमिकताएं क्लीनिकल संकेतों के साथ मिलकर 47 कवरेज वेक्टर के खिलाफ कोसाइन समानता का उपयोग करके योजनाओं को रैंक करती हैं।")}</p>
                <div className="fdark">
                  <label className="fdark-label">{t("Monthly premium budget", "मासिक प्रीमियम बजट")}</label>
                  <div className="range-row">
                    <input type="range" className="range-track" min="500" max="10000" step="100" {...register("budget")}/>
                    <span className="range-val">₹{Number(watchBudget).toLocaleString()}</span>
                  </div>
                </div>
                <div className="fdark" style={{ marginTop: '20px' }}>
                  <label className="fdark-label">{t("Preferred coverage type", "पसंदीदा कवरेज प्रकार")}</label>
                  <div className="chip-group">
                    {['Comprehensive', 'Critical Illness', 'Preventive', 'Top-up'].map(c => (
                      <button key={c} className={`chip ${watchCoverageType === c ? 'selected' : ''}`} onClick={() => setValue("coverageType", c)}>{c}</button>
                    ))}
                  </div>
                </div>
                <div className="fdark" style={{ marginTop: '20px' }}>
                  <label className="fdark-label">{t("Priority conditions to cover", "कवर करने के लिए प्राथमिकता स्थितियां")}</label>
                  <div className="chip-group">
                    {['Diabetes management', 'Endocrinology consults', 'Cardiac care', 'Preventive screening', 'Mental health'].map(p => (
                      <button key={p} className={`chip ${watchPriority.includes(p) ? 'selected' : ''}`} onClick={() => toggleArrayItem("priority", p)}>{p}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: '24px', padding: '16px', background: 'var(--em-dim)', border: '1px solid var(--em-dim)', borderRadius: '12px' }}>
                  <p style={{ fontSize: '.84rem', fontWeight: 600, color: 'var(--em)', marginBottom: '5px' }}>{t("✓ Profile complete — ready for AI inference", "✓ प्रोफ़ाइल पूर्ण — एआई अनुमान के लिए तैयार")}</p>
                  <p style={{ fontSize: '.76rem', color: 'var(--text2)', lineHeight: 1.65 }}>{t("18-feature vector constructed. XGBoost classifier + SHAP explainer will run on submission. Estimated inference time: 1–2 seconds.", "18-फीचर वेक्टर बनाया गया। सबमिशन पर XGBoost क्लासिफायर + SHAP एक्सप्लेनर चलेगा। अनुमानित अनुमान समय: 1-2 सेकंड।")}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="step-nav">
            <button className="btn btn-ghost" style={{ visibility: step > 1 ? 'visible' : 'hidden' }} onClick={() => { setStep(step - 1); store.setIntakeStep(step - 1); }}>{t("← Back", "← पीछे")}</button>
            <div className="autosave"><span className="save-dot"></span>{t("Auto-saved", "ऑटो-सेव्ड")}</div>
            <button className="btn btn-em" onClick={nextStep}>{step === 5 ? t('Submit & Analyse →', 'सबमिट और विश्लेषण →') : t('Continue →', 'जारी रखें →')}</button>
          </div>
        </main>
        
        {/* Full Screen Processing Overlay for PDF Upload */}
        <AnimatePresence>
          {isUploading && (
            <motion.div 
              className="screen active" 
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, background: 'rgba(10, 10, 12, 0.95)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="processing-wrap" style={{ maxWidth: '500px', width: '100%', padding: '40px' }}>
                <div className="ai-orb">
                  <div className="orb-ring"></div>
                  <div className="orb-ring"></div>
                  <div className="orb-ring"></div>
                  <div className="orb-core" style={{ fontSize: '2rem' }}>🧬</div>
                </div>
                <h2 className="proc-title" style={{ textAlign: 'center', marginTop: '40px' }}>Extracting Medical Data</h2>
                <p className="proc-sub" style={{ textAlign: 'center' }}>{uploadPhase}</p>
                
                <div className="upload-progress" style={{ marginTop: '40px' }}>
                  <div className="pbar" style={{ height: '6px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                    <div className="pfill" style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--em)', transition: 'width 0.2s ease-out' }}></div>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.85rem', color: 'var(--text2)', fontWeight: 600 }}>
                    {Math.round(uploadProgress)}% Complete
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
