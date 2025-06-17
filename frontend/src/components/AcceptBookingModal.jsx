"use client";

import { useState } from "react";
import { supabase } from "../supabaseClient";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Loader2, CheckCircle } from "lucide-react";

export default function AcceptBookingModal({ booking, onClose }) {
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const confirm = async () => {
    try {
      setSaving(true); setError("");
      const { error } = await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", booking.id)
        .single();
      if (error) throw error;
      onClose();   // simply close – parent will refetch next mount
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Backdrop>
      <Card className="w-[90vw] max-w-sm">
        <CardContent className="p-6 space-y-5 text-center">
          <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
          <p className="text-lg font-semibold text-gray-900">
            Αποδοχή κράτησης;
          </p>
          <p className="text-sm text-gray-600">
            Θα επιβεβαιώσετε την κράτηση του&nbsp;
            <span className="font-medium">{booking.trainer?.full_name}</span>.
          </p>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={onClose}>Άκυρο</Button>
            <Button disabled={saving} onClick={confirm}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Επιβεβαίωση
            </Button>
          </div>
        </CardContent>
      </Card>
    </Backdrop>
  );
}

/* simple dimmed background */
function Backdrop({ children }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4">
      {children}
    </div>
  );
}
