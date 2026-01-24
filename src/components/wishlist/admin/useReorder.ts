import { useState, useCallback, useEffect } from "react";
import type { WishlistItem } from "./types";

interface UseReorderOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface UseReorderResult {
  reorderedItems: WishlistItem[] | null;
  isSavingWeights: boolean;
  handleReorder: (newOrderedItems: WishlistItem[]) => void;
  handleSaveWeights: () => Promise<void>;
  handleDiscardWeights: () => void;
  resetOnFilterChange: () => void;
}

export function useReorder(
  items: WishlistItem[],
  setItems: React.Dispatch<React.SetStateAction<WishlistItem[]>>,
  options: UseReorderOptions = {}
): UseReorderResult {
  const { onSuccess, onError } = options;

  const [reorderedItems, setReorderedItems] = useState<WishlistItem[] | null>(
    null
  );
  const [isSavingWeights, setIsSavingWeights] = useState(false);

  // Handle reorder from drag-and-drop
  const handleReorder = useCallback((newOrderedItems: WishlistItem[]) => {
    setReorderedItems(newOrderedItems);
  }, []);

  // Reset reordered items (call when filters change)
  const resetOnFilterChange = useCallback(() => {
    setReorderedItems(null);
  }, []);

  // Calculate new weights based on position
  const calculateNewWeights = useCallback((orderedItems: WishlistItem[]) => {
    const weightChanges: { id: number; weight: number }[] = [];

    // Filter to non-received items only (received items don't need weights)
    const activeItems = orderedItems.filter((item) => !item.received);

    // Assign weights based on position (higher index = lower weight for same priority)
    const maxWeight = activeItems.length;

    activeItems.forEach((item, index) => {
      const newWeight = maxWeight - index;
      if (item.weight !== newWeight) {
        weightChanges.push({ id: item.id, weight: newWeight });
      }
    });

    return weightChanges;
  }, []);

  // Save weight changes to database using batch endpoint
  const handleSaveWeights = useCallback(async () => {
    if (!reorderedItems) return;

    const weightChanges = calculateNewWeights(reorderedItems);

    if (weightChanges.length === 0) {
      setReorderedItems(null);
      return;
    }

    setIsSavingWeights(true);

    try {
      // Use batch endpoint for efficient update
      const response = await fetch("/api/admin/items/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: weightChanges }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update weights");
      }

      // Update local state with new weights
      setItems((prev) =>
        prev.map((item) => {
          const change = weightChanges.find((c) => c.id === item.id);
          return change ? { ...item, weight: change.weight } : item;
        })
      );

      setReorderedItems(null);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save weights:", error);
      onError?.(error instanceof Error ? error.message : "Failed to save order");
    } finally {
      setIsSavingWeights(false);
    }
  }, [reorderedItems, calculateNewWeights, setItems, onSuccess, onError]);

  // Discard weight changes
  const handleDiscardWeights = useCallback(() => {
    setReorderedItems(null);
  }, []);

  return {
    reorderedItems,
    isSavingWeights,
    handleReorder,
    handleSaveWeights,
    handleDiscardWeights,
    resetOnFilterChange,
  };
}
