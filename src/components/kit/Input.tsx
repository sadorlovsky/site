import "@styles/kit/input.css";
import { forwardRef, type InputHTMLAttributes } from "react";

type InputSize = "sm" | "md" | "lg";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Input size */
  size?: InputSize;
  /** Error state */
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ size = "md", error = false, className, ...rest }, ref) => {
    const classes = [
      "kit-input",
      `kit-input--${size}`,
      error && "kit-input--error",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return <input ref={ref} className={classes} {...rest} />;
  }
);

Input.displayName = "Input";

export default Input;
