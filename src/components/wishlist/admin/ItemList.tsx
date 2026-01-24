import { useState, useRef, useCallback } from "react";
import type {
  WishlistItem,
  Reservation,
  Category,
  ExchangeRates,
} from "./types";

// Currency prefixes for parsing prices
const currencyPrefixes = [
  { prefix: "AU$", currency: "AUD" },
  { prefix: "$", currency: "USD" },
  { prefix: "£", currency: "GBP" },
  { prefix: "€", currency: "EUR" },
  { prefix: "₹", currency: "INR" },
] as const;

// Parse price string and convert to RUB
function convertToRub(
  price: string,
  exchangeRates: ExchangeRates,
): number | null {
  const trimmed = price.trim();

  for (const { prefix, currency } of currencyPrefixes) {
    if (trimmed.startsWith(prefix)) {
      const amount = parseInt(
        trimmed.slice(prefix.length).replace(/,/g, ""),
        10,
      );
      if (isNaN(amount)) return null;

      const rate = exchangeRates[currency];
      if (!rate) return null;

      return Math.round(amount * rate);
    }
  }

  return null;
}

// Format number as RUB price
function formatRub(amount: number): string {
  return `₽${amount.toLocaleString("ru-RU")}`;
}

// Format date as short string
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

// Truncate string with ellipsis
function truncateId(id: string, maxLength = 8): string {
  if (id.length <= maxLength) return id;
  return `${id.slice(0, maxLength)}...`;
}

interface ItemListProps {
  items: WishlistItem[];
  reservations: Map<number, Reservation>;
  categories: Category[];
  cdnDomain: string;
  exchangeRates: ExchangeRates;
  isDraggable: boolean;
  onEdit: (item: WishlistItem) => void;
  onDelete: (id: number, title: string) => void;
  onToggleReceived: (id: number, received: boolean) => Promise<void>;
  onToggleReserved: (id: number, reserved: boolean) => Promise<void>;
  onReorder?: (reorderedItems: WishlistItem[]) => void;
}

