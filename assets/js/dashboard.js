/* ==========================================================================
   Dashboard page logic — renders KPI lists and draws the revenue chart
   on a <canvas> using plain Canvas 2D APIs (no charting library).
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Sample data (would come from an API in production) ---------- */
  const topProducts = [
    { name: 'Colombian Roast Coffee 250g', sku: '412 units sold', value: '₹82,400', pct: 92, color: '#2563eb' },
    { name: 'Organic Almond Milk 1L', sku: '356 units sold', value: '₹64,080', pct: 78, color: '#22c55e' },
    { name: 'Artisan Sourdough Loaf', sku: '298 units sold', value: '₹41,720', pct: 61, color: '#f59e0b' },
    { name: 'Free Range Eggs (12)', sku: '241 units sold', value: '₹31,330', pct: 48, color: '#7c3aed' },
    { name: 'Cold Brew Concentrate', sku: '189 units sold', value: '₹28,350', pct: 39, color: '#ef4444' },
  ];

  const recentSales = [
    { name: 'Ananya Sharma', meta: 'Order #10432 · Card', amount: '₹1,240.00', initials: 'AS' },
    { name: 'Rahul Verma', meta: 'Order #10431 · UPI', amount: '₹680.50', initials: 'RV' },
    { name: 'Priya Nair', meta: 'Order #10430 · Cash', amount: '₹2,150.00', initials: 'PN' },
    { name: 'Karan Mehta', meta: 'Order #10429 · Card', amount: '₹430.00', initials: 'KM' },
    { name: 'Sneha Reddy', meta: 'Order #10428 · UPI', amount: '₹980.25', initials: 'SR' },
  ];

  const lowStock = [
    { name: 'Oat Milk 1L', meta: 'Only 4 units left', level: 'critical' },
    { name: 'Basmati Rice 5kg', meta: 'Only 7 units left', level: 'critical' },
    { name: 'Extra Virgin Olive Oil 500ml', meta: '11 units left', level: 'warning' },
    { name: 'Dark Chocolate 100g', meta: '13 units left', level: 'warning' },
    { name: 'Greek Yogurt 400g', meta: '15 units left', level: 'warning' },
    { name: 'Green Tea Bags (25)', meta: '18 units left', level: 'warning' },
  ];

  /* ---------- Render top products ---------- */
  const topProductsEl = document.getElementById('topProductsList');
  topProductsEl.innerHTML = topProducts.map((p) => `
    <div class="top-product-row">
      <div class="top-product-thumb" style="background:${p.color};">${p.name.charAt(0)}</div>
      <div class="top-product-info">
        <h5>${p.name}</h5>
        <span>${p.sku}</span>
        <div class="top-product-bar-track"><div class="top-product-bar-fill" style="width:${p.pct}%; background:${p.color};"></div></div>
      </div>
      <div class="top-product-value">${p.value}</div>
    </div>
  `).join('');

  /* ---------- Render recent sales ---------- */
  const recentSalesEl = document.getElementById('recentSalesList');
  recentSalesEl.innerHTML = recentSales.map((s) => `
    <div class="recent-sale-row">
      <div class="recent-sale-avatar">${s.initials}</div>
      <div class="recent-sale-info">
        <h5>${s.name}</h5>
        <span>${s.meta}</span>
      </div>
      <div class="recent-sale-amount">${s.amount}</div>
    </div>
  `).join('');

  /* ---------- Render low stock ---------- */
  const lowStockEl = document.getElementById('lowStockList');
  lowStockEl.innerHTML = lowStock.map((item) => `
    <div class="low-stock-row">
      <div class="low-stock-thumb">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>
      </div>
      <div class="low-stock-info">
        <h5>${item.name}</h5>
        <span>${item.meta}</span>
      </div>
      <span class="badge ${item.level === 'critical' ? 'badge-danger' : 'badge-warning'}">${item.level === 'critical' ? 'Critical' : 'Low'}</span>
    </div>
  `).join('');

  /* ---------- Revenue chart datasets per range ---------- */
  const datasets = {
    '7d': {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      current: [32000, 41000, 38500, 46000, 52500, 61000, 48940],
      previous: [28000, 35500, 33000, 39500, 44000, 52000, 41500],
    },
    '30d': {
      labels: ['W1', 'W2', 'W3', 'W4'],
      current: [210000, 245000, 268000, 302000],
      previous: [190000, 215000, 230000, 260000],
    },
    '90d': {
      labels: ['M1', 'M2', 'M3'],
      current: [980000, 1120000, 1260000],
      previous: [860000, 970000, 1080000],
    },
  };

  const canvas = document.getElementById('revenueChart');
  const ctx = canvas.getContext('2d');

  function drawChart(rangeKey) {
    const data = datasets[rangeKey];
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.parentElement.clientWidth;
    const cssHeight = 260;

    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const padding = { top: 16, right: 16, bottom: 30, left: 46 };
    const chartW = cssWidth - padding.left - padding.right;
    const chartH = cssHeight - padding.top - padding.bottom;
    const maxVal = Math.max(...data.current, ...data.previous) * 1.15;
    const stepX = chartW / (data.labels.length - 1);

    const toX = (i) => padding.left + i * stepX;
    const toY = (v) => padding.top + chartH - (v / maxVal) * chartH;

    // Horizontal gridlines + y-axis labels
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.lineWidth = 1;
    const gridLines = 4;
    for (let g = 0; g <= gridLines; g++) {
      const y = padding.top + (chartH / gridLines) * g;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(cssWidth - padding.right, y);
      ctx.stroke();
      const val = maxVal - (maxVal / gridLines) * g;
      ctx.fillText(val >= 1000 ? `${Math.round(val / 1000)}k` : Math.round(val), 6, y + 4);
    }

    // X-axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    data.labels.forEach((label, i) => {
      ctx.fillText(label, toX(i), cssHeight - 8);
    });
    ctx.textAlign = 'left';

    function drawLine(values, color, fillTop, fillBottom, lineWidth) {
      ctx.beginPath();
      values.forEach((v, i) => {
        const x = toX(i);
        const y = toY(v);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      if (fillTop) {
        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
        gradient.addColorStop(0, fillTop);
        gradient.addColorStop(1, fillBottom);
        ctx.lineTo(toX(values.length - 1), padding.top + chartH);
        ctx.lineTo(toX(0), padding.top + chartH);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }

    // Previous period (muted)
    drawLine(data.previous, '#c7d5f7', null, null, 2);
    // Current period (primary, filled)
    drawLine(data.current, '#2563eb', 'rgba(37, 99, 235, 0.22)', 'rgba(37, 99, 235, 0.0)', 3);

    // Points on current line
    ctx.fillStyle = '#2563eb';
    data.current.forEach((v, i) => {
      ctx.beginPath();
      ctx.arc(toX(i), toY(v), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#2563eb';
      ctx.stroke();
    });
  }

  let currentRange = '7d';
  drawChart(currentRange);

  document.querySelectorAll('.range-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.range-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentRange = tab.getAttribute('data-range');
      drawChart(currentRange);
    });
  });

  window.addEventListener('resize', () => drawChart(currentRange));
});
