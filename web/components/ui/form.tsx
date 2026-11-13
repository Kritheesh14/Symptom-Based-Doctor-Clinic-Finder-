import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Spinner } from './display';

const base = 'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-brand disabled:opacity-60';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; loading?: boolean };

/** Button: variant picks colour; `loading` shows a spinner and disables the button. */
export function Button({ variant = 'primary', loading, className = '', children, disabled, ...rest }: ButtonProps) {
  const styles = {
    primary: 'bg-brand text-white hover:bg-brand-dark',
    secondary: 'border border-line bg-surface text-ink hover:bg-brand-soft',
    danger: 'bg-danger text-white hover:opacity-90',
    ghost: 'text-brand hover:bg-brand-soft',
  }[variant];
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  );
}

export function Field({ label, htmlFor, hint, error, children }: { label: string; htmlFor: string; hint?: string; error?: string | null; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`${base} ${className}`} />;
}

export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={`${base} ${className}`} />;
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...rest} className={`${base} ${className}`}>{children}</select>;
}
