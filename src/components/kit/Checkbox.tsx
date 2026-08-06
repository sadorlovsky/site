import "@styles/kit/checkbox.css";
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

type CheckboxVariant = "pill" | "box";
type CheckboxSize = "sm" | "md";

const CheckIcon = () => (
  <svg
    viewBox="0 0 12 12"
    fill="none"
    stroke="white"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="2.5 6 5 8.5 9.5 3.5" />
  </svg>
);

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  /** Visual variant */
  variant?: CheckboxVariant;
  /** Size variant */
  size?: CheckboxSize;
  /** Label content */
  label: ReactNode;
}

/**
 * `checked` and `disabled` are deliberately left in `...rest` rather than
 * destructured with defaults: giving `checked` a default would force every
 * instance into React's controlled mode, and an uncontrolled caller would get
 * the missing-onChange warning for a prop it never passed.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ variant = "pill", size = "md", label, className, ...rest }, ref) => {
    const classes = [
      "kit-checkbox",
      `kit-checkbox--${variant}`,
      `kit-checkbox--${size}`,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <label className={classes}>
        <input
          ref={ref}
          className="kit-checkbox__input"
          type="checkbox"
          {...rest}
        />
        {variant === "box" && (
          <span className="kit-checkbox__box">
            <CheckIcon />
          </span>
        )}
        <span className="kit-checkbox__text">{label}</span>
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
