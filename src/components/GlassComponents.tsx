import React, { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

// --- Liquid Glass SVG Refraction Filter (SVG Filter Definition) ---
export const LiquidGlassSVGFilters: React.FC = () => {
  return (
    <svg className="hidden absolute w-0 h-0 pointer-events-none" aria-hidden="true">
      <defs>
        {/* Liquid Glass Distortion & Refraction Filter */}
        <filter id="liquid-glass-refraction" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" result="displaced" />
          <feGaussianBlur in="displaced" stdDeviation="0.5" result="blurred" />
          <feMerge>
            <feMergeNode in="blurred" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
};

// --- GlassCard Component ---
interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children?: React.ReactNode;
  zRadius?: number;
  borderRadius?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  zRadius = 35,
  borderRadius = 28,
  style,
  ...props
}) => {
  return (
    <motion.div
      whileHover={{
        y: -3,
        boxShadow: `0 ${zRadius + 12}px ${zRadius * 1.8}px rgba(0, 0, 0, 0.18), inset 0 1px 2px rgba(255, 255, 255, 0.4)`
      }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      style={{
        borderRadius: `${borderRadius}px`,
        boxShadow: `0 ${zRadius}px ${zRadius * 1.2}px rgba(0, 0, 0, 0.12), inset 0 1px 1.5px rgba(255, 255, 255, 0.3)`,
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(35px) saturate(190%)',
        WebkitBackdropFilter: 'blur(35px) saturate(190%)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
      className={`glass-card relative transition-all duration-300 ${className}`}
      {...props}
    >
      {/* Edge Fresnel Liquid Specular reflection */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.05) 100%)',
          borderRadius: `${borderRadius}px`
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

// --- GlassButton Component ---
interface GlassButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'water' | 'emerald' | 'amber';
  borderRadius?: number;
  theme?: 'light' | 'dark';
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = 'primary',
  className = '',
  borderRadius = 16,
  theme = 'dark',
  style,
  ...props
}) => {
  const isLight = theme === 'light';
  let bgStyle = {};
  let borderStyle = isLight ? '1px solid rgba(203, 213, 225, 0.8)' : '1px solid rgba(255, 255, 255, 0.25)';
  let textColor = 'text-white';

  if (variant === 'primary') {
    bgStyle = {
      background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
      boxShadow: '0 8px 25px rgba(79, 70, 229, 0.35), inset 0 1px 1.5px rgba(255, 255, 255, 0.5)',
      border: '1px solid rgba(255, 255, 255, 0.4)'
    };
    textColor = 'text-white font-extrabold';
  } else if (variant === 'secondary') {
    bgStyle = {
      background: isLight ? 'rgba(241, 245, 249, 0.95)' : 'rgba(51, 65, 85, 0.75)',
      boxShadow: isLight
        ? '0 4px 14px rgba(0, 0, 0, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.9)'
        : '0 4px 14px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
    };
    borderStyle = isLight ? '1px solid rgba(203, 213, 225, 0.9)' : '1px solid rgba(148, 163, 184, 0.4)';
    textColor = isLight ? 'text-slate-700 hover:text-slate-900 font-bold' : 'text-slate-200 hover:text-white font-bold';
  } else if (variant === 'danger') {
    bgStyle = {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      boxShadow: '0 8px 25px rgba(239, 68, 68, 0.4), inset 0 1px 1.5px rgba(255, 255, 255, 0.5)',
      border: '1px solid rgba(255, 255, 255, 0.4)'
    };
    textColor = 'text-white font-extrabold';
  } else if (variant === 'water') {
    bgStyle = {
      background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
      boxShadow: '0 8px 25px rgba(2, 132, 199, 0.4), inset 0 1px 1.5px rgba(255, 255, 255, 0.5)',
      border: '1px solid rgba(255, 255, 255, 0.4)'
    };
    textColor = 'text-white font-extrabold';
  } else if (variant === 'emerald') {
    bgStyle = {
      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4), inset 0 1px 1.5px rgba(255, 255, 255, 0.5)',
      border: '1px solid rgba(255, 255, 255, 0.4)'
    };
    textColor = 'text-white font-extrabold';
  } else if (variant === 'amber') {
    bgStyle = {
      background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
      boxShadow: '0 8px 25px rgba(249, 115, 22, 0.4), inset 0 1px 1.5px rgba(255, 255, 255, 0.5)',
      border: '1px solid rgba(255, 255, 255, 0.4)'
    };
    textColor = 'text-white font-extrabold';
  } else {
    // outline
    bgStyle = {
      background: isLight ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.18)',
    };
    borderStyle = isLight ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(99, 102, 241, 0.5)';
    textColor = isLight ? 'text-indigo-600 font-bold' : 'text-indigo-300 font-bold';
  }

  return (
    <motion.button
      whileHover={{
        scale: 1.02,
        y: -1,
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.5)'
      }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 450, damping: 20 }}
      style={{
        ...bgStyle,
        borderRadius: `${borderRadius}px`,
        border: borderStyle,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        cursor: 'pointer',
        padding: '12px 28px',
        ...style
      }}
      className={`glass-button relative overflow-hidden flex items-center justify-center gap-2 transition-all text-sm sm:text-base ${textColor} ${className}`}
      {...props}
    >
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 65%)',
          borderRadius: `${borderRadius}px`
        }}
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
};