interface ItemCardProps {
  item: WishlistItem;
  reservation: Reservation | undefined;
  categoryLabels: { id: string; label: string }[];
  cdnDomain: string;
  priceRub: number | null;
  isDraggable: boolean;
  isDragging: boolean;
  dragOverPosition: "before" | "after" | null;
  onEdit: () => void;
  onDelete: () => void;
  onToggleReceived: () => Promise<void>;
  onToggleReserved: () => Promise<void>;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

function ItemCard({
  item,
  reservation,
  categoryLabels,
  cdnDomain,
  priceRub,
  isDraggable,
  isDragging,
  dragOverPosition,
  onEdit,
  onDelete,
  onToggleReceived,
  onToggleReserved,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
}: ItemCardProps) {
  const isReserved = !!reservation;

  const itemClasses = [
    "item-card",
    isReserved ? "reserved" : "",
    item.received ? "received" : "",
    isDraggable ? "draggable" : "",
    isDragging ? "dragging" : "",
    dragOverPosition === "before" ? "drag-over-before" : "",
    dragOverPosition === "after" ? "drag-over-after" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      className={itemClasses}
      data-item-id={item.id}
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="item-image">
        <img
          src={`https://${cdnDomain}/${item.imageUrl}`}
          alt={item.title}
          loading="lazy"
        />
        {/* Status badge overlay */}
        {(isReserved || item.received) && (
          <div className="item-status">
            {item.received && (
              <span className="status-badge status-received">Received</span>
            )}
            {isReserved && !item.received && (
              <span className="status-badge status-reserved">Reserved</span>
            )}
          </div>
        )}
      </div>

      <div className="item-content">
        {/* Primary info */}
        <div className="item-primary">
          <div className="item-header">
            <span className="item-id">#{item.id}</span>
            <h3>{item.title}</h3>
          </div>
          {item.titleRu && <p className="item-title-ru">{item.titleRu}</p>}
          <div className="item-prices">
            <span className="item-price">{item.price}</span>
            {priceRub && (
              <span className="item-price-rub">{formatRub(priceRub)}</span>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="item-categories">
          {categoryLabels.map(({ id, label }) => (
            <span key={id} className="tag tag-category">
              {label}
            </span>
          ))}
          {item.priority && (
            <span className={`tag tag-priority tag-priority-${item.priority}`}>
              {item.priority}
            </span>
          )}
          {item.weight > 0 && (
            <span className="tag tag-weight">w:{item.weight}</span>
          )}
        </div>

        {/* Descriptions (secondary info) */}
        {(item.description || item.descriptionRu) && (
          <div className="item-descriptions">
            {item.description && (
              <p className="item-description">
                <span className="desc-label">EN:</span> {item.description}
              </p>
            )}
            {item.descriptionRu && (
              <p className="item-description">
                <span className="desc-label">RU:</span> {item.descriptionRu}
              </p>
            )}
          </div>
        )}

        {/* Meta info: dates and reservation */}
        <div className="item-meta">
          <span className="meta-item" title="Added date">
            Added {formatDate(item.createdAt)}
          </span>
          {reservation && (
            <>
              <span className="meta-separator">•</span>
              <span
                className="meta-item meta-reserved"
                title={`Reserved by ${reservation.reservedBy}`}
              >
                Reserved by{" "}
                <span
                  className="reserved-by"
                  data-reservator-id={reservation.reservedBy}
                >
                  {truncateId(reservation.reservedBy)}
                </span>{" "}
                on {formatDate(reservation.reservedAt)}
              </span>
            </>
          )}
        </div>

        <div className="item-actions">
          <button
            className="action-btn action-edit"
            onClick={onEdit}
            title="Edit item"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
          <button
            className={`action-btn action-reserved ${isReserved ? "active" : ""}`}
            onClick={onToggleReserved}
            data-tooltip={isReserved ? "Remove reservation" : "Reserve item"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button
            className={`action-btn action-received ${item.received ? "active" : ""}`}
            onClick={onToggleReceived}
            data-tooltip={
              item.received ? "Mark as not received" : "Mark as received"
            }
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
          <button
            className="action-btn action-delete"
            onClick={onDelete}
            data-tooltip="Delete item"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}

export function ItemList({
  items,
  reservations,
  categories,
  cdnDomain,
  exchangeRates,
  isDraggable,
  onEdit,
  onDelete,
  onToggleReceived,
  onToggleReserved,
  onReorder,
}: ItemListProps) {
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<number | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<
    "before" | "after" | null
  >(null);
  const dragCounter = useRef<Map<number, number>>(new Map());

  const getCategoryLabels = useCallback(
    (categoryString: string): { id: string; label: string }[] => {
      const categoryIds = categoryString.split(",").map((c) => c.trim());
      return categoryIds.map((id) => {
        const cat = categories.find((c) => c.id === id);
        return { id, label: cat?.label || id };
      });
    },
    [categories],
  );

  const handleDragStart = useCallback((e: React.DragEvent, itemId: number) => {
    setDraggedItemId(itemId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(itemId));
    // Add a slight delay to allow the drag image to be captured
    requestAnimationFrame(() => {
      const element = e.target as HTMLElement;
      element.classList.add("dragging");
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItemId(null);
    setDragOverItemId(null);
    setDragOverPosition(null);
    dragCounter.current.clear();
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, itemId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    // Determine if dropping before or after based on mouse position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    const position = e.clientX < midpoint ? "before" : "after";

    setDragOverItemId(itemId);
    setDragOverPosition(position);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, itemId: number) => {
    e.preventDefault();
    const count = (dragCounter.current.get(itemId) || 0) + 1;
    dragCounter.current.set(itemId, count);
  }, []);

  const handleDragLeave = useCallback(
    (itemId: number) => {
      const count = (dragCounter.current.get(itemId) || 0) - 1;
      dragCounter.current.set(itemId, count);

      if (count <= 0) {
        dragCounter.current.delete(itemId);
        if (dragOverItemId === itemId) {
          setDragOverItemId(null);
          setDragOverPosition(null);
        }
      }
    },
    [dragOverItemId],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, targetItemId: number) => {
      e.preventDefault();

      const draggedId = parseInt(e.dataTransfer.getData("text/plain"), 10);
      if (isNaN(draggedId) || draggedId === targetItemId) {
        handleDragEnd();
        return;
      }

      // Find indices
      const draggedIndex = items.findIndex((item) => item.id === draggedId);
      const targetIndex = items.findIndex((item) => item.id === targetItemId);

      if (draggedIndex === -1 || targetIndex === -1) {
        handleDragEnd();
        return;
      }

      // Create new array with reordered items
      const newItems = [...items];
      const [draggedItem] = newItems.splice(draggedIndex, 1);

      // Calculate new target index after removal
      let newTargetIndex = targetIndex;
      if (draggedIndex < targetIndex) {
        newTargetIndex = targetIndex - 1;
      }

      // Insert at correct position
      if (dragOverPosition === "after") {
        newItems.splice(newTargetIndex + 1, 0, draggedItem);
      } else {
        newItems.splice(newTargetIndex, 0, draggedItem);
      }

      // Notify parent about reorder
      onReorder?.(newItems);
      handleDragEnd();
    },
    [items, dragOverPosition, onReorder, handleDragEnd],
  );

  if (items.length === 0) {
    return <p className="no-items">No items yet. Add your first item!</p>;
  }

  return (
    <div className={`items-list${isDraggable ? " drag-enabled" : ""}`}>
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          reservation={reservations.get(item.id)}
          categoryLabels={getCategoryLabels(item.category)}
          cdnDomain={cdnDomain}
          priceRub={convertToRub(item.price, exchangeRates)}
          isDraggable={isDraggable}
          isDragging={draggedItemId === item.id}
          dragOverPosition={
            dragOverItemId === item.id ? dragOverPosition : null
          }
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item.id, item.title)}
          onToggleReceived={() => onToggleReceived(item.id, item.received)}
          onToggleReserved={() =>
            onToggleReserved(item.id, reservations.has(item.id))
          }
          onDragStart={(e) => handleDragStart(e, item.id)}
          onDragEnd={handleDragEnd}
          onDragEnter={(e) => handleDragEnter(e, item.id)}
          onDragOver={(e) => handleDragOver(e, item.id)}
          onDragLeave={() => handleDragLeave(item.id)}
          onDrop={(e) => handleDrop(e, item.id)}
        />
      ))}
    </div>
  );
}
