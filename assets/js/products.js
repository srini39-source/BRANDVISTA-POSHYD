/* ==========================================================================
   Products page logic — table rendering, search/filter, row selection with
   bulk action bar, and the Add/Edit Product slide-over panel.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Catalog data ----------
     Loaded from (and saved back to) the shared localStorage-backed product
     store in app.js, so anything added/edited/deleted here is immediately
     visible on the POS Billing screen and vice versa. */
  let products = BrandVista.getProducts();

  function persistProducts() {
    BrandVista.saveProducts(products);
  }

  const tbody = document.getElementById('productsTableBody');
  const searchInput = document.getElementById('productSearch');
  const filterCategory = document.getElementById('filterCategory');
  const filterStatus = document.getElementById('filterStatus');
  const selectAll = document.getElementById('selectAll');
  const bulkBar = document.getElementById('bulkBar');
  const bulkCount = document.getElementById('bulkCount');

  // Populate the category filter (keeps its "All categories" option) and the
  // Add/Edit slide-over's category picker from the shared category store, so
  // any category added on the Categories page shows up here automatically.
  function refreshCategoryDropdowns() {
    const categories = BrandVista.getCategories();
    const currentFilter = filterCategory.value;
    filterCategory.innerHTML = '<option value="">All categories</option>' +
      categories.map((c) => `<option>${c.name}</option>`).join('');
    if (categories.some((c) => c.name === currentFilter)) filterCategory.value = currentFilter;

    BrandVista.populateCategorySelect(document.getElementById('pCategory'));
  }
  refreshCategoryDropdowns();

  const statusMap = {
    active: { label: 'Active', cls: 'badge-success' },
    low: { label: 'Low Stock', cls: 'badge-warning' },
    out: { label: 'Out of Stock', cls: 'badge-danger' },
  };

  function stockBarColor(p) {
    if (p.status === 'out') return 'var(--color-danger)';
    if (p.status === 'low') return 'var(--color-warning)';
    return 'var(--color-success)';
  }

  function render() {
    const q = searchInput.value.trim().toLowerCase();
    const cat = filterCategory.value;
    const statusFilterMap = { 'Active': 'active', 'Low Stock': 'low', 'Out of Stock': 'out' };
    const status = statusFilterMap[filterStatus.value];

    const filtered = products.filter((p) => {
      const matchesQ = !q || p.name.toLowerCase().includes(q) || p.barcode.includes(q);
      const matchesCat = !cat || p.category === cat;
      const matchesStatus = !status || p.status === status;
      return matchesQ && matchesCat && matchesStatus;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <h4>No products found</h4><p>Try adjusting your search or filters.</p>
      </div></td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((p) => {
      const st = statusMap[p.status];
      const pct = Math.min(100, Math.round((p.stock / (p.low * 2 || 1)) * 100));
      return `
      <tr data-id="${p.id}">
        <td class="checkbox-cell"><input type="checkbox" class="row-check" data-id="${p.id}"></td>
        <td>
          <div class="product-name-cell">
            ${p.image
              ? `<img class="table-thumb" src="${p.image}" alt="${p.name}">`
              : `<div class="table-thumb" style="background:${p.color};">${p.name.charAt(0)}</div>`}
            <div class="meta">
              <h5>${p.name}</h5>
              <span>${p.category}</span>
            </div>
          </div>
        </td>
        <td class="cell-muted">${p.barcode}</td>
        <td>${p.category}</td>
        <td class="cell-primary">₹${p.price.toFixed(2)}</td>
        <td>
          <span class="stock-bar-track"><span class="stock-bar-fill" style="width:${pct}%; background:${stockBarColor(p)};"></span></span>
          ${p.stock} units
        </td>
        <td><span class="badge ${st.cls}">${st.label}</span></td>
        <td>
          <div class="row-actions" style="justify-content:flex-end;">
            <button class="btn btn-ghost btn-icon" title="View" data-view="${p.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="btn btn-ghost btn-icon" title="Edit" data-edit="${p.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
            <button class="btn btn-ghost btn-icon" title="Delete" data-delete="${p.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');

    updateBulkBar();
  }

  function updateBulkBar() {
    const checked = document.querySelectorAll('.row-check:checked');
    if (checked.length > 0) {
      bulkBar.classList.remove('hidden');
      bulkCount.textContent = `${checked.length} product${checked.length > 1 ? 's' : ''} selected`;
    } else {
      bulkBar.classList.add('hidden');
    }
  }

  searchInput.addEventListener('input', render);
  filterCategory.addEventListener('change', render);
  filterStatus.addEventListener('change', render);

  selectAll.addEventListener('change', () => {
    document.querySelectorAll('.row-check').forEach((cb) => (cb.checked = selectAll.checked));
    updateBulkBar();
  });

  tbody.addEventListener('change', (e) => {
    if (e.target.classList.contains('row-check')) updateBulkBar();
  });

  tbody.addEventListener('click', (e) => {
    const editId = e.target.closest('[data-edit]')?.getAttribute('data-edit');
    const deleteId = e.target.closest('[data-delete]')?.getAttribute('data-delete');
    const viewId = e.target.closest('[data-view]')?.getAttribute('data-view');

    if (editId) openSlideOver(products.find((p) => p.id == editId));
    if (viewId) BrandVista.showToast('Opening quick view…', 'info');
    if (deleteId) {
      if (confirm('Delete this product? This action cannot be undone.')) {
        products = products.filter((p) => p.id != deleteId);
        persistProducts();
        render();
        BrandVista.showToast('Product deleted.', 'success');
      }
    }
  });

  /* ---------- Slide-over: Add / Edit ---------- */
  const overlay = document.getElementById('productOverlay');
  const slideOver = document.getElementById('productSlideOver');
  const slideOverTitle = document.getElementById('slideOverTitle');
  const form = document.getElementById('productForm');
  let editingId = null;
  let currentImageData = null; // holds the base64 data URL for the image being added/edited

  const imageInput = document.getElementById('pImageInput');
  const imageDrop = document.getElementById('imageDrop');
  const imagePreview = document.getElementById('imagePreview');
  const imageDropPrompt = document.getElementById('imageDropPrompt');
  const imageDropActions = document.getElementById('imageDropActions');
  const removeImageBtn = document.getElementById('removeImageBtn');

  function setImagePreview(dataUrl) {
    currentImageData = dataUrl;
    if (dataUrl) {
      imagePreview.src = dataUrl;
      imagePreview.classList.remove('hidden');
      imageDropPrompt.classList.add('hidden');
      imageDropActions.classList.remove('hidden');
    } else {
      imagePreview.src = '';
      imagePreview.classList.add('hidden');
      imageDropPrompt.classList.remove('hidden');
      imageDropActions.classList.add('hidden');
    }
  }

  function handleImageFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      BrandVista.showToast('Please choose an image file (PNG, JPG or WEBP).', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      BrandVista.showToast('Image is too large. Please choose a file under 5MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.onerror = () => BrandVista.showToast('Could not read that image. Please try again.', 'error');
    reader.readAsDataURL(file);
  }

  // Click anywhere on the drop zone (except the Remove button) opens the file picker
  imageDrop.addEventListener('click', (e) => {
    if (e.target.closest('#removeImageBtn')) return;
    imageInput.click();
  });
  imageInput.addEventListener('change', () => handleImageFile(imageInput.files[0]));

  // Drag-and-drop support
  ['dragover', 'dragleave', 'drop'].forEach((evt) => {
    imageDrop.addEventListener(evt, (e) => e.preventDefault());
  });
  imageDrop.addEventListener('dragover', () => imageDrop.style.borderColor = 'var(--color-primary)');
  imageDrop.addEventListener('dragleave', () => imageDrop.style.borderColor = '');
  imageDrop.addEventListener('drop', (e) => {
    imageDrop.style.borderColor = '';
    handleImageFile(e.dataTransfer.files[0]);
  });

  removeImageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setImagePreview(null);
    imageInput.value = '';
  });

  function openSlideOver(product) {
    refreshCategoryDropdowns(); // pick up any category added/edited since page load
    editingId = product ? product.id : null;
    slideOverTitle.textContent = product ? 'Edit Product' : 'Add Product';
    if (product) {
      document.getElementById('pName').value = product.name;
      document.getElementById('pBarcode').value = product.barcode;
      document.getElementById('pCategory').value = product.category;
      document.getElementById('pPrice').value = product.price;
      document.getElementById('pStock').value = product.stock;
      document.getElementById('pLowStock').value = product.low;
      setImagePreview(product.image || null);
    } else {
      form.reset();
      document.getElementById('pActive').checked = true;
      imageInput.value = '';
      setImagePreview(null);
    }
    BrandVista.openPanel(slideOver, overlay);
  }

  document.getElementById('addProductBtn').addEventListener('click', () => openSlideOver(null));
  overlay.addEventListener('click', () => BrandVista.closePanel(slideOver, overlay));
  document.querySelectorAll('[data-close-panel]').forEach((btn) => {
    btn.addEventListener('click', () => BrandVista.closePanel(slideOver, overlay));
  });

  document.getElementById('saveProductBtn').addEventListener('click', () => {
    const name = document.getElementById('pName').value.trim();
    const price = parseFloat(document.getElementById('pPrice').value);
    if (!name || isNaN(price)) {
      BrandVista.showToast('Please fill in the required fields.', 'error');
      return;
    }

    if (editingId) {
      const p = products.find((x) => x.id === editingId);
      p.name = name;
      p.price = price;
      p.category = document.getElementById('pCategory').value;
      p.stock = parseInt(document.getElementById('pStock').value) || 0;
      p.low = parseInt(document.getElementById('pLowStock').value) || p.low || 10;
      p.status = BrandVista.computeStockStatus(p.stock, p.low);
      p.image = currentImageData;
      BrandVista.showToast('Product updated successfully.', 'success');
    } else {
      const stock = parseInt(document.getElementById('pStock').value) || 0;
      const low = parseInt(document.getElementById('pLowStock').value) || 10;
      const palette = ['#2563eb', '#22c55e', '#f59e0b', '#7c3aed', '#ef4444', '#0ea5e9', '#a855f7', '#f97316'];
      products.unshift({
        id: Date.now(),
        name,
        barcode: document.getElementById('pBarcode').value || '—',
        category: document.getElementById('pCategory').value,
        price,
        stock,
        low,
        status: BrandVista.computeStockStatus(stock, low),
        color: palette[Math.floor(Math.random() * palette.length)],
        image: currentImageData,
      });
      BrandVista.showToast('Product added successfully.', 'success');
    }
    persistProducts();
    BrandVista.closePanel(slideOver, overlay);
    render();
  });

  render();
});
