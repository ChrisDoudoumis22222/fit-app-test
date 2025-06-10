// src/App.js
import { createBrowserRouter, RouterProvider } from "react-router-dom";

const router = createBrowserRouter(
  [
    { path: "/", element: <AuthPage /> },
    { path: "/user", element: <ProtectedRoute role="user"><UserDashboard/></ProtectedRoute> },
    { path: "/trainer", element: <ProtectedRoute role="trainer"><TrainerDashboard/></ProtectedRoute> },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }
  }
);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
