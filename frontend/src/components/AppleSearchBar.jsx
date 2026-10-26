import React, { useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

export default function AppleSearchBar({
  placeholder = 'Search corridors, PINs, micro-markets...',
  value = '',
  onChange,
  onClear,
  onSubmit,
  hotkey = '⌘K',
  onHotkeyClick,
  isLoading = false,
  size = 'md',
  className = '',
  autoFocus = false,
  disabled = false,
}) {
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSubmit) {
      e.preventDefault();
      onSubmit(value);
    } else if (e.key === 'Escape' && onClear) {
      e.preventDefault();
      onClear();
    }
  };

  const sizeClasses = {
    sm: 'py-1.5 px-3 text-xs gap-2',
    md: 'py-2.5 px-4 text-sm gap-2.5',
    lg: 'py-3.5 px-5 text-base gap-3',
  }[size] || 'py-2.5 px-4 text-sm gap-2.5';

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  }[size] || 16;

  return (
    <div
      className={`relative flex items-center w-full rounded-2xl transition-all duration-200 border group focus-within:border-[#FF9F1C]/50 focus-within:ring-2 focus-within:ring-[#FF9F1C]/15 ${sizeClasses} ${className}`}
      style={{
        background: 'var(--apple-search-bg, rgba(255, 255, 255, 0.05))',
        borderColor: 'var(--apple-search-border, rgba(255, 255, 255, 0.12))',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.18)',
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {isLoading ? (
        <Loader2
          size={iconSizes}
          className="animate-spin text-[#FF9F1C] shrink-0"
        />
      ) : (
        <Search
          size={iconSizes}
          className="text-[var(--color-text-muted)] group-focus-within:text-[#FF9F1C] transition-colors shrink-0"
        />
      )}

      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus={autoFocus}
        disabled={disabled}
        aria-label={placeholder}
        className="flex-1 bg-transparent border-none placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-0 w-full min-w-0"
        style={{
          fontFamily: 'var(--font-body, inherit)',
          color: 'var(--color-text-primary, #FFFFFF)',
        }}
      />

      {value ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear ? onClear() : onChange?.('');
            inputRef.current?.focus();
          }}
          className="p-1 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/10 transition-all shrink-0 cursor-pointer"
          title="Clear search"
        >
          <X size={iconSizes - 2} />
        </button>
      ) : hotkey ? (
        <kbd
          onClick={(e) => {
            if (onHotkeyClick) {
              e.stopPropagation();
              onHotkeyClick();
            }
          }}
          className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono rounded-lg border text-white/45 bg-white/[0.04] border-white/10 shrink-0 select-none group-focus-within:border-[#FF9F1C]/40 group-focus-within:text-[#FF9F1C] transition-colors"
        >
          {hotkey}
        </kbd>
      ) : null}
    </div>
  );
}
