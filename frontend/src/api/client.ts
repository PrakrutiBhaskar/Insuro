import axios from 'axios';
import { useAppStore } from '../store';

// Base API instance
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add auth token if we implement actual JWT
apiClient.interceptors.request.use((config) => {
  // We can add token here once we implement real auth
  // const token = useAppStore.getState().token;
  // if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Mock functions for now since backend is Phase 2-3
export const api = {
  auth: {
    login: async (email: string, pass: string) => {
      // Mock network delay
      await new Promise(r => setTimeout(r, 600));
      return { token: 'mock-jwt', user: { email, name: email.split('@')[0] } };
    }
  },
  ai: {
    extractText: async (file: File) => {
      // Mock Bio_ClinicalBERT extraction
      await new Promise(r => setTimeout(r, 2000));
      return {
        indicators: [
          { key: 'HbA1c Level', value: '6.1 mmol/mol', conf: 0.98 },
          { key: 'Fasting Glucose', value: '108 mg/dL', conf: 0.96 },
          { key: 'Total Cholesterol', value: '210 mg/dL', conf: 0.88 },
          { key: 'Dx Mention', value: 'Dyslipidaemia', conf: 0.94 },
        ]
      };
    },
    runInference: async (healthData: any) => {
      // Mock XGBoost + pgvector plan matching
      await new Promise(r => setTimeout(r, 3000));
      return {
        risk_label: "Medium-High",
        risk_score: 0.71,
        top_shap_features: [
          { feature: "hba1c", shap_val: 0.42 },
          { feature: "diabetes_family_hx", shap_val: 0.28 },
          { feature: "cholesterol", shap_val: 0.15 },
          { feature: "bmi", shap_val: 0.09 },
          { feature: "smoking_status", shap_val: -0.09 },
          { feature: "age", shap_val: -0.06 }
        ],
        plans_scored: 47,
        top_5_returned: true
      };
    }
  }
};
