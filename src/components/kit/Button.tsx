import "@styles/kit/button.css";
import { forwardRef, type ButtonHTMLAttributes, type AnchorHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "xs" | "sm" | "md" | "lg";

interface BaseProps {
  /** Button variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Active/pressed state (for toggle buttons) */
  active?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Icon-only button (square aspect ratio) */
  icon?: boolean;
  /** Full width button */
  full?: boolean;
  /** Additional CSS classes */
  className?: string;
  children?: React.ReactNode;
}

type ButtonAsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & {
    href?: never;
  };

type ButtonAsLink = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

function getButtonClasses(props: BaseProps): string {
  const {
    variant = "secondary",
    size = "md",
    active = false,
    loading = false,
    icon = false,
    full = false,
    className,
  } = props;

  return [
    "kit-btn",
    `kit-btn--${variant}`,
    `kit-btn--${size}`,
    active && "is-active",
    loading && "kit-btn--loading",
    icon && "kit-btn--icon",
    full && "kit-btn--full",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export const Button = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonProps
>((props, ref) => {
  const {
    variant = "secondary",
    size = "md",
    active = false,
    loading = false,
    icon = false,
    full = false,
    className,
    children,
    ...rest
  } = props;

  const classes = getButtonClasses({
    variant,
    size,
    active,
    loading,
    icon,
    full,
    className,
  });

  if ("href" in props && props.href) {
    const { href, disabled, ...linkProps } = rest as ButtonAsLink & { disabled?: boolean };
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={disabled ? undefined : href}
        className={classes}
        aria-disabled={disabled || undefined}
        {...linkProps}
      >
        {children}
      </a>
    );
  }

  const { type = "button", disabled, ...buttonProps } = rest as ButtonAsButton;
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-pressed={active || undefined}
      {...buttonProps}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";

export default Button;
