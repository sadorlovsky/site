import "@styles/kit/toggle-group.css";

type ToggleGroupSize = "sm" | "md";
type ToggleGroupVariant = "pill" | "separated";

interface ToggleItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Disabled state */
  disabled?: boolean;
}

interface ToggleGroupProps {
  /** Toggle items */
  items: ToggleItem[];
  /** Currently active item id */
  value?: string;
  /** Callback when selection changes */
  onChange?: (value: string) => void;
  /** Size variant */
  size?: ToggleGroupSize;
  /** Visual variant */
  variant?: ToggleGroupVariant;
  /** ARIA label for the group */
  ariaLabel?: string;
  /** Additional CSS classes */
  className?: string;
  /** Name for form submission */
  name?: string;
}

export function ToggleGroup({
  items,
  value,
  onChange,
  size = "md",
  variant = "pill",
  ariaLabel,
  className,
  name,
}: ToggleGroupProps) {
  const classes = [
    "kit-toggle-group",
    `kit-toggle-group--${size}`,
    variant === "separated" && "kit-toggle-group--separated",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} role="group" aria-label={ariaLabel}>
      {items.map((item) => {
        const isActive = item.id === value;

        return (
          <button
            key={item.id}
            type="button"
            className={`kit-toggle-item${isActive ? " is-active" : ""}`}
            aria-pressed={isActive}
            disabled={item.disabled}
            name={name}
            value={item.id}
            onClick={() => onChange?.(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export default ToggleGroup;
