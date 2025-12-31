/**
 * Admin Panel Client-Side Logic
 */

interface WishlistItem {
  id: number;
  title: string;
  titleRu: string | null;
  price: string;
  imageUrl: string;
  description: string | null;
  descriptionRu: string | null;
  url: string | null;
  category: string;
  priority: string | null;
  received: boolean;
  weight: number;
}

// Modal elements
let modal: HTMLElement | null = null;
let modalTitle: HTMLElement | null = null;
let form: HTMLFormElement | null = null;
let submitBtn: HTMLButtonElement | null = null;
let currentEditId: number | null = null;

// Image upload state
let uploadedFilename: string | null = null;

export function initializeAdmin() {
  modal = document.getElementById("item-modal");
  modalTitle = document.getElementById("modal-title");
  form = document.getElementById("item-form") as HTMLFormElement;
  submitBtn = document.getElementById("modal-submit") as HTMLButtonElement;

  if (!modal || !form) return;

  // Add Item button
  const addBtn = document.getElementById("add-item-btn");
  addBtn?.addEventListener("click", () => openModal());

  // Close modal
  modal.querySelector(".modal-close")?.addEventListener("click", closeModal);
  modal.querySelector(".modal-cancel")?.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // Form submit
  form.addEventListener("submit", handleSubmit);

  // Edit buttons
  document.querySelectorAll<HTMLButtonElement>(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const itemData = btn.dataset.item;
      if (itemData) {
        const item = JSON.parse(itemData) as WishlistItem;
        openModal(item);
      }
    });
  });

  // Delete buttons
  document.querySelectorAll<HTMLButtonElement>(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", () => handleDelete(btn));
  });

  // Toggle received buttons
  document
    .querySelectorAll<HTMLButtonElement>(".btn-toggle-received")
    .forEach((btn) => {
      btn.addEventListener("click", () => handleToggleReceived(btn));
    });

  // Image upload
  initializeImageUpload();
}

function initializeImageUpload() {
  const uploadArea = document.getElementById("image-upload");
  const fileInput = document.getElementById("image-file") as HTMLInputElement;
  const preview = document.getElementById("image-preview");
  const removeBtn = document.querySelector(".btn-remove-image");

  if (!uploadArea || !fileInput) return;

  // Click to upload
  uploadArea.addEventListener("click", () => fileInput.click());

  // Drag and drop
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
  });

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    const files = e.dataTransfer?.files;
    if (files?.length) {
      handleFileUpload(files[0]);
    }
  });

  // File input change
  fileInput.addEventListener("change", () => {
    if (fileInput.files?.length) {
      handleFileUpload(fileInput.files[0]);
    }
  });

  // Remove image button
  removeBtn?.addEventListener("click", () => {
    const imageUrlInput = document.getElementById(
      "imageUrl",
    ) as HTMLInputElement;
    const uploadP = uploadArea.querySelector("p");

    uploadedFilename = null;
    if (imageUrlInput) imageUrlInput.value = "";
    if (preview) preview.hidden = true;
    if (fileInput) fileInput.value = "";
    if (uploadP) uploadP.textContent = "Drop image here or click to upload";
  });
}

async function handleFileUpload(file: File) {
  const uploadArea = document.getElementById("image-upload");
  const preview = document.getElementById("image-preview");
  const previewImg = document.getElementById("preview-img") as HTMLImageElement;
  const filenameEl = document.getElementById("image-filename");
  const imageUrlInput = document.getElementById("imageUrl") as HTMLInputElement;

  if (!uploadArea || !preview || !previewImg || !filenameEl || !imageUrlInput)
    return;

  // Show loading state
  const originalText = uploadArea.querySelector("p")?.textContent;
  const uploadP = uploadArea.querySelector("p");
  if (uploadP) uploadP.textContent = "Uploading...";

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Upload failed");
    }

    // Update UI
    uploadedFilename = result.filename;
    imageUrlInput.value = result.filename;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target?.result as string;
      preview.hidden = false;
      filenameEl.textContent = result.filename;
    };
    reader.readAsDataURL(file);

    if (uploadP) uploadP.textContent = "Image uploaded! Click to change";
  } catch (error) {
    console.error("Upload error:", error);
    alert(error instanceof Error ? error.message : "Upload failed");
    if (uploadP && originalText) uploadP.textContent = originalText;
  }
}

