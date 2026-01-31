import "@styles/kit/select.css";
import { forwardRef, type SelectHTMLAttributes } from "react";

type SelectSize = "xs" | "sm" | "md" | "lg";

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  /** Select options */
  options: Option[];
  /** Select size */
  size?: SelectSize;
  /** Full width */
  full?: boolean;
  /** Placeholder option */
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options,
      size = "md",
      full = false,
      placeholder,
      className,
      value,
      ...rest
    },
    ref
  ) => {
    const classes = [
      "kit-select",
      `kit-select--${size}`,
      full && "kit-select--full",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <select ref={ref} className={classes} value={value} {...rest}>
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    );
  }
);

Select.displayName = "Select";

export default Select;
