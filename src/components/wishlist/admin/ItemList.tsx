import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { parsePrice } from "@lib/price";
import {
  insertionAt,
  isNoOpInsertion,
  applyMove,
  type CardBox,
  type Insertion,
} from "@lib/grid-reorder";
import type {
  WishlistItem,
  Reservation,
  Category,
  ExchangeRates,
} from "./types";

// Parse price string and convert to RUB. The parser is the one the public cards
// use — the dashboard had its own until it drifted (parseInt there, parseFloat
// here) and every price with cents in it came out short.
function convertToRub(
  price: string,
  exchangeRates: ExchangeRates,
): number | null {
  const parsed = parsePrice(price);
  if (!parsed) return null;

  const rate = exchangeRates[parsed.currency];
  if (!rate) return null;

  // parsePrice counts in cents; this row of the dashboard shows whole roubles.
  return Math.round((parsed.amount * rate) / 100);
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
  isKeyboardMoving: boolean;
  /** Which side of this card the insertion beam belongs on, if it is here. */
  dropEdge: "before" | "after" | null;
  onEdit: () => void;
  onDelete: () => void;
  onToggleReceived: () => Promise<void>;
  onToggleReserved: () => Promise<void>;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onGripPointerDown: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

function ItemCard({
  item,
  reservation,
  categoryLabels,
  cdnDomain,
  priceRub,
  isDraggable,
  isDragging,
  isKeyboardMoving,
  dropEdge,
  onEdit,
  onDelete,
  onToggleReceived,
  onToggleReserved,
  onDragStart,
  onDragEnd,
  onGripPointerDown,
  onKeyDown,
}: ItemCardProps) {
  const isReserved = !!reservation;

  const itemClasses = [
    "item-card",
    isReserved ? "reserved" : "",
    item.received ? "received" : "",
    isDraggable ? "draggable" : "",
    isDragging ? "dragging" : "",
    isKeyboardMoving ? "keyboard-moving" : "",
    dropEdge === "before" ? "drop-before" : "",
    dropEdge === "after" ? "drop-after" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      className={itemClasses}
      data-item-id={item.id}
      draggable={isDraggable}
      tabIndex={isDraggable ? 0 : undefined}
      role={isDraggable ? "listitem" : undefined}
      /* No aria-grabbed: it was dropped from ARIA years ago and screen readers
         no longer act on it. What it was reaching for — telling the owner where
         the card went — is the list's live region instead. */
      aria-roledescription={isDraggable ? "Sortable item" : undefined}
      aria-label={
        isDraggable
          ? `${item.title}. ${isKeyboardMoving ? "Moving. Arrow keys to move, Enter to drop, Escape to cancel." : "Press Space to start moving."}`
          : item.title
      }
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onKeyDown={onKeyDown}
    >
      {/* The grip, and the only thing that starts a drag. The card is
          `draggable` because HTML5 asks the drag source to be, but a press that
          began on Edit, on the photo, or on a title being selected is turned
          away in onDragStart — which is what used to fling a card across the
          grid on a twitchy click. */}
      {isDraggable && (
        <div
          className="item-grip"
          aria-hidden="true"
          title="Drag to reorder"
          onPointerDown={onGripPointerDown}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.6" />
            <circle cx="15" cy="6" r="1.6" />
            <circle cx="9" cy="12" r="1.6" />
            <circle cx="15" cy="12" r="1.6" />
            <circle cx="9" cy="18" r="1.6" />
            <circle cx="15" cy="18" r="1.6" />
          </svg>
        </div>
      )}

      <div className="item-image">
        <img
          src={`https://${cdnDomain}/${item.imageUrl}`}
          alt={item.title}
          loading="lazy"
          /* An <img> is draggable in its own right, so without this the photo
             starts an image drag of its own and the card never moves. */
          draggable={false}
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
          {/* The alternatives, in brief — the public card lists them in full,
              and the modal is where they get edited. */}
          {item.options.length > 0 && (
            <p className="item-options-summary">
              +{item.options.length} option
              {item.options.length > 1 ? "s" : ""}:{" "}
              {item.options.map((option) => option.price).join(" · ")}
            </p>
          )}
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
          {/* No weight badge. It read as a setting worth knowing back when a
              handful of items had one; now that every item carries a position
              it would sit on every card and say only what the card's own place
              in the list already says. */}
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
            title={isReserved ? "Remove reservation" : "Reserve item"}
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
            title={item.received ? "Mark as not received" : "Mark as received"}
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
            title="Delete item"
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
  const listRef = useRef<HTMLDivElement>(null);

  /* The grid, measured once when a drag begins. Nothing reflows during a native
     drag, and asking sixty cards for their rect on every dragover forced a
     layout per frame. Page coordinates rather than viewport ones, so the
     numbers survive the page scrolling under the cursor. */
  const boxesRef = useRef<CardBox[]>([]);

  /* Set while a press that started on a grip is still live. onDragStart reads
     it to decide whether this drag is one the panel asked for. */
  const fromGripRef = useRef(false);

  /* The order a keyboard move started from, so Escape can actually undo it. */
  const keyboardOriginRef = useRef<WishlistItem[] | null>(null);

  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [insertion, setInsertion] = useState<Insertion | null>(null);
  const [keyboardMovingId, setKeyboardMovingId] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");

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

  const draggedIndex =
    draggedId === null ? -1 : items.findIndex((item) => item.id === draggedId);

  /* One beam, in one gutter — the end of the gap the cursor is at, so it never
     leaps across the screen at a row boundary. And none at all when the drop
     would change nothing, so the feedback never promises a move it is going to
     throw away. */
  const beam = useMemo(() => {
    if (insertion === null || draggedIndex === -1) return null;
    if (isNoOpInsertion(draggedIndex, insertion.index)) return null;

    const card = items[insertion.card];
    return card ? { id: card.id, edge: insertion.edge } : null;
  }, [insertion, draggedIndex, items]);

  const measureCards = useCallback((): CardBox[] => {
    const list = listRef.current;
    if (!list) return [];

    const { scrollX, scrollY } = window;
    return Array.from(
      list.querySelectorAll<HTMLElement>("[data-item-id]"),
    ).map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left + scrollX,
        right: rect.right + scrollX,
        top: rect.top + scrollY,
        bottom: rect.bottom + scrollY,
      };
    });
  }, []);

  const endDrag = useCallback(() => {
    fromGripRef.current = false;
    boxesRef.current = [];
    setDraggedId(null);
    setInsertion(null);
  }, []);

  /* A press on a grip that never became a drag still has to let go. dragend
     covers the drags; this covers everything else. */
  useEffect(() => {
    const release = () => {
      fromGripRef.current = false;
    };
    document.addEventListener("pointerup", release);
    return () => document.removeEventListener("pointerup", release);
  }, []);

  const handleDragStart = useCallback(
    (e: React.DragEvent, itemId: number) => {
      if (!fromGripRef.current) {
        e.preventDefault();
        return;
      }

      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(itemId));

      boxesRef.current = measureCards();

      /* Held back a frame on purpose. The browser snapshots the card for the
         drag image at the end of this event, so marking it as lifted now hands
         the cursor a picture of the hole the card leaves behind. */
      requestAnimationFrame(() => setDraggedId(itemId));
    },
    [measureCards],
  );

  /* One dragover for the whole grid rather than one per card. The gutters
     between cards belong to no card, so the old per-card handler lost the
     cursor every time it crossed one and the marker strobed on the way past. */
  const handleListDragOver = useCallback(
    (e: React.DragEvent) => {
      if (draggedId === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setInsertion(insertionAt(boxesRef.current, e.pageX, e.pageY));
    },
    [draggedId],
  );

  const handleListDragLeave = useCallback((e: React.DragEvent) => {
    // dragleave bubbles up from every child; only the cursor leaving the grid
    // itself should put the beam out.
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    setInsertion(null);
  }, []);

  const handleListDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      if (draggedIndex !== -1 && insertion !== null) {
        const next = applyMove(items, draggedIndex, insertion.index);
        if (next) onReorder?.(next);
      }

      endDrag();
    },
    [draggedIndex, insertion, items, onReorder, endDrag],
  );

  /* How wide a row is, asked of the layout rather than of the media queries
     that decide it — the grid is six columns wide, or four, or three, or two,
     or one, and ArrowDown means "a row down" in every one of them. */
  const columnCount = useCallback(() => {
    const list = listRef.current;
    if (!list) return 1;

    const cards = Array.from(
      list.querySelectorAll<HTMLElement>("[data-item-id]"),
    );
    if (cards.length === 0) return 1;

    const top = cards[0].offsetTop;
    let columns = 0;
    while (columns < cards.length && cards[columns].offsetTop === top) {
      columns++;
    }
    return Math.max(1, columns);
  }, []);

  const moveByKeyboard = useCallback(
    (item: WishlistItem, delta: number) => {
      const from = items.findIndex((candidate) => candidate.id === item.id);
      if (from === -1) return;

      // Clamped rather than refused: ArrowDown on the last row should land the
      // card at the end, not do nothing because a whole row won't fit.
      const to = Math.min(items.length - 1, Math.max(0, from + delta));

      // applyMove counts gaps, not slots — landing *on* index `to` is the gap
      // before it going up, and the gap after it going down.
      const next = applyMove(items, from, to > from ? to + 1 : to);
      if (!next) {
        setAnnouncement(
          `${item.title} is already at position ${from + 1} of ${items.length}.`,
        );
        return;
      }

      onReorder?.(next);
      setAnnouncement(
        `${item.title}, position ${to + 1} of ${items.length}.`,
      );
    },
    [items, onReorder],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, item: WishlistItem) => {
      if (!isDraggable) return;

      const position = () =>
        items.findIndex((candidate) => candidate.id === item.id) + 1;

      if (e.key === " " || e.key === "Enter") {
        // Not when the focus is on one of the card's own buttons.
        if ((e.target as HTMLElement).closest("button")) return;
        e.preventDefault();

        if (keyboardMovingId === item.id) {
          keyboardOriginRef.current = null;
          setKeyboardMovingId(null);
          setAnnouncement(
            `${item.title} dropped at position ${position()} of ${items.length}.`,
          );
        } else {
          keyboardOriginRef.current = items;
          setKeyboardMovingId(item.id);
          setAnnouncement(
            `${item.title} picked up, position ${position()} of ${items.length}. Arrow keys to move, Enter to drop, Escape to cancel.`,
          );
        }
        return;
      }

      if (keyboardMovingId !== item.id) return;

      if (e.key === "Escape") {
        e.preventDefault();

        /* A cancel that cancels. The card's own label has always offered this,
           and the handler behind it only stopped moving — every step taken on
           the way stayed exactly where the arrow keys had put it. */
        const origin = keyboardOriginRef.current;
        if (
          origin &&
          origin.some((candidate, i) => candidate.id !== items[i]?.id)
        ) {
          onReorder?.(origin);
        }

        keyboardOriginRef.current = null;
        setKeyboardMovingId(null);
        setAnnouncement(`Move cancelled. ${item.title} is back where it was.`);
        return;
      }

      const columns = columnCount();
      const delta =
        e.key === "ArrowLeft"
          ? -1
          : e.key === "ArrowRight"
            ? 1
            : e.key === "ArrowUp"
              ? -columns
              : e.key === "ArrowDown"
                ? columns
                : 0;

      if (delta === 0) return;
      e.preventDefault();
      moveByKeyboard(item, delta);
    },
    [isDraggable, keyboardMovingId, items, onReorder, columnCount, moveByKeyboard],
  );

  if (items.length === 0) {
    return <p className="no-items">No items yet. Add your first item!</p>;
  }

  const listClasses = [
    "items-list",
    draggedId !== null ? "is-sorting" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {/* Where a keyboard move says what it did. A drag has the beam to look
          at; the arrow keys had nothing at all. */}
      {isDraggable && (
        <div className="drag-live-region" role="status" aria-live="polite">
          {announcement}
        </div>
      )}

      <div
        ref={listRef}
        className={listClasses}
        role={isDraggable ? "list" : undefined}
        aria-label={isDraggable ? "Reorderable items list" : undefined}
        onDragOver={isDraggable ? handleListDragOver : undefined}
        onDragLeave={isDraggable ? handleListDragLeave : undefined}
        onDrop={isDraggable ? handleListDrop : undefined}
      >
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            reservation={reservations.get(item.id)}
            categoryLabels={getCategoryLabels(item.category)}
            cdnDomain={cdnDomain}
            priceRub={convertToRub(item.price, exchangeRates)}
            isDraggable={isDraggable}
            isDragging={draggedId === item.id}
            isKeyboardMoving={keyboardMovingId === item.id}
            dropEdge={beam?.id === item.id ? beam.edge : null}
            onEdit={() => onEdit(item)}
            onDelete={() => onDelete(item.id, item.title)}
            onToggleReceived={() => onToggleReceived(item.id, item.received)}
            onToggleReserved={() =>
              onToggleReserved(item.id, reservations.has(item.id))
            }
            onDragStart={(e) => handleDragStart(e, item.id)}
            onDragEnd={endDrag}
            onGripPointerDown={() => {
              fromGripRef.current = true;
            }}
            onKeyDown={(e) => handleKeyDown(e, item)}
          />
        ))}
      </div>
    </>
  );
}
