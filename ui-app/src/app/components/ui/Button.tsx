import { ButtonHTMLAttributes, ReactNode, useRef, MouseEvent } from 'react';
import { playSound } from '@/app/services/audioCommands';

/**
 * Touch-First Button Component
 * 
 * Design Principles:
 * - Minimum 48px touch target
 * - Android-style ripple effect
 * - Press state feedback (scale + opacity)
 * - Shape hierarchy (rounded rectangles, NOT circles everywhere)
 * - Clear visual feedback for disabled state
 * 
 * Variants:
 * - primary: Filled, highest emphasis
 * - secondary: Outlined, supporting actions
 * - ghost: Text-only, low emphasis
 * - destructive: Red, dangerous actions
 * 
 * Sizes:
 * - large: 56px height (primary actions)
 * - medium: 48px height (default)
 * - small: 40px height (use sparingly)
 */

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'small' | 'medium' | 'large';
  children: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isLoading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'medium',
  children,
  leftIcon,
  rightIcon,
  isLoading = false,
  fullWidth = false,
  disabled,
  className = '',
  onClick,
  ...props
}: ButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Android-style ripple effect
  const createRipple = (event: MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    // Calculate ripple position relative to button
    const rect = button.getBoundingClientRect();
    ripple.style.width = ripple.style.height = `${diameter}px`;
    ripple.style.left = `${event.clientX - rect.left - radius}px`;
    ripple.style.top = `${event.clientY - rect.top - radius}px`;
    ripple.classList.add('ripple');

    // Remove old ripples
    const existingRipple = button.getElementsByClassName('ripple')[0];
    if (existingRipple) {
      existingRipple.remove();
    }

    button.appendChild(ripple);

    // Remove ripple after animation
    setTimeout(() => {
      ripple.remove();
    }, 600);
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading) {
      createRipple(event);
      playSound('ui_click');
      onClick?.(event);
    }
  };

  // Base styles (all buttons)
  const baseStyles = `
    relative overflow-hidden
    inline-flex items-center justify-center
    font-medium transition-all duration-100
    touch-target press-feedback ripple-container
    focus-visible-ring
    disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
  `;

  // Variant styles
  const variantStyles = {
    primary: `
      bg-slate-100 text-slate-950
      hover:bg-slate-200
      active:bg-slate-300
    `,
    secondary: `
      border-2 border-slate-300 text-slate-100
      hover:border-slate-200 hover:bg-slate-800
      active:bg-slate-750
    `,
    ghost: `
      text-slate-100
      hover:bg-slate-800
      active:bg-slate-750
    `,
    destructive: `
      bg-red-600 text-white
      hover:bg-red-700
      active:bg-red-800
    `,
  };

  // Size styles
  const sizeStyles = {
    small: `
      h-[40px] px-4 text-sm
      rounded-[10px]
      gap-2
    `,
    medium: `
      h-[48px] px-5 text-base
      rounded-[12px]
      gap-2
    `,
    large: `
      h-[56px] px-6 text-lg
      rounded-[16px]
      gap-3
      font-semibold
    `,
  };

  const widthStyles = fullWidth ? 'w-full' : '';

  return (
    <button
      ref={buttonRef}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${widthStyles}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      disabled={disabled || isLoading}
      onClick={handleClick}
      data-ui-sound="1"
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}

/**
 * IconButton Component
 * Square button with icon only (48px × 48px minimum)
 * Uses rounded square shape (NOT circle)
 */

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string; // For accessibility (aria-label)
  variant?: 'default' | 'destructive';
  size?: 'medium' | 'large';
}

export function IconButton({
  icon,
  label,
  variant = 'default',
  size = 'medium',
  disabled,
  className = '',
  onClick,
  ...props
}: IconButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const createRipple = (event: MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    const rect = button.getBoundingClientRect();
    ripple.style.width = ripple.style.height = `${diameter}px`;
    ripple.style.left = `${event.clientX - rect.left - radius}px`;
    ripple.style.top = `${event.clientY - rect.top - radius}px`;
    ripple.classList.add('ripple');

    const existingRipple = button.getElementsByClassName('ripple')[0];
    if (existingRipple) {
      existingRipple.remove();
    }

    button.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      createRipple(event);
      playSound('ui_click');
      onClick?.(event);
    }
  };

  const baseStyles = `
    relative overflow-hidden
    inline-flex items-center justify-center
    transition-all duration-100
    touch-target press-feedback ripple-container
    focus-visible-ring
    disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
  `;

  const variantStyles = {
    default: `
      text-slate-100
      hover:bg-slate-800
      active:bg-slate-750
    `,
    destructive: `
      text-red-500
      hover:bg-red-950/30
      active:bg-red-950/50
    `,
  };

  const sizeStyles = {
    medium: `
      w-[48px] h-[48px]
      rounded-[12px]
    `,
    large: `
      w-[56px] h-[56px]
      rounded-[14px]
    `,
  };

  return (
    <button
      ref={buttonRef}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      disabled={disabled}
      onClick={handleClick}
      data-ui-sound="1"
      aria-label={label}
      {...props}
    >
      {icon}
    </button>
  );
}

/**
 * Chip Component
 * Pill-shaped toggle for filters and tags
 * Smaller touch target (40px) is acceptable for chips
 */

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  isSelected?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  count?: number;
}

export function Chip({
  label,
  isSelected = false,
  leftIcon,
  rightIcon,
  count,
  disabled,
  className = '',
  onClick,
  ...props
}: ChipProps) {
  const chipRef = useRef<HTMLButtonElement>(null);

  const createRipple = (event: MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    const rect = button.getBoundingClientRect();
    ripple.style.width = ripple.style.height = `${diameter}px`;
    ripple.style.left = `${event.clientX - rect.left - radius}px`;
    ripple.style.top = `${event.clientY - rect.top - radius}px`;
    ripple.classList.add('ripple');

    const existingRipple = button.getElementsByClassName('ripple')[0];
    if (existingRipple) {
      existingRipple.remove();
    }

    button.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      createRipple(event);
      onClick?.(event);
    }
  };

  const baseStyles = `
    relative overflow-hidden
    inline-flex items-center justify-center
    h-[40px] px-4 gap-2
    rounded-full
    text-sm font-medium
    transition-all duration-100
    ripple-container
    focus-visible-ring
    disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
  `;

  const selectedStyles = isSelected
    ? 'bg-slate-100 text-slate-950'
    : 'bg-slate-800 text-slate-300 hover:bg-slate-750 active:bg-slate-700';

  return (
    <button
      ref={chipRef}
      className={`
        ${baseStyles}
        ${selectedStyles}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      disabled={disabled}
      onClick={handleClick}
      aria-pressed={isSelected}
      {...props}
    >
      {leftIcon && <span className="flex-shrink-0 w-4 h-4">{leftIcon}</span>}
      <span className="whitespace-nowrap">{label}</span>
      {count !== undefined && (
        <span className={`
          px-1.5 py-0.5 rounded-full text-xs font-semibold min-w-[20px] text-center
          ${isSelected ? 'bg-slate-950/10' : 'bg-slate-700'}
        `}>
          {count}
        </span>
      )}
      {rightIcon && <span className="flex-shrink-0 w-4 h-4">{rightIcon}</span>}
    </button>
  );
}
