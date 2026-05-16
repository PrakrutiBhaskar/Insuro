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
  
  login: (email: string, name: string) => void;
  logout: () => void;
  setProfile: (data: UserProfile) => void;
  setVitals: (data: ClinicalVitals) => void;
  setHistory: (data: HealthHistory) => void;
  setPrefs: (data: CoveragePrefs) => void;
  setIntakeStep: (step: number) => void;
  resetIntake: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      profile: null,
      vitals: null,
      history: null,
      prefs: null,
      intakeStep: 1,

      login: (email, name) => set({ isAuthenticated: true, user: { email, name } }),
      logout: () => set({ 
        isAuthenticated: false, 
        user: null, 
        profile: null, 
        vitals: null, 
        history: null, 
        prefs: null, 
        intakeStep: 1 
      }),
      setProfile: (data) => set({ profile: data }),
      setVitals: (data) => set({ vitals: data }),
      setHistory: (data) => set({ history: data }),
      setPrefs: (data) => set({ prefs: data }),
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
      name: 'insuready-storage',
    }
  )
);
