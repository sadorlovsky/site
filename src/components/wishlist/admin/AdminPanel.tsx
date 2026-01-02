import { useState, useCallback } from "react";
import { ItemList } from "./ItemList";
import { ItemModal } from "./ItemModal";
import type {
  WishlistItem,
  Reservation,
  Category,
  ItemFormData,
} from "./types";

interface AdminPanelProps {
  initialItems: WishlistItem[];
  initialReservations: [number, Reservation][];
  categories: Category[];
  cdnDomain: string;
}

export function AdminPanel({
  initialItems,
  initialReservations,
  categories,
  cdnDomain,
}: AdminPanelProps) {
  const [items, setItems] = useState<WishlistItem[]>(initialItems);
  const [reservations] = useState<Map<number, Reservation>>(
    () => new Map(initialReservations),
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);

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

  return (
    <>
      <div className="admin-section">
        <button className="btn btn-primary add-item-btn" onClick={openAddModal}>
          + Add Item
        </button>

        <h2>All Items ({items.length})</h2>

        <ItemList
          items={items}
          reservations={reservations}
          categories={categories}
          cdnDomain={cdnDomain}
          onEdit={openEditModal}
          onDelete={handleDelete}
          onToggleReceived={handleToggleReceived}
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
    </>
  );
}
