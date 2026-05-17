import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string;
  error?: string;
  isTextArea?: boolean;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  isTextArea, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "w-full bg-cream border border-sepia/40 rounded-sm px-3 py-2 text-ink font-body placeholder:text-ink-light/50 focus:outline-none focus:border-rust focus:ring-1 focus:ring-rust transition-colors";

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="font-functional text-sm font-semibold text-ink-light">
        {label}
      </label>
      {isTextArea ? (
        <textarea 
          className={`${baseStyles} resize-y min-h-[100px]`} 
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} 
        />
      ) : (
        <input 
          className={baseStyles} 
          {...(props as React.InputHTMLAttributes<HTMLInputElement>)} 
        />
      )}
      {error && <span className="text-xs font-functional text-rust">{error}</span>}
    </div>
  );
};