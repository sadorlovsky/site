import { useState, useCallback, useMemo, useEffect } from "react";
import { comparePublic, compareAdmin } from "@lib/wishlist-sort";
import type { WishlistItem, Reservation, Category } from "./types";

type StatusFilter = "all" | "reserved" | "received";
type SortMode = "admin" | "public";

interface UseFiltersOptions {
  items: WishlistItem[];
  reservations: Map<number, Reservation>;
  categories: Category[];
}

interface UseFiltersResult {
  // Filter state
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedStatus: StatusFilter;
  setSelectedStatus: (status: StatusFilter) => void;
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;

  // Computed values
  filteredItems: WishlistItem[];
  filterCategories: Category[];
  hasActiveFilters: boolean;
  filterDescription: string;

  // Actions
  clearFilters: () => void;
  getCategoryLabel: (categoryId: string) => string;
}

export function useFilters({
  items,
  reservations,
  categories,
}: UseFiltersOptions): UseFiltersResult {
  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("admin");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter categories (exclude "all" for the dropdown)
  const filterCategories = useMemo(
    () => categories.filter((c) => c.id !== "all"),
    [categories]
  );

  // Get category label by id
  const getCategoryLabel = useCallback(
    (categoryId: string) => {
      const cat = categories.find((c) => c.id === categoryId);
      return cat?.label || categoryId;
    },
    [categories]
  );

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    let result = items;

    // Filter by status
    if (selectedStatus === "received") {
      result = result.filter((item) => item.received);
    } else if (selectedStatus === "reserved") {
      result = result.filter(
        (item) => !item.received && reservations.has(item.id)
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
          item.descriptionRu?.toLowerCase().includes(query)
      );
    }

    // "public" previews the visitor's order — the one dragging edits; "admin"
    // is the owner's working order. Both comparators are shared with the pages
    // that render them, so this preview cannot drift from the real thing.
    result = [...result].sort(
      sortMode === "public"
        ? comparePublic(reservations)
        : compareAdmin(reservations)
    );

    return result;
  }, [
    items,
    selectedStatus,
    selectedCategory,
    debouncedSearchQuery,
    reservations,
    sortMode,
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
        selectedStatus === "received" ? "only received" : "only reserved"
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

  return {
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
    getCategoryLabel,
  };
}
