// FILE: src/components/Footer.tsx
import { RouterLink as Link } from "./lib/next-router-compat";
import { Mail, Phone, ExternalLink, User, MessageCircle, Dumbbell, Users, Monitor, Heart, MapPin } from "lucide-react";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility function
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Button component
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

// Input component
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

// Minimal Social Media Icons
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

export default function Footer() {
  return (
    <footer className="bg-black text-white relative overflow-hidden">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-black to-neutral-800"></div>
        <div
          className="h-full w-full animate-pulse"
          style={{
            backgroundImage: `
            radial-gradient(circle at 25% 25%, #c0c0c0 1px, transparent 1px),
            radial-gradient(circle at 75% 75%, #c0c0c0 1px, transparent 1px),
            linear-gradient(90deg, #c0c0c0 1px, transparent 1px),
            linear-gradient(180deg, #c0c0c0 1px, transparent 1px)
          `,
            backgroundSize: "60px 60px, 60px 60px, 40px 40px, 40px 40px",
          }}
        ></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-2 h-2 bg-neutral-400 rounded-full animate-bounce opacity-30"></div>
        <div className="absolute top-40 right-20 w-1 h-1 bg-white rounded-full animate-pulse opacity-40"></div>
        <div
          className="absolute bottom-32 left-1/4 w-1.5 h-1.5 bg-neutral-300 rounded-full animate-bounce opacity-20"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/3 right-1/3 w-1 h-1 bg-neutral-500 rounded-full animate-pulse opacity-30"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      {/* Main Footer */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 lg:py-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Useful Links */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-neutral-700 to-neutral-900 rounded-lg flex items-center justify-center">
                <User className="h-4 w-4 text-neutral-300" />
              </div>
              <h4 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">Χρήσιμοι Σύνδεσμοι</h4>
            </div>
            <div className="space-y-4">
              <Link
                href="/about"
                className={cn(
                  "flex items-center space-x-3 text-sm text-neutral-400 hover:text-white transition-all duration-300 group hover:bg-neutral-900/30 p-2 rounded-lg"
                )}
              >
                <User className="h-4 w-4 text-neutral-500 group-hover:text-neutral-300 transition-colors duration-300" />
                <span className="group-hover:translate-x-1 transition-transform duration-300">Σχετικά με εμάς</span>
              </Link>
              <Link
                href="/contact"
                className={cn(
                  "flex items-center space-x-3 text-sm text-neutral-400 hover:text-white transition-all duration-300 group hover:bg-neutral-900/30 p-2 rounded-lg"
                )}
              >
                <MessageCircle className="h-4 w-4 text-neutral-500 group-hover:text-neutral-300 transition-colors duration-300" />
                <span className="group-hover:translate-x-1 transition-transform duration-300">Επικοινωνία</span>
              </Link>
            </div>
            <div className="pt-4 space-y-4 border-t border-neutral-800">
              <div className="flex items-center space-x-3 text-sm text-neutral-300 hover:text-white transition-colors duration-300 group hover:bg-neutral-900/20 p-2 rounded-lg">
                <Phone className="h-4 w-4 text-neutral-400 group-hover:text-neutral-300" />
                <span>+30 210 123 4567</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-neutral-300 hover:text-white transition-colors duration-300 group hover:bg-neutral-900/20 p-2 rounded-lg">
                <Mail className="h-4 w-4 text-neutral-400 group-hover:text-neutral-300" />
                <span>info@peakvelocity.gr</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-neutral-300 hover:text-white transition-colors duration-300 group hover:bg-neutral-900/20 p-2 rounded-lg">
                <MapPin className="h-4 w-4 text-neutral-400 group-hover:text-neutral-300" />
                <span>Αθήνα, Ελλάδα</span>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-neutral-700 to-neutral-900 rounded-lg flex items-center justify-center">
                <Dumbbell className="h-4 w-4 text-neutral-300" />
              </div>
              <h4 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">Υπηρεσίες</h4>
            </div>
            <div className="space-y-4">
              <Link
                href="/yoga"
                className={cn(
                  "flex items-center space-x-3 text-sm text-neutral-400 hover:text-white transition-all duration-300 group hover:bg-neutral-900/30 p-2 rounded-lg"
                )}
              >
                <Heart className="h-4 w-4 text-neutral-500 group-hover:text-red-400 transition-colors duration-300" />
                <span className="group-hover:translate-x-1 transition-transform duration-300">Yoga</span>
                <span className="text-xs bg-neutral-800 px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  Νέο
                </span>
              </Link>
              <Link
                href="/personal-training"
                className={cn(
                  "flex items-center space-x-3 text-sm text-neutral-400 hover:text-white transition-all duration-300 group hover:bg-neutral-900/30 p-2 rounded-lg"
                )}
              >
                <Dumbbell className="h-4 w-4 text-neutral-500 group-hover:text-neutral-300 transition-colors duration-300" />
                <span className="group-hover:translate-x-1 transition-transform duration-300">Προσωπική Προπόνηση</span>
              </Link>
              <Link
                href="/group-training"
                className={cn(
                  "flex items-center space-x-3 text-sm text-neutral-400 hover:text-white transition-all duration-300 group hover:bg-neutral-900/30 p-2 rounded-lg"
                )}
              >
                <Users className="h-4 w-4 text-neutral-500 group-hover:text-neutral-300 transition-colors duration-300" />
                <span className="group-hover:translate-x-1 transition-transform duration-300">Ομαδική Προπόνηση</span>
              </Link>
              <Link
                href="/online-coaching"
                className={cn(
                  "flex items-center space-x-3 text-sm text-neutral-400 hover:text-white transition-all duration-300 group hover:bg-neutral-900/30 p-2 rounded-lg"
                )}
              >
                <Monitor className="h-4 w-4 text-neutral-500 group-hover:text-blue-400 transition-colors duration-300" />
                <span className="group-hover:translate-x-1 transition-transform duration-300">Online Coaching</span>
                <span className="text-xs bg-green-900/50 text-green-300 px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  Δημοφιλές
                </span>
              </Link>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-neutral-700 to-neutral-900 rounded-lg flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-neutral-300" />
              </div>
              <h4 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">Υποστήριξη</h4>
            </div>
            <div className="space-y-4">
              <Link
                href="/contact"
                className="block text-sm text-neutral-400 hover:text-white hover:translate-x-1 transition-all duration-300 hover:bg-neutral-900/30 p-2 rounded-lg"
              >
                Επικοινωνήστε μαζί μας
              </Link>
              <Link
                href="/faq"
                className="block text-sm text-neutral-400 hover:text-white hover:translate-x-1 transition-all duration-300 hover:bg-neutral-900/30 p-2 rounded-lg"
              >
                Συχνές Ερωτήσεις
              </Link>
              <Link
                href="/booking"
                className="block text-sm text-neutral-400 hover:text-white hover:translate-x-1 transition-all duration-300 hover:bg-neutral-900/30 p-2 rounded-lg"
              >
                Κράτηση
              </Link>
              <Link
                href="/terms"
                className="block text-sm text-neutral-400 hover:text-white hover:translate-x-1 transition-all duration-300 hover:bg-neutral-900/30 p-2 rounded-lg"
              >
                Όροι & Προϋποθέσεις
              </Link>
              <Link
                href="/privacy"
                className="block text-sm text-neutral-400 hover:text-white hover:translate-x-1 transition-all duration-300 hover:bg-neutral-900/30 p-2 rounded-lg"
              >
                Πολιτική Απορρήτου
              </Link>
            </div>
          </div>

          {/* Social & Newsletter */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-neutral-700 to-neutral-900 rounded-lg flex items-center justify-center">
                <ExternalLink className="h-4 w-4 text-neutral-300" />
              </div>
              <h4 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">Βρείτε μας</h4>
            </div>
            <div className="space-y-4">
              <Link
                href="#"
                className={cn(
                  "flex items-center space-x-3 text-sm text-neutral-400 hover:text-white transition-all duration-300 group hover:bg-blue-900/20 p-2 rounded-lg"
                )}
              >
                <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                  <FacebookIcon />
                </div>
                <span className="group-hover:translate-x-1 transition-transform duration-300">Facebook</span>
              </Link>
              <Link
                href="#"
                className={cn(
                  "flex items-center space-x-3 text-sm text-neutral-400 hover:text-white transition-all duration-300 group hover:bg-pink-900/20 p-2 rounded-lg"
                )}
              >
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded flex items-center justify-center">
                  <InstagramIcon />
                </div>
                <span className="group-hover:translate-x-1 transition-transform duration-300">Instagram</span>
              </Link>
              <Link
                href="#"
                className={cn(
                  "flex items-center space-x-3 text-sm text-neutral-400 hover:text-white transition-all duration-300 group hover:bg-neutral-900/30 p-2 rounded-lg"
                )}
              >
                <div className="w-6 h-6 bg-black border border-neutral-600 rounded flex items-center justify-center">
                  <TikTokIcon />
                </div>
                <span className="group-hover:translate-x-1 transition-transform duration-300">TikTok</span>
              </Link>
            </div>

            {/* Newsletter */}
            <div className="pt-4 border-t border-neutral-800">
              <h5 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-3">Newsletter</h5>
              <p className="text-xs text-neutral-400 mb-3">Λάβετε τις τελευταίες συμβουλές fitness</p>
              <div className="flex">
                <Input
                  type="email"
                  placeholder="Email σας"
                  className="flex-1 bg-neutral-900 border-neutral-700 rounded-l-lg rounded-r-none text-xs text-white placeholder-neutral-500 focus:border-neutral-500 h-8"
                />
                <Button
                  size="sm"
                  className="bg-white text-black px-3 py-2 rounded-l-none rounded-r-lg text-xs font-semibold hover:bg-neutral-200 transition-colors h-8"
                >
                  →
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="relative z-10 border-t border-neutral-800 bg-gradient-to-r from-neutral-900 via-black to-neutral-900">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-center">
            <p className="text-sm text-neutral-500">© 2024. Όλα τα δικαιώματα διατηρούνται.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
