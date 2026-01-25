import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { WishlistItem, ItemFormData, Category } from "./types";

interface ItemModalProps {
  isOpen: boolean;
  item: WishlistItem | null;
  categories: Category[];
  cdnDomain: string;
  onClose: () => void;
  onSave: (data: ItemFormData, id?: number) => Promise<void>;
}

export function ItemModal({
  isOpen,
  item,
  categories,
  cdnDomain,
  onClose,
  onSave,
}: ItemModalProps) {
  // Filter out "all" category - memoized to avoid infinite loop
  const itemCategories = useMemo(
    () => categories.filter((c) => c.id !== "all"),
    [categories],
  );

  const [formData, setFormData] = useState<ItemFormData>(() => ({
    title: "",
    titleRu: "",
    price: "",
    imageUrl: "",
    description: "",
    descriptionRu: "",
    url: "",
    category: "",
    priority: "",
    weight: 0,
  }));

  // Selected categories as array for multi-select
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset form when modal opens or item changes
  useEffect(() => {
    if (!isOpen) return;

    if (item) {
      const cats = item.category
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      setFormData({
        title: item.title,
        titleRu: item.titleRu || "",
        price: item.price,
        imageUrl: item.imageUrl,
        description: item.description || "",
        descriptionRu: item.descriptionRu || "",
        url: item.url || "",
        category: item.category,
        priority: item.priority || "",
        weight: item.weight,
      });
      setSelectedCategories(cats);
      setImagePreview(`https://${cdnDomain}/${item.imageUrl}`);
    } else {
      setFormData({
        title: "",
        titleRu: "",
        price: "",
        imageUrl: "",
        description: "",
        descriptionRu: "",
        url: "",
        category: "",
        priority: "",
        weight: 0,
      });
      setSelectedCategories([]);
      setImagePreview(null);
    }
  }, [isOpen, item, cdnDomain]);

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "weight" ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((c) => c !== categoryId);
      }
      return [...prev, categoryId];
    });
  };

  const handleFileUpload = useCallback(async (file: File) => {
    setIsUploading(true);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      const response = await fetch("/api/~/upload", {
        method: "POST",
        body: formDataUpload,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      setFormData((prev) => ({ ...prev, imageUrl: result.filename }));

      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer?.files;
      if (files?.length) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, imageUrl: "" }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.title ||
      !formData.price ||
      !formData.imageUrl ||
      selectedCategories.length === 0
    ) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSaving(true);

    try {
      const dataToSave = {
        ...formData,
        category: selectedCategories.join(", "),
      };
      await onSave(dataToSave, item?.id);
    } catch (error) {
      console.error("Save error:", error);
      alert(error instanceof Error ? error.message : "Failed to save item");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className={`modal-overlay ${isOpen ? "active" : ""}`}
      onClick={handleOverlayClick}
    >
      <div className="modal">
        <div className="modal-header">
          <h2>{item ? "Edit Item" : "Add Item"}</h2>
          <button className="modal-close" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <form id="item-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="title">Title (EN) *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="titleRu">Title (RU)</label>
                <input
                  type="text"
                  id="titleRu"
                  name="titleRu"
                  value={formData.titleRu}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="price">Price *</label>
                <input
                  type="text"
                  id="price"
                  name="price"
                  placeholder="$64, €300, AU$140"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="url">Product URL</label>
                <input
                  type="url"
                  id="url"
                  name="url"
                  placeholder="https://..."
                  value={formData.url}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Image *</label>
              <div className="image-upload-wrapper">
                <div
                  className={`image-upload${isDragging ? " dragover" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <p>
                    {isUploading
                      ? "Uploading..."
                      : imagePreview
                        ? "Click to change image"
                        : "Drop image here or click to upload"}
                  </p>
                </div>

                {imagePreview && (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Preview" />
                    <div className="image-preview-info">
                      <span>{formData.imageUrl}</span>
                      <button
                        type="button"
                        className="btn-remove-image"
                        title="Remove image"
                        onClick={handleRemoveImage}
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="description">Description (EN)</label>
                <textarea
                  id="description"
                  name="description"
                  rows={2}
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="descriptionRu">Description (RU)</label>
                <textarea
                  id="descriptionRu"
                  name="descriptionRu"
                  rows={2}
                  value={formData.descriptionRu}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Categories *</label>
              <div className="category-checkboxes">
                {itemCategories.map((cat) => (
                  <label key={cat.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat.id)}
                      onChange={() => handleCategoryToggle(cat.id)}
                    />
                    <span className="checkbox-text">{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="priority">Priority</label>
                <select
                  id="priority"
                  name="priority"
                  className="select"
                  value={formData.priority}
                  onChange={handleInputChange}
                >
                  <option value="">None</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="weight">Weight (higher = more important)</label>
                <input
                  type="number"
                  id="weight"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  min={0}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="item-form"
            className="btn btn-primary"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : item ? "Save Changes" : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  );
}
