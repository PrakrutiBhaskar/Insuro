import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Processing } from "./components/Processing";

// Pages
import Login from "./pages/auth/login";
import SignUp from "./pages/auth/signup";
import Dashboard from "./pages/main/dashboard";
import Onboarding from "./pages/main/onboarding";
import Plans from "./pages/main/plans";
import PlanDetail from "./pages/main/plans/detail";
import Compare from "./pages/main/compare";
import AIAssistant from "./pages/main/ai-assistant";
import Profile from "./pages/main/profile";

const ErrorLayout = () => (
  <ErrorBoundary>
    <Layout />
  </ErrorBoundary>
);

export const router = createBrowserRouter([
  {
    path: "/",
    Component: ErrorLayout,
    children: [
      { index: true, Component: Login },
      { path: "login", Component: Login },
      { path: "signup", Component: SignUp },
      {
        Component: ProtectedRoute,
        children: [
          { path: "dashboard", Component: Dashboard },
          { path: "onboarding", Component: Onboarding },
          { path: "processing", Component: Processing },
          { path: "plans", Component: Plans },
          { path: "plans/:id", Component: PlanDetail },
          { path: "compare", Component: Compare },
          { path: "ai-assistant", Component: AIAssistant },
          { path: "profile", Component: Profile },
          
          // Compatibility Redirects
          { path: "intake", Component: Onboarding },
          { path: "reco", Component: Dashboard },
        ]
      }
    ]
  }
]);
