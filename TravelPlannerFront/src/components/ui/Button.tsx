import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center gap-2 px-4 py-2 font-display text-sm tracking-wider uppercase transition-all shadow-sm rounded-sm border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-parchment";
  
  const variants = {
    primary: "bg-rust text-parchment border-ink/20 hover:bg-rust-light focus:ring-rust",
    secondary: "bg-cream text-ink border-sepia/50 hover:bg-parchment focus:ring-sepia",
    danger: "bg-red-900 text-parchment border-ink/20 hover:bg-red-800 focus:ring-red-900",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};