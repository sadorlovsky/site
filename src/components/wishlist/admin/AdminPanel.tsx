import { useState, useCallback, useMemo, useEffect } from "react";
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

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "reserved" | "received"
  >("all");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  // Filtered items
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

    return result;
  }, [
    items,
    selectedStatus,
    selectedCategory,
    debouncedSearchQuery,
    reservations,
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

  return (
    <>
      <div className="admin-section">
        <div className="admin-toolbar">
          <button className="btn btn-primary" onClick={openAddModal}>
            + Add Item
          </button>

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
        </div>

        <ItemList
          items={filteredItems}
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
