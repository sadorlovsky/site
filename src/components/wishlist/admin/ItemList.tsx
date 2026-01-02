import type { WishlistItem, Reservation, Category } from "./types";

interface ItemListProps {
  items: WishlistItem[];
  reservations: Map<number, Reservation>;
  categories: Category[];
  cdnDomain: string;
  onEdit: (item: WishlistItem) => void;
  onDelete: (id: number) => Promise<void>;
  onToggleReceived: (id: number, received: boolean) => Promise<void>;
  onToggleReserved: (id: number, reserved: boolean) => Promise<void>;
}

interface ItemCardProps {
  item: WishlistItem;
  reservation: Reservation | undefined;
  categoryLabel: string;
  cdnDomain: string;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onToggleReceived: () => Promise<void>;
  onToggleReserved: () => Promise<void>;
}

function ItemCard({
  item,
  reservation,
  categoryLabel,
  cdnDomain,
  onEdit,
  onDelete,
  onToggleReceived,
  onToggleReserved,
}: ItemCardProps) {
  const isReserved = !!reservation;

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    await onDelete();
  };

  const itemClasses = [
    "item-card",
    isReserved ? "reserved" : "",
    item.received ? "received" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={itemClasses} data-item-id={item.id}>
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
        <div className="item-header">
          <h3>{item.title}</h3>
          <span className="item-price">{item.price}</span>
        </div>

        <div className="item-tags">
          <span className="tag tag-category">{categoryLabel}</span>
          {item.priority && (
            <span className={`tag tag-priority tag-priority-${item.priority}`}>
              {item.priority}
            </span>
          )}
          {item.weight > 0 && (
            <span className="tag tag-weight">w:{item.weight}</span>
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
            onClick={handleDelete}
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
  onEdit,
  onDelete,
  onToggleReceived,
  onToggleReserved,
}: ItemListProps) {
  const getCategoryLabel = (categoryId: string): string => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.label || categoryId;
  };

  if (items.length === 0) {
    return <p className="no-items">No items yet. Add your first item!</p>;
  }

  return (
    <div className="items-list">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          reservation={reservations.get(item.id)}
          categoryLabel={getCategoryLabel(item.category.split(",")[0])}
          cdnDomain={cdnDomain}
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item.id)}
          onToggleReceived={() => onToggleReceived(item.id, item.received)}
          onToggleReserved={() =>
            onToggleReserved(item.id, reservations.has(item.id))
          }
        />
      ))}
    </div>
  );
}
