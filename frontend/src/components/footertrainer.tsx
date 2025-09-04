// components/Footer.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { FileText, Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-black text-white py-6">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 px-4">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="https://peakvelocity.gr/wp-content/uploads/2024/03/logo-chris-3-1.png"
            alt="Peak Velocity"
            width={140}
            height={40}
            priority
          />
        </Link>

        {/* Links */}
        <div className="flex items-center gap-6 text-sm">
          <Link
            href="/terms"
            className="flex items-center gap-1 text-gray-300 hover:text-white transition"
          >
            <FileText className="h-4 w-4" />
            Όροι & Προϋποθέσεις
          </Link>
          <Link
            href="/privacy"
            className="flex items-center gap-1 text-gray-300 hover:text-white transition"
          >
            <Shield className="h-4 w-4" />
            Πολιτική Απορρήτου
          </Link>
        </div>

        {/* Copyright */}
        <p className="text-xs text-gray-400 sm:text-right">
          © {new Date().getFullYear()} Peak Velocity. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
