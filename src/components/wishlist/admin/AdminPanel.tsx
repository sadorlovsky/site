import { useState, useCallback, useMemo, useEffect } from "react";
import { ItemList } from "./ItemList";
import { ItemModal } from "./ItemModal";
import type {
  WishlistItem,
  Reservation,
  Category,
  ItemFormData,
  ExchangeRates,
} from "./types";

interface AdminPanelProps {
  initialItems: WishlistItem[];
  initialReservations: [number, Reservation][];
  categories: Category[];
  cdnDomain: string;
  exchangeRates: ExchangeRates;
}

export function AdminPanel({
  initialItems,
  initialReservations,
  categories,
  cdnDomain,
  exchangeRates,
}: AdminPanelProps) {
  const [items, setItems] = useState<WishlistItem[]>(initialItems);
  const [reservations, setReservations] = useState<Map<number, Reservation>>(
    () => new Map(initialReservations),
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [showReservationsModal, setShowReservationsModal] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "reserved" | "received"
  >("all");
  const [sortMode, setSortMode] = useState<"admin" | "public">("admin");
  const [reorderedItems, setReorderedItems] = useState<WishlistItem[] | null>(
    null,
  );
  const [isSavingWeights, setIsSavingWeights] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset reordered items when switching sort mode or filters
  useEffect(() => {
    setReorderedItems(null);
  }, [sortMode, selectedCategory, selectedStatus, debouncedSearchQuery]);

  // Filter categories (exclude "all" for the dropdown, but keep for filter logic)
  const filterCategories = useMemo(
    () => categories.filter((c) => c.id !== "all"),
    [categories],
  );

  // Get category label by id
  const getCategoryLabel = useCallback(
    (categoryId: string) => {
      const cat = categories.find((c) => c.id === categoryId);
      return cat?.label || categoryId;
    },
    [categories],
  );

  // Group reservations by user
  const reservationsByUser = useMemo(() => {
    const grouped = new Map<
      string,
      { reservation: Reservation; item: WishlistItem }[]
    >();

    reservations.forEach((reservation) => {
      const item = items.find((i) => i.id === reservation.itemId);
      if (!item) return;

      const user = reservation.reservedBy;
      if (!grouped.has(user)) {
        grouped.set(user, []);
      }
      grouped.get(user)!.push({ reservation, item });
    });

    // Sort by user name
    return new Map(
      [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    );
  }, [reservations, items]);

  // Priority order for public sorting
  const priorityOrder: Record<string, number> = useMemo(
    () => ({ high: 0, medium: 1, low: 2 }),
    [],
  );

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    let result = items;

    // Filter by status
    if (selectedStatus === "received") {
      result = result.filter((item) => item.received);
    } else if (selectedStatus === "reserved") {
      result = result.filter(
        (item) => !item.received && reservations.has(item.id),
      );
    }

    // Filter by category
    if (selectedCategory !== "all") {
      result = result.filter((item) => {
        const itemCategories = item.category.split(",").map((c) => c.trim());
        return itemCategories.includes(selectedCategory);
      });
    }

    // Filter by search query (using debounced value)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.titleRu?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.descriptionRu?.toLowerCase().includes(query),
      );
    }

    // Sort based on mode
    result = [...result].sort((a, b) => {
      if (sortMode === "public") {
        // Public sorting: received last → priority → weight → createdAt
        if (a.received && !b.received) return 1;
        if (!a.received && b.received) return -1;

        const aPriority = a.priority ? (priorityOrder[a.priority] ?? 3) : 3;
        const bPriority = b.priority ? (priorityOrder[b.priority] ?? 3) : 3;
        if (aPriority !== bPriority) return aPriority - bPriority;

        if (a.weight !== b.weight) return b.weight - a.weight;

        return b.createdAt.getTime() - a.createdAt.getTime();
      } else {
        // Admin sorting: reserved first → createdAt (newest first)
        const aReserved = reservations.has(a.id);
        const bReserved = reservations.has(b.id);

        if (aReserved && !bReserved) return -1;
        if (!aReserved && bReserved) return 1;

        return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

    return result;
  }, [
    items,
    selectedStatus,
    selectedCategory,
    debouncedSearchQuery,
    reservations,
    sortMode,
    priorityOrder,
  ]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      debouncedSearchQuery.trim().length > 0 ||
      selectedCategory !== "all" ||
      selectedStatus !== "all"
    );
  }, [debouncedSearchQuery, selectedCategory, selectedStatus]);

  // Build filter description
  const filterDescription = useMemo(() => {
    const hasSearch = debouncedSearchQuery.trim().length > 0;
    const hasCategory = selectedCategory !== "all";
    const hasStatus = selectedStatus !== "all";

    // No filters active
    if (!hasSearch && !hasCategory && !hasStatus) {
      return `All Items (${items.length})`;
    }

    // Build description parts
    const parts: string[] = [];

    // Status part
    if (hasStatus) {
      parts.push(
        selectedStatus === "received" ? "only received" : "only reserved",
      );
    }

    // Search part
    if (hasSearch) {
      parts.push(`matching '${debouncedSearchQuery.trim()}'`);
    }

    // Category part
    if (hasCategory) {
      parts.push(`in ${getCategoryLabel(selectedCategory)}`);
    }

    // Combine parts
    const description = parts.join(", ");
    return `Showing ${filteredItems.length} of ${items.length} items, ${description}`;
  }, [
    items.length,
    filteredItems.length,
    debouncedSearchQuery,
    selectedCategory,
    selectedStatus,
    getCategoryLabel,
  ]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setSelectedCategory("all");
    setSelectedStatus("all");
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: WishlistItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSave = useCallback(async (data: ItemFormData, id?: number) => {
    const isEdit = id !== undefined;
    const url = isEdit ? `/api/admin/items/${id}` : "/api/admin/items";
    const method = isEdit ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to save item");
    }

    // Reload page to get fresh data from server
    window.location.reload();
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    const response = await fetch(`/api/admin/items/${id}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to delete item");
    }

    // Remove item from state
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleToggleReceived = useCallback(
    async (id: number, currentReceived: boolean) => {
      const response = await fetch(`/api/admin/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ received: !currentReceived }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update item");
      }

      // Update item in state
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, received: !currentReceived } : item,
        ),
      );
    },
    [],
  );

  const handleToggleReserved = useCallback(
    async (id: number, currentlyReserved: boolean) => {
      const response = await fetch(`/api/admin/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reserved: !currentlyReserved }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update reservation");
      }

      // Update reservations in state
      setReservations((prev) => {
        const newMap = new Map(prev);
        if (!currentlyReserved) {
          newMap.set(id, {
            itemId: id,
            reservedBy: "admin",
            reservedAt: new Date(),
          });
        } else {
          newMap.delete(id);
        }
        return newMap;
      });
    },
    [],
  );

  // Handle reorder from drag-and-drop
  const handleReorder = useCallback((newOrderedItems: WishlistItem[]) => {
    setReorderedItems(newOrderedItems);
  }, []);

  // Calculate new weights based on position
  const calculateNewWeights = useCallback((orderedItems: WishlistItem[]) => {
    // Group by priority, then assign weights within each group
    // Higher position = higher weight
    const weightChanges: { id: number; weight: number }[] = [];

    // Filter to non-received items only (received items don't need weights)
    const activeItems = orderedItems.filter((item) => !item.received);

    // Assign weights based on position (higher index = lower weight for same priority)
    // We'll use a simple approach: position in list = weight (reversed)
    const maxWeight = activeItems.length;

    activeItems.forEach((item, index) => {
      const newWeight = maxWeight - index;
      if (item.weight !== newWeight) {
        weightChanges.push({ id: item.id, weight: newWeight });
      }
    });

    return weightChanges;
  }, []);

  // Save weight changes to database
  const handleSaveWeights = useCallback(async () => {
    if (!reorderedItems) return;

    const weightChanges = calculateNewWeights(reorderedItems);

    if (weightChanges.length === 0) {
      setReorderedItems(null);
      return;
    }

    setIsSavingWeights(true);

    try {
      // Update each item's weight
      const updatePromises = weightChanges.map(({ id, weight }) =>
        fetch(`/api/admin/items/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weight }),
        }),
      );

      const results = await Promise.all(updatePromises);

      // Check for errors
      const failedUpdates = results.filter((r) => !r.ok);
      if (failedUpdates.length > 0) {
        throw new Error(`Failed to update ${failedUpdates.length} items`);
      }

      // Update local state with new weights
      setItems((prev) =>
        prev.map((item) => {
          const change = weightChanges.find((c) => c.id === item.id);
          return change ? { ...item, weight: change.weight } : item;
        }),
      );

      setReorderedItems(null);
    } catch (error) {
      console.error("Failed to save weights:", error);
      alert("Failed to save weight changes. Please try again.");
    } finally {
      setIsSavingWeights(false);
    }
  }, [reorderedItems, calculateNewWeights]);

  // Discard weight changes
  const handleDiscardWeights = useCallback(() => {
    setReorderedItems(null);
  }, []);

  return (
    <>
      <div className="admin-section">
        <div className="admin-toolbar">
          <div className="toolbar-actions">
            <button className="btn btn-primary" onClick={openAddModal}>
              + Add Item
            </button>
            {reservations.size > 0 && (
              <button
                className="btn btn-secondary"
                onClick={() => setShowReservationsModal(true)}
              >
                Reservations ({reservations.size})
              </button>
            )}
          </div>

          <div className="admin-filters">
            <input
              type="text"
              className="filter-search"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <select
              className="select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {filterCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>

            <div
              className="status-toggle"
              role="group"
              aria-label="Filter by status"
            >
              <button
                type="button"
                className={`status-toggle-btn${selectedStatus === "all" ? " active" : ""}`}
                onClick={() => setSelectedStatus("all")}
                aria-pressed={selectedStatus === "all"}
              >
                All
              </button>
              <button
                type="button"
                className={`status-toggle-btn${selectedStatus === "reserved" ? " active" : ""}`}
                onClick={() => setSelectedStatus("reserved")}
                aria-pressed={selectedStatus === "reserved"}
              >
                Reserved
              </button>
              <button
                type="button"
                className={`status-toggle-btn${selectedStatus === "received" ? " active" : ""}`}
                onClick={() => setSelectedStatus("received")}
                aria-pressed={selectedStatus === "received"}
              >
                Received
              </button>
            </div>

            <div className="sort-toggle" role="group" aria-label="Sort mode">
              <button
                type="button"
                className={`sort-toggle-btn${sortMode === "admin" ? " active" : ""}`}
                onClick={() => setSortMode("admin")}
                aria-pressed={sortMode === "admin"}
                title="Reserved first, then newest"
              >
                Admin
              </button>
              <button
                type="button"
                className={`sort-toggle-btn${sortMode === "public" ? " active" : ""}`}
                onClick={() => setSortMode("public")}
                aria-pressed={sortMode === "public"}
                title="Priority → Weight → Newest (as on public page)"
              >
                Public
              </button>
            </div>
          </div>
        </div>

        <div className="filter-header">
          <h2>{filterDescription}</h2>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          )}
          {reorderedItems && (
            <div className="weight-actions">
              <span className="weight-hint">Drag to reorder, then save</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleDiscardWeights}
                disabled={isSavingWeights}
              >
                Discard
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSaveWeights}
                disabled={isSavingWeights}
              >
                {isSavingWeights ? "Saving..." : "Save Order"}
              </button>
            </div>
          )}
        </div>

        <ItemList
          items={reorderedItems || filteredItems}
          reservations={reservations}
          categories={categories}
          cdnDomain={cdnDomain}
          exchangeRates={exchangeRates}
          isDraggable={sortMode === "public" && !hasActiveFilters}
          onEdit={openEditModal}
          onDelete={handleDelete}
          onToggleReceived={handleToggleReceived}
          onToggleReserved={handleToggleReserved}
          onReorder={handleReorder}
        />
      </div>

      <ItemModal
        isOpen={isModalOpen}
        item={editingItem}
        categories={categories}
        cdnDomain={cdnDomain}
        onClose={closeModal}
        onSave={handleSave}
      />

      {/* Reservations Modal */}
      {showReservationsModal && (
        <div
          className="modal-overlay active"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowReservationsModal(false);
            }
          }}
        >
          <div className="modal reservations-modal">
            <div className="modal-header">
              <h2>Reservations by User</h2>
              <button
                className="modal-close"
                type="button"
                onClick={() => setShowReservationsModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              {reservationsByUser.size === 0 ? (
                <p className="no-items">No reservations yet.</p>
              ) : (
                <div className="reservations-list">
                  {[...reservationsByUser.entries()].map(([user, items]) => (
                    <div key={user} className="reservation-group">
                      <div className="reservation-user">
                        <span className="user-name">
                          {user === "admin" ? "Admin" : user}
                        </span>
                        <span className="user-count">
                          {items.length} item{items.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="reservation-items">
                        {items.map(({ item }) => (
                          <div key={item.id} className="reservation-item">
                            <img
                              src={`https://${cdnDomain}/${item.imageUrl}`}
                              alt={item.title}
                            />
                            <div className="reservation-item-info">
                              <span className="reservation-item-title">
                                {item.title}
                              </span>
                              <span className="reservation-item-price">
                                {item.price}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
