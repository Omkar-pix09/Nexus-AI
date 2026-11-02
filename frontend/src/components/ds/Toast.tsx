import React, { useEffect } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import GlassPanel from "./GlassPanel";

export interface ToastProps {
  id?: string;
  type?: "nominal" | "warning" | "alarm" | "info";
  title: string;
  message?: string;
  duration?: number; // Auto close in ms, 0 for infinite
  onClose?: () => void;
  className?: string;
}

const toastConfigs = {
  nominal: {
    icon: CheckCircle2,
    glow: "sonar" as const,
    accent: "text-sonar",
    border: "border-sonar/30",
    bg: "bg-sonar/10",
  },
  warning: {
    icon: AlertTriangle,
    glow: "signal" as const,
    accent: "text-signal",
    border: "border-signal/30",
    bg: "bg-signal/10",
  },
  alarm: {
    icon: AlertCircle,
    glow: "alarm" as const,
    accent: "text-alarm",
    border: "border-alarm/30",
    bg: "bg-alarm/10",
  },
  info: {
    icon: Info,
    glow: "plasma" as const,
    accent: "text-plasma",
    border: "border-plasma/30",
    bg: "bg-plasma/10",
  },
};

/**
 * Abyssal Toast Component
 * Elevated HUD notification that uses bioluminescent glow and iconography to signal telemetry changes.
 */
export const Toast: React.FC<ToastProps> = ({
  type = "nominal",
  title,
  message,
  duration = 5000,
  onClose,
  className = "",
}) => {
  const cfg = toastConfigs[type];
  const Icon = cfg.icon;

  useEffect(() => {
    if (duration > 0 && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <GlassPanel
      elevation={5}
      aiActive={true}
      glow={cfg.glow}
      className={`max-w-md w-full p-4 border ${cfg.border} shadow-2xl transition-all duration-steady ease-abyssal ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded-nexus-sm ${cfg.bg} ${cfg.accent} shrink-0 mt-0.5`}>
          <Icon size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-display font-semibold text-white text-scale-sm tracking-tight truncate">
            {title}
          </h4>
          {message && (
            <p className="mt-1 font-sans text-scale-xs text-slate-300 leading-relaxed">
              {message}
            </p>
          )}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-nexus-sm text-slate-400 hover:text-white hover:bg-white/10 transition shrink-0"
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </GlassPanel>
  );
};

export default Toast;