// --- GlassInput Component ---
interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  theme?: 'light' | 'dark';
}

export const GlassInput: React.FC<GlassInputProps> = ({ className = '', theme = 'dark', style, ...props }) => {
  const isLight = theme === 'light';
  return (
    <input
      style={{
        borderRadius: '18px',
        background: isLight ? 'rgba(255, 255, 255, 0.92)' : 'rgba(30, 41, 59, 0.85)',
        border: isLight ? '1px solid rgba(203, 213, 225, 0.9)' : '1px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        padding: '14px 20px',
        color: isLight ? '#0f172a' : '#ffffff',
        fontSize: '0.95rem',
        boxShadow: isLight ? 'inset 0 1px 2px rgba(0, 0, 0, 0.04)' : 'inset 0 1px 3px rgba(0, 0, 0, 0.3)',
        ...style
      }}
      className={`w-full outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all font-semibold ${
        isLight ? 'placeholder:text-slate-400' : 'placeholder:text-slate-400'
      } ${className}`}
      {...props}
    />
  );
};

// --- GlassSelect Component ---
interface GlassSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
  className?: string;
  theme?: 'light' | 'dark';
}

export const GlassSelect: React.FC<GlassSelectProps> = ({ children, className = '', theme = 'dark', style, ...props }) => {
  const isLight = theme === 'light';
  const arrowColor = isLight ? '%23475569' : 'white';
  return (
    <select
      style={{
        borderRadius: '18px',
        background: isLight ? 'rgba(255, 255, 255, 0.92)' : 'rgba(30, 41, 59, 0.85)',
        border: isLight ? '1px solid rgba(203, 213, 225, 0.9)' : '1px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        padding: '14px 40px 14px 20px',
        color: isLight ? '#0f172a' : '#ffffff',
        fontSize: '0.95rem',
        boxShadow: isLight ? 'inset 0 1px 2px rgba(0, 0, 0, 0.04)' : 'inset 0 1px 3px rgba(0, 0, 0, 0.3)',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='none' stroke='${arrowColor}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 18px center',
        backgroundSize: '16px',
        ...style
      }}
      className={`w-full outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all font-semibold ${
        isLight ? '[&>option]:bg-white [&>option]:text-slate-900' : '[&>option]:bg-slate-900 [&>option]:text-white'
      } ${className}`}
      {...props}
    >
      {children}
    </select>
  );
};

// --- GlassTextArea Component ---
interface GlassTextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
  theme?: 'light' | 'dark';
}

