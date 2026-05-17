import axios from 'axios';
import { useAppStore } from '../store';

// Base API instance
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = useAppStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  auth: {
    login: async (email: string, pass: string) => {
      const res = await apiClient.post('/auth/login', { email, password: pass });
      return { token: res.data.access_token, user: { email, name: email.split('@')[0] } };
    },
    register: async (name: string, email: string, pass: string) => {
      const res = await apiClient.post('/auth/register', { full_name: name, email, password: pass });
      return { user: { email: res.data.email, name: res.data.full_name } };
    }
  },
  ai: {
    extractText: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const data = response.data;
      // Map extracted fields to the indicators format the frontend expects
      const indicators = [];
      if (data.extracted_fields) {
        for (const [key, value] of Object.entries(data.extracted_fields)) {
          if (value !== null && value !== undefined && value !== '') {
            indicators.push({
              key: key,
              value: String(value),
              conf: data.confidence_scores?.[key] || 0.9
            });
          }
        }
      }
      return { indicators, raw_data: data };
    },
    runInference: async (healthData: any) => {
      const response = await apiClient.post('/inference', healthData);
      const data = response.data;
      
      // Handle both nested structure from ML service and flat fallback structure from Gateway
      const pred = data.prediction || data;
      const reco = data.recommendations || data;

      return {
        risk_label: pred.risk_label || "Unknown",
        risk_score: pred.risk_score ?? 0.0,
        model_confidence: pred.model_confidence || 85.0,
        actuarial_claim_probs: pred.actuarial_claim_probs || {},
        top_shap_features: (pred.top_shap_features || pred.shap_features || []).map((f: any) => ({
          feature: f.feature.replace('num__', '').replace('cat__', ''),
          shap_val: f.shap_value || f.shap_val,
          direction: f.direction
        })),
        counterfactuals: pred.counterfactuals || [],
        plans_scored: reco.plans_scored || reco.eligible_count || 0,
        top_plans: reco.top_plans || []
      };
    },
    deleteData: async () => {
      const response = await apiClient.delete('/user/data');
      return response.data;
    },
    chat: async (query: string) => {
      const res = await apiClient.post('/chat', { query });
      return res.data;
    }
  }
};
