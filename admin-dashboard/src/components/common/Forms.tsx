import React from 'react';
import { ChevronDown } from 'lucide-react';

/* ─── LABEL ─── */
export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  icon?: React.ReactNode;
}
export function Label({ children, icon, style, ...props }: LabelProps) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--text-secondary)',
        marginBottom: 6,
        ...style,
      }}
      {...props}
    >
      {icon && (
        <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
          {icon}
        </span>
      )}
      {children}
    </label>
  );
}

/* ─── HELPER TEXT ─── */
export function HelperText({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return (
    <p style={{ fontSize: 11, color: error ? 'var(--accent-coral)' : 'var(--text-muted)', margin: '4px 0 0' }}>
      {children}
    </p>
  );
}

const inputBaseStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 14px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  outline: 'none',
  fontSize: 14,
  transition: 'var(--transition)',
  fontFamily: 'inherit',
};

/* ─── INPUT ─── */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefixNode?: React.ReactNode;
  suffixNode?: React.ReactNode;
  helperText?: string;
  error?: string;
  label?: React.ReactNode;
  labelIcon?: React.ReactNode;
}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ prefixNode, suffixNode, helperText, error, label, labelIcon, style, ...props }, ref) => {
    return (
      <div style={{ width: '100%' }}>
        {label && <Label icon={labelIcon}>{label}</Label>}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {prefixNode && (
            <div style={{ position: 'absolute', left: 12, display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
              {prefixNode}
            </div>
          )}
          <input
            ref={ref}
            style={{
              ...inputBaseStyle,
              paddingLeft: prefixNode ? 36 : 14,
              paddingRight: suffixNode ? 36 : 14,
              borderColor: error ? 'var(--accent-coral)' : 'var(--border)',
              ...style,
            }}
            {...props}
          />
          {suffixNode && (
            <div style={{ position: 'absolute', right: 12, display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
              {suffixNode}
            </div>
          )}
        </div>
        {(helperText || error) && <HelperText error={!!error}>{error || helperText}</HelperText>}
      </div>
    );
  }
);
Input.displayName = 'Input';

/* ─── SELECT ─── */
export interface SelectOption {
  value: string;
  label: string;
}
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  helperText?: string;
  error?: string;
  label?: React.ReactNode;
  labelIcon?: React.ReactNode;
  prefixNode?: React.ReactNode;
}
}
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, helperText, error, label, labelIcon, prefixNode, style, ...props }, ref) => {
    return (
      <div style={{ width: '100%' }}>
        {label && <Label icon={labelIcon}>{label}</Label>}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {prefixNode && (
            <div style={{ position: 'absolute', left: 12, display: 'flex', alignItems: 'center', color: 'var(--text-muted)', pointerEvents: 'none' }}>
              {prefixNode}
            </div>
          )}
          <select
            ref={ref}
            style={{
              ...inputBaseStyle,
              paddingLeft: prefixNode ? 36 : 14,
              paddingRight: 36,
              appearance: 'none',
              WebkitAppearance: 'none',
              cursor: 'pointer',
              borderColor: error ? 'var(--accent-coral)' : 'var(--border)',
              ...style,
            }}
            {...props}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div style={{ position: 'absolute', right: 12, display: 'flex', alignItems: 'center', color: 'var(--text-muted)', pointerEvents: 'none' }}>
            <ChevronDown size={16} />
          </div>
        </div>
        {(helperText || error) && <HelperText error={!!error}>{error || helperText}</HelperText>}
      </div>
    );
  }
);
Select.displayName = 'Select';

/* ─── TEXTAREA ─── */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  helperText?: string;
  error?: string;
  label?: React.ReactNode;
  labelIcon?: React.ReactNode;
  showCount?: boolean;
}
}
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ helperText, error, label, labelIcon, showCount, maxLength, value, style, ...props }, ref) => {
    const valString = (value || '') as string;
    return (
      <div style={{ width: '100%' }}>
        {label && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Label icon={labelIcon} style={{ marginBottom: 0 }}>
              {label}
            </Label>
            {showCount && maxLength && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {valString.length}/{maxLength}
              </span>
            )}
          </div>
        )}
        <textarea
          ref={ref}
          value={value}
          maxLength={maxLength}
          style={{
            ...inputBaseStyle,
            resize: 'vertical',
            minHeight: 80,
            lineHeight: 1.5,
            borderColor: error ? 'var(--accent-coral)' : 'var(--border)',
            ...style,
          }}
          {...props}
        />
        {(helperText || error) && <HelperText error={!!error}>{error || helperText}</HelperText>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
