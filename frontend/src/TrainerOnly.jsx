import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "./supabaseClient";
import { Navigate } from "react-router-dom";

export default function TrainerOnly({ children }) {
  const { user } = useAuth();
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (user?.id) {
      supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.role) setRole(data.role);
        });
    }
  }, [user]);

  if (!user) return null;
  if (role === null) return <p className="p-6">Έλεγχος ρόλου...</p>;
  if (role !== "trainer") return <Navigate to="/user" replace />;

  return children;
}
