import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  name: string;
  dob: string;
  gender: string;
  income: string;
  city: string;
  occupation: string;
}

export interface ClinicalVitals {
  height: number;
  weight: number;
  hba1c: number;
  glucose: number;
  cholesterol: number;
  systolicBp: number;
  heartRate: number;
  spo2: number;
}

export interface HealthHistory {
  conditions: string[];
  familyHx: string[];
  smoking: string;
}

export interface CoveragePrefs {
  budget: number;
  coverageType: string;
  priority: string[];
}

interface AppState {
  isAuthenticated: boolean;
  user: { email: string; name: string } | null;
  profile: UserProfile | null;
  vitals: ClinicalVitals | null;
  history: HealthHistory | null;
  prefs: CoveragePrefs | null;
  intakeStep: number;
  modelResult: any | null;
  
  token: string | null;
  
  login: (email: string, name: string, token: string) => void;
  logout: () => void;
  setProfile: (data: UserProfile) => void;
  setVitals: (data: ClinicalVitals) => void;
  setHistory: (data: HealthHistory) => void;
  setPrefs: (data: CoveragePrefs) => void;
  setModelResult: (result: any) => void;
  setIntakeStep: (step: number) => void;
  resetIntake: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      profile: null,
      vitals: null,
      history: null,
      prefs: null,
      intakeStep: 1,
      modelResult: null,

      login: (email, name, token) => set({ isAuthenticated: true, user: { email, name }, token }),
      logout: () => set({ 
        isAuthenticated: false, 
        user: null, 
        token: null,
        profile: null, 
        vitals: null, 
        history: null, 
        prefs: null, 
        intakeStep: 1,
        modelResult: null
      }),
      setProfile: (data) => set({ profile: data }),
      setVitals: (data) => set({ vitals: data }),
      setHistory: (data) => set({ history: data }),
      setPrefs: (data) => set({ prefs: data }),
      setModelResult: (result) => set({ modelResult: result }),
      setIntakeStep: (step) => set({ intakeStep: step }),
      resetIntake: () => set({
        profile: null,
        vitals: null,
        history: null,
        prefs: null,
        intakeStep: 1
      }),
    }),
    {
      name: 'insuro-storage',
    }
  )
);