function openModal(item?: WishlistItem) {
  if (!modal || !modalTitle || !form || !submitBtn) return;

  const preview = document.getElementById("image-preview");
  const previewImg = document.getElementById("preview-img") as HTMLImageElement;
  const filenameEl = document.getElementById("image-filename");
  const uploadP = document.querySelector("#image-upload p");

  // Reset form
  form.reset();
  uploadedFilename = null;
  if (preview) preview.hidden = true;
  if (uploadP) uploadP.textContent = "Drop image here or click to upload";

  if (item) {
    // Edit mode
    currentEditId = item.id;
    modalTitle.textContent = "Edit Item";
    submitBtn.textContent = "Save Changes";

    // Fill form
    (document.getElementById("item-id") as HTMLInputElement).value = String(
      item.id,
    );
    (document.getElementById("title") as HTMLInputElement).value = item.title;
    (document.getElementById("titleRu") as HTMLInputElement).value =
      item.titleRu || "";
    (document.getElementById("price") as HTMLInputElement).value = item.price;
    (document.getElementById("url") as HTMLInputElement).value = item.url || "";
    (document.getElementById("imageUrl") as HTMLInputElement).value =
      item.imageUrl;
    (document.getElementById("description") as HTMLTextAreaElement).value =
      item.description || "";
    (document.getElementById("descriptionRu") as HTMLTextAreaElement).value =
      item.descriptionRu || "";
    (document.getElementById("category") as HTMLSelectElement).value =
      item.category.split(",")[0];
    (document.getElementById("priority") as HTMLSelectElement).value =
      item.priority || "";
    (document.getElementById("weight") as HTMLInputElement).value = String(
      item.weight,
    );

    // Show current image
    if (preview && previewImg && filenameEl) {
      // Get CDN URL (we need to construct it)
      const cdnDomain =
        document.querySelector<HTMLMetaElement>('meta[name="cdn-domain"]')
          ?.content || "cdn.orlovsky.dev";
      previewImg.src = `https://${cdnDomain}/${item.imageUrl}`;
      filenameEl.textContent = item.imageUrl;
      preview.hidden = false;
      if (uploadP) uploadP.textContent = "Click to change image";
    }
  } else {
    // Add mode
    currentEditId = null;
    modalTitle.textContent = "Add Item";
    submitBtn.textContent = "Add Item";
    (document.getElementById("item-id") as HTMLInputElement).value = "";
  }

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove("active");
  document.body.style.overflow = "";
  currentEditId = null;
}

async function handleSubmit(e: Event) {
  e.preventDefault();

  if (!form || !submitBtn) return;

  const formData = new FormData(form);
  const data: Record<string, unknown> = {};

  // Collect form data
  data.title = formData.get("title");
  data.titleRu = formData.get("titleRu") || undefined;
  data.price = formData.get("price");
  data.imageUrl = formData.get("imageUrl");
  data.description = formData.get("description") || undefined;
  data.descriptionRu = formData.get("descriptionRu") || undefined;
  data.url = formData.get("url") || undefined;
  data.category = formData.get("category");
  data.priority = formData.get("priority") || undefined;
  data.weight = parseInt(formData.get("weight") as string, 10) || 0;

  // Validate required fields
  if (!data.title || !data.price || !data.imageUrl || !data.category) {
    alert("Please fill in all required fields");
    return;
  }

  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Saving...";

  try {
    const isEdit = currentEditId !== null;
    const url = isEdit
      ? `/api/admin/items/${currentEditId}`
      : "/api/admin/items";
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

    // Success - reload page to show changes
    window.location.reload();
  } catch (error) {
    console.error("Save error:", error);
    alert(error instanceof Error ? error.message : "Failed to save item");
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

async function handleDelete(btn: HTMLButtonElement) {
  const itemId = btn.dataset.itemId;
  if (!itemId) return;

  if (!confirm("Are you sure you want to delete this item?")) return;

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = "Deleting...";

  try {
    const response = await fetch(`/api/admin/items/${itemId}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to delete item");
    }

    // Remove item from DOM
    btn.closest("article")?.remove();
  } catch (error) {
    console.error("Delete error:", error);
    alert(error instanceof Error ? error.message : "Failed to delete item");
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function handleToggleReceived(btn: HTMLButtonElement) {
  const itemId = btn.dataset.itemId;
  const currentReceived = btn.dataset.received === "true";

  if (!itemId) return;

  btn.disabled = true;

  try {
    const response = await fetch(`/api/admin/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ received: !currentReceived }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to update item");
    }

    // Update UI
    btn.dataset.received = String(!currentReceived);
    btn.textContent = !currentReceived ? "✓" : "○";
    btn.title = !currentReceived ? "Unmark as received" : "Mark as received";

    const article = btn.closest("article");
    if (article) {
      article.classList.toggle("received", !currentReceived);
    }
  } catch (error) {
    console.error("Toggle received error:", error);
    alert(error instanceof Error ? error.message : "Failed to update item");
  } finally {
    btn.disabled = false;
  }
}
