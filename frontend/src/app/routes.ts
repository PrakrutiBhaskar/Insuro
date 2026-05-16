import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Login } from "./components/Login";
import { Intake } from "./components/Intake";
import { Processing } from "./components/Processing";
import { Recommendations } from "./components/Recommendations";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Login },
      {
        Component: ProtectedRoute,
        children: [
          { path: "intake", Component: Intake },
          { path: "processing", Component: Processing },
          { path: "reco", Component: Recommendations },
        ]
      }
    ]
  }
]);
