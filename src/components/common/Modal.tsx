import { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses = {
      primary:
        'bg-[var(--color-primary)] text-white hover:opacity-90 focus:ring-[var(--color-primary)]',
      secondary:
        'bg-[var(--color-secondary)] text-white hover:opacity-90 focus:ring-[var(--color-secondary)]',
      outline:
        'border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:bg-opacity-10 focus:ring-[var(--color-primary)]',
      ghost:
        'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
      danger:
        'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
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
        ) : leftIcon ? (
          <span className="mr-2">{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon && !isLoading && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function Card({ children, className = '', padding = 'md', onClick }: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 ${paddingClasses[padding]} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helpText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, helpText, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`block w-full rounded-lg border ${
              error ? 'border-red-500' : 'border-gray-300'
            } px-3 py-2 ${
              leftIcon ? 'pl-10' : ''
            } ${
              rightIcon ? 'pr-10' : ''
            } focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {helpText && !error && <p className="text-sm text-gray-500">{helpText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`block w-full rounded-lg border ${
            error ? 'border-red-500' : 'border-gray-300'
          } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent disabled:bg-gray-50 ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'md', className = '' }: BadgeProps) {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        className={`animate-spin text-[var(--color-primary)] ${sizeClasses[size]}`}
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
    </div>
  );
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        <div
          className={`relative bg-white rounded-xl shadow-xl w-full ${sizeClasses[size]} transform transition-all`}
        >
          {title && (
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

interface TableProps<T> {
  data: T[];
  columns: {
    key: string;
    header: string;
    render?: (item: T) => React.ReactNode;
    className?: string;
  }[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export function Table<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  emptyMessage = 'Nincsenek adatok',
  loading = false,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="text-center py-12 text-gray-500">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item) => (
            <tr
              key={item.id}
              onClick={() => onRowClick?.(item)}
              className={`${
                onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
              } transition-colors`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-6 py-4 whitespace-nowrap ${col.className || ''}`}>
                  {col.render
                    ? col.render(item)
                    : (item as Record<string, unknown>)[col.key]?.toString()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
}: QuantitySelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        -
      </button>
      <span className="w-8 text-center font-medium">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        +
      </button>
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-gray-500 mb-4 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}
