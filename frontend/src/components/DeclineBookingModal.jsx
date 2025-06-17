"use client";

import { useState } from "react";
import { supabase } from "../supabaseClient";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Loader2, XCircle } from "lucide-react";

export default function DeclineBookingModal({ booking, onClose }) {
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const cancel = async () => {
    try {
      setSaving(true); setError("");
      /* 1. mark booking cancelled */
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", booking.id)
        .single();
      if (error) throw error;

      /* 2. free the slot (optional) */
      if (booking.slot?.id) {
        await supabase
          .from("service_slots")
          .update({ booked: false })
          .eq("id", booking.slot.id);
      }
      onClose();
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
          <XCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <p className="text-lg font-semibold text-gray-900">
            Ακύρωση κράτησης;
          </p>
          <p className="text-sm text-gray-600">
            Η κράτηση θα σημειωθεί ως “cancelled”.
          </p>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={onClose}>Πίσω</Button>
            <Button variant="destructive" disabled={saving} onClick={cancel}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ακύρωση
            </Button>
          </div>
        </CardContent>
      </Card>
    </Backdrop>
  );
}

function Backdrop({ children }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4">
      {children}
    </div>
  );
}
