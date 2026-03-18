"use client";

import React from "react";
import TrainerAvatarUploader from "./TrainerAvatarUploader";

export default function TrainerProfessionalStep({ form, setField }) {
  return (
    <div className="space-y-5 md:space-y-6">
      <TrainerAvatarUploader form={form} setField={setField} />
    </div>
  );
}