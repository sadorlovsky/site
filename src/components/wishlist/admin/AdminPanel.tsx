import { useState, useCallback, useEffect } from "react";
import { ItemList } from "./ItemList";
import { ItemModal } from "./ItemModal";
import { ToastProvider, useToast } from "./Toast";
import { ConfirmDialog } from "./ConfirmDialog";
import { ReservationsModal } from "./ReservationsModal";
import { useFilters } from "./useFilters";
import { useReorder } from "./useReorder";
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

// Inner component that uses toast context
function AdminPanelInner({
  initialItems,
  initialReservations,
  categories,
  cdnDomain,
  exchangeRates,
}: AdminPanelProps) {
  const { showToast } = useToast();

  const [items, setItems] = useState<WishlistItem[]>(initialItems);
  const [reservations, setReservations] = useState<Map<number, Reservation>>(
    () => new Map(initialReservations),
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [showReservationsModal, setShowReservationsModal] = useState(false);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // Use filters hook
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedStatus,
    setSelectedStatus,
    sortMode,
    setSortMode,
    filteredItems,
    filterCategories,
    hasActiveFilters,
    filterDescription,
    clearFilters,
  } = useFilters({ items, reservations, categories });

  // Use reorder hook
  const {
    reorderedItems,
    isSavingWeights,
    handleReorder,
    handleSaveWeights,
    handleDiscardWeights,
    resetOnFilterChange,
  } = useReorder(items, setItems, {
    onSuccess: () => showToast("Order saved successfully", "success"),
    onError: (error) => showToast(error, "error"),
  });

  // Reset reordered items when switching sort mode or filters
  useEffect(() => {
    resetOnFilterChange();
  }, [
    sortMode,
    selectedCategory,
    selectedStatus,
    searchQuery,
    resetOnFilterChange,
  ]);

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

  const handleSave = useCallback(
    async (data: ItemFormData, id?: number) => {
      const isEdit = id !== undefined;
      const url = isEdit ? `/api/~/items/${id}` : "/api/~/items";
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

      // Update state locally instead of reloading
      if (isEdit) {
        // Update existing item
        setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...data,
                  titleRu: data.titleRu || null,
                  description: data.description || null,
                  descriptionRu: data.descriptionRu || null,
                  url: data.url || null,
                  priority: data.priority || null,
                }
              : item,
          ),
        );
      } else {
        // Add new item
        const newItem: WishlistItem = {
          id: result.id,
          title: data.title,
          titleRu: data.titleRu || null,
          price: data.price,
          imageUrl: data.imageUrl,
          description: data.description || null,
          descriptionRu: data.descriptionRu || null,
          url: data.url || null,
          category: data.category,
          priority: data.priority || null,
          weight: data.weight ?? 0,
          received: false,
          createdAt: new Date(),
        };
        setItems((prev) => [newItem, ...prev]);
      }

      closeModal();
      showToast(isEdit ? "Item updated" : "Item created", "success");
    },
    [showToast],
  );

  // Request delete confirmation
  const requestDelete = useCallback(
    (id: number, title: string) => {
      setConfirmDialog({
        isOpen: true,
        title: "Delete Item",
        message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
        onConfirm: async () => {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          try {
            const response = await fetch(`/api/~/items/${id}`, {
              method: "DELETE",
            });

            const result = await response.json();

            if (!response.ok) {
              throw new Error(result.error || "Failed to delete item");
            }

            // Remove item from state
            setItems((prev) => prev.filter((item) => item.id !== id));
            showToast("Item deleted successfully", "success");
          } catch (error) {
            showToast(
              error instanceof Error ? error.message : "Failed to delete item",
              "error",
            );
          }
        },
      });
    },
    [showToast],
  );

  const handleToggleReceived = useCallback(
    async (id: number, currentReceived: boolean) => {
      try {
        const response = await fetch(`/api/~/items/${id}`, {
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
        showToast(
          currentReceived ? "Marked as not received" : "Marked as received",
          "success",
        );
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : "Failed to update item",
          "error",
        );
      }
    },
    [showToast],
  );

  const handleToggleReserved = useCallback(
    async (id: number, currentlyReserved: boolean) => {
      try {
        const response = await fetch(`/api/~/items/${id}`, {
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
        showToast(
          currentlyReserved ? "Reservation removed" : "Item reserved",
          "success",
        );
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : "Failed to update reservation",
          "error",
        );
      }
    },
    [showToast],
  );

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
          onDelete={requestDelete}
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

      <ReservationsModal
        isOpen={showReservationsModal}
        reservations={reservations}
        items={items}
        cdnDomain={cdnDomain}
        onClose={() => setShowReservationsModal(false)}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </>
  );
}

// Wrapper component with ToastProvider
export function AdminPanel(props: AdminPanelProps) {
  return (
    <ToastProvider>
      <AdminPanelInner {...props} />
    </ToastProvider>
  );
}
