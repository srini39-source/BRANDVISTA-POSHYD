/* ==========================================================================
   POS Billing screen logic — product grid rendering, cart management with
   live subtotal/GST/discount/total calculations, payment method selection,
   keyboard shortcuts, and the checkout flow.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* The GST rate is NOT captured here. It is read from settings inside
     updateSummary() on every recalculation, so changing the rate in Settings
     applies to the next bill without a reload. A `const GST_RATE = 0.05` at
     this scope is what made every bill 5% regardless of configuration. */

  /* ---------- Catalog ----------
     Pulled fresh from the same localStorage-backed store that the Products,
     Add Product and Edit Product pages read from/write to, so anything
     added, edited, or re-categorized there shows up here the next time this
     page loads — no separate hardcoded list to fall out of sync. */
  let catalog = BrandVista.getProducts();

  // Category tabs come from the shared category list too, so a category
  // added on the Categories page appears here immediately (it'll just show
  // an empty grid until a product is assigned to it).
  const categoryNames = BrandVista.getCategories().map((c) => c.name);
  const categories = ['All', ...categoryNames];
  let activeCategory = 'All';
  let cart = []; // { id, name, price, qty, color }
  let activePayment = 'Cash';

  /* ---------- Category tabs ---------- */
  const categoryTabs = document.getElementById('categoryTabs');
  categoryTabs.innerHTML = categories.map((c, i) =>
    `<button class="pos-category-tab ${i === 0 ? 'active' : ''}" data-cat="${c}">${c}</button>`
  ).join('');

  categoryTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.pos-category-tab');
    if (!btn) return;
    activeCategory = btn.getAttribute('data-cat');
    document.querySelectorAll('.pos-category-tab').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');
    renderGrid();
  });

  /* ---------- Product grid ---------- */
  const productGrid = document.getElementById('productGrid');
  const searchInput = document.getElementById('posSearch');

  function renderGrid() {
    const q = searchInput.value.trim().toLowerCase();
    const filtered = catalog.filter((p) =>
      (activeCategory === 'All' || p.category === activeCategory) &&
      (!q || p.name.toLowerCase().includes(q))
    );

    if (filtered.length === 0) {
      productGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <h4>No products match</h4><p>Try a different search or category.</p>
      </div>`;
      return;
    }

    productGrid.innerHTML = filtered.map((p) => `
      <div class="pos-product-card ${p.stock <= 0 ? 'out-of-stock' : ''}" data-id="${p.id}">
        ${p.stock <= 0 ? '<span class="stock-tag">Sold out</span>' : ''}
        ${p.image
          ? `<img class="pos-product-thumb" style="object-fit:cover;" src="${p.image}" alt="${p.name}">`
          : `<div class="pos-product-thumb" style="background:${p.color};">${p.name.charAt(0)}</div>`}
        <h5>${p.name}</h5>
        <span class="price">${BrandVista.formatCurrency(p.price)}</span>
      </div>
    `).join('');
  }

  productGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.pos-product-card');
    if (!card || card.classList.contains('out-of-stock')) return;
    addToCart(parseInt(card.getAttribute('data-id')));
  });

  searchInput.addEventListener('input', renderGrid);

  /* ---------- Cart logic ---------- */
  const cartItemsEl = document.getElementById('cartItems');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const checkoutAmount = document.getElementById('checkoutAmount');

  function addToCart(id) {
    const product = catalog.find((p) => p.id === id);
    if (!product) return;
    const existing = cart.find((c) => c.id === id);
    if (existing) {
      if (existing.qty >= product.stock) {
        BrandVista.showToast('No more stock available for this item.', 'error');
        return;
      }
      existing.qty += 1;
    } else {
      cart.push({ id: product.id, name: product.name, price: product.price, qty: 1, color: product.color, image: product.image });
    }
    renderCart();
  }

  function changeQty(id, delta) {
    const item = cart.find((c) => c.id === id);
    if (!item) return;
    if (delta > 0) {
      const product = catalog.find((p) => p.id === id);
      if (product && item.qty >= product.stock) {
        BrandVista.showToast('No more stock available for this item.', 'error');
        return;
      }
    }
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter((c) => c.id !== id);
    renderCart();
  }

  function removeFromCart(id) {
    cart = cart.filter((c) => c.id !== id);
    renderCart();
  }

  function renderCart() {
    if (cart.length === 0) {
      cartItemsEl.innerHTML = `<div class="pos-cart-empty" id="cartEmptyState">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1.4"/><circle cx="18" cy="21" r="1.4"/><path d="M2.5 3h2.6l2.6 12.6a2 2 0 0 0 2 1.6h8a2 2 0 0 0 2-1.5l1.6-7.2H6.4"/></svg>
        <p>Cart is empty</p><p class="text-sm">Tap a product to add it</p>
      </div>`;
    } else {
      cartItemsEl.innerHTML = cart.map((item) => `
        <div class="cart-item" data-id="${item.id}">
          ${item.image
            ? `<img class="cart-item-thumb" style="object-fit:cover;" src="${item.image}" alt="${item.name}">`
            : `<div class="cart-item-thumb" style="background:${item.color};">${item.name.charAt(0)}</div>`}
          <div class="cart-item-info">
            <h5>${item.name}</h5>
            <span>${BrandVista.formatCurrency(item.price)} each</span>
          </div>
          <div class="cart-qty-control">
            <button class="qty-btn" data-decrease="${item.id}">−</button>
            <span class="cart-qty-value">${item.qty}</span>
            <button class="qty-btn" data-increase="${item.id}">+</button>
          </div>
          <div class="cart-item-total">${BrandVista.formatCurrency(item.price * item.qty)}</div>
          <button class="cart-item-remove" data-remove="${item.id}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `).join('');
    }
    updateSummary();
  }

  cartItemsEl.addEventListener('click', (e) => {
    const inc = e.target.closest('[data-increase]')?.getAttribute('data-increase');
    const dec = e.target.closest('[data-decrease]')?.getAttribute('data-decrease');
    const rem = e.target.closest('[data-remove]')?.getAttribute('data-remove');
    if (inc) changeQty(parseInt(inc), 1);
    if (dec) changeQty(parseInt(dec), -1);
    if (rem) removeFromCart(parseInt(rem));
  });

  document.getElementById('clearCartBtn').addEventListener('click', () => {
    cart = [];
    renderCart();
  });

  /* ---------- Summary calculations ---------- */
  const discountType = document.getElementById('discountType');
  const discountValue = document.getElementById('discountValue');

  const taxLabelEl = document.getElementById('sumTaxLabel');

  // Recomputes from the CURRENT cart and the CURRENT saved tax rate every
  // time. Returns the totals object so checkout can reuse the exact numbers
  // on screen rather than re-deriving (or worse, scraping) them.
  function updateSummary() {
    const totals = BrandVista.calculateTotals(cart, {
      discountType: discountType.value,
      discountValue: parseFloat(discountValue.value) || 0,
      // taxRate omitted on purpose → calculateTotals reads live settings.
    });

    const money = (n) => BrandVista.formatCurrency(n);

    document.getElementById('sumSubtotal').textContent = money(totals.subtotal);
    document.getElementById('sumTax').textContent = money(totals.tax);
    document.getElementById('sumTotal').textContent = money(totals.total);
    checkoutAmount.textContent = money(totals.total);

    if (taxLabelEl) {
      taxLabelEl.textContent = totals.taxRate > 0
        ? `GST (${totals.taxRate}%)`
        : 'GST (disabled)';
    }

    checkoutBtn.disabled = cart.length === 0;
    return totals;
  }

  discountType.addEventListener('change', updateSummary);
  discountValue.addEventListener('input', updateSummary);

  /* ---------- Payment method selection ---------- */
  document.querySelectorAll('.payment-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.payment-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activePayment = tab.getAttribute('data-payment');
    });
  });

  /* ---------- Checkout flow ---------- */
  const checkoutModal = document.getElementById('checkoutModal');

  const viewReceiptLink = document.getElementById('viewReceiptLink');

  checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) return;

    // Recompute once, right now, from the live cart and live settings. These
    // are the numbers that get shown, stored and printed — all three come
    // from this one object so they cannot drift apart.
    const totals = updateSummary();
    const settings = BrandVista.getSettings();
    const orderId = BrandVista.nextOrderId();
    const now = new Date();

    const sale = {
      id: orderId,
      createdAt: now.toISOString(),
      dateLabel: now.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }),
      customer: document.getElementById('posCustomer').value || 'Walk-in Customer',
      cashier: document.querySelector('[data-user-name]')?.textContent?.trim() || 'Cashier',
      payment: activePayment,
      status: 'Completed',

      // Line items snapshotted with the price actually charged.
      items: totals.lines.map((l) => ({
        id: l.id, name: l.name, price: l.price, qty: l.qty, lineTotal: l.lineTotal,
      })),

      // Totals exactly as computed above.
      subtotal: totals.subtotal,
      discount: totals.discount,
      discountType: totals.discountType,
      discountValue: totals.discountValue,
      taxable: totals.taxable,
      taxRate: totals.taxRate,
      tax: totals.tax,
      otherCharges: totals.otherCharges,
      total: totals.total,
      itemCount: totals.itemCount,

      // Business details as they stood at the time of sale.
      store: {
        name: settings.storeName,
        phone: settings.storePhone,
        address: settings.storeAddress,
        gstNumber: settings.gstNumber,
        logo: settings.logo,
        currencySymbol: settings.currencySymbol,
        receiptFooter: settings.receiptFooter,
      },
    };

    BrandVista.saveSale(sale);

    document.getElementById('checkoutSummaryText').textContent =
      `Order #${orderId} · ${BrandVista.formatCurrency(totals.total)} paid via ${activePayment}`;

    // Point the receipt at THIS sale rather than the bare page.
    if (viewReceiptLink) viewReceiptLink.href = `receipt.html?id=${orderId}`;

    // Deduct sold quantities from the shared catalog and persist, so stock
    // levels drop consistently on the Products page and here on refresh.
    cart.forEach((item) => {
      const product = catalog.find((p) => p.id === item.id);
      if (product) {
        product.stock = Math.max(0, product.stock - item.qty);
        product.status = BrandVista.computeStockStatus(product.stock, product.low);
      }
    });
    BrandVista.saveProducts(catalog);

    checkoutModal.classList.add('open');
  });

  document.getElementById('newSaleBtn').addEventListener('click', () => {
    // Full reset: cart emptied, discount cleared, catalog re-read so the next
    // bill starts from current stock. Nothing about the previous sale is kept.
    cart = [];
    discountValue.value = 0;
    discountType.value = 'pct';
    catalog = BrandVista.getProducts();
    renderCart();
    renderGrid(); // reflect the stock that checkout just deducted
    checkoutModal.classList.remove('open');
    BrandVista.showToast('Ready for a new sale.', 'success');
  });

  /* ---------- Keyboard shortcuts ---------- */
  document.addEventListener('keydown', (e) => {
    // Ignore shortcuts while typing in the discount field to allow normal editing
    if (e.key === 'F2') {
      e.preventDefault();
      searchInput.focus();
    }
    if (e.key === 'F4') {
      e.preventDefault();
      if (!checkoutBtn.disabled) checkoutBtn.click();
    }
    if (e.key === 'Escape' && document.activeElement !== searchInput) {
      cart = [];
      renderCart();
    }
  });

  renderGrid();
  renderCart();
});