export const GlassTextArea: React.FC<GlassTextAreaProps> = ({ className = '', theme = 'dark', style, ...props }) => {
  const isLight = theme === 'light';
  return (
    <textarea
      style={{
        borderRadius: '20px',
        background: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(30, 41, 59, 0.85)',
        border: isLight ? '1px solid rgba(203, 213, 225, 0.9)' : '1px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        padding: '16px 20px',
        color: isLight ? '#0f172a' : '#ffffff',
        fontSize: '0.95rem',
        lineHeight: 1.5,
        boxShadow: isLight ? 'inset 0 1px 2px rgba(0, 0, 0, 0.04)' : 'inset 0 1px 3px rgba(0, 0, 0, 0.3)',
        ...style
      }}
      className={`w-full outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all font-semibold ${
        isLight ? 'placeholder:text-slate-400' : 'placeholder:text-slate-400'
      } ${className}`}
      {...props}
    />
  );
};

// --- GlassModal / GlassDialog Component ---
interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  badge?: string;
  accentColor?: 'indigo' | 'cyan' | 'emerald' | 'amber' | 'violet';
  children: React.ReactNode;
  maxWidth?: string; // e.g., 'max-w-md', 'max-w-lg', 'max-w-xl'
  theme?: 'light' | 'dark';
}

export const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  badge,
  children,
  maxWidth = 'max-w-lg',
  theme = 'dark'
}) => {
  if (!isOpen) return null;

  const isLight = theme === 'light';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px'
      }}
    >
      <LiquidGlassSVGFilters />

      {/* Background Dim overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: isLight ? 'rgba(15, 23, 42, 0.45)' : 'rgba(2, 6, 23, 0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          zIndex: 0
        }}
        onClick={onClose}
      />

      {/* Glass Dialog Container */}
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 15 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          borderRadius: '36px',
          background: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(45px) saturate(210%)',
          WebkitBackdropFilter: 'blur(45px) saturate(210%)',
          border: isLight ? '1px solid rgba(255, 255, 255, 0.9)' : '1px solid rgba(255, 255, 255, 0.25)',
          boxShadow: isLight
            ? '0 30px 80px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(255, 255, 255, 1)'
            : '0 30px 80px rgba(0, 0, 0, 0.6), inset 0 1px 1.5px rgba(255, 255, 255, 0.3)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        className={`w-full ${maxWidth} relative`}
      >
        {/* Specular edge highlight reflection */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
            background: isLight
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 60%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 60%)',
            borderRadius: '32px'
          }}
        />

        {/* Modal Header */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 32px',
            borderBottom: isLight ? '1px solid rgba(226, 232, 240, 0.9)' : '1px solid rgba(255, 255, 255, 0.12)',
            background: isLight ? 'rgba(248, 250, 252, 0.8)' : 'rgba(30, 41, 59, 0.6)',
            flexShrink: 0
          }}
        >
          <div className="flex items-center gap-3">
            {icon && <span className="text-2xl">{icon}</span>}
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: isLight ? '#0f172a' : '#ffffff', lineHeight: 1.3, letterSpacing: '-0.02em' }}>
                {title}
              </h3>
              {badge && (
                <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full inline-block mt-1 ${
                  isLight ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}>
                  {badge}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            style={{
              background: isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.12)',
              border: 'none',
              cursor: 'pointer',
              padding: '10px',
              borderRadius: '50%',
              color: isLight ? '#475569' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <svg fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '20px', height: '20px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            padding: '32px 36px',
            overflowY: 'auto',
          }}
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
};

// --- GlassSwitch Component (iOS / Android Style Toggle) ---
interface GlassSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  subText?: string;
  theme?: 'light' | 'dark';
}

export const GlassSwitch: React.FC<GlassSwitchProps> = ({
  checked,
  onChange,
  label,
  subText,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';
  return (
    <div className="flex flex-col gap-1 py-1">
      <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => onChange(!checked)}>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            checked ? 'bg-indigo-600' : isLight ? 'bg-slate-300' : 'bg-slate-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
          {label}
        </span>
      </div>
      {subText && (
        <span className={`text-[11px] font-semibold leading-relaxed pl-14 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          {subText}
        </span>
      )}
    </div>
  );
};
