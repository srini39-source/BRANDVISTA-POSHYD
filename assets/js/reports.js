/* ==========================================================================
   Reports page logic — draws the revenue line chart, orders bar chart, and
   two donut charts (inventory status, payment methods) using plain Canvas
   2D APIs. Also renders the best-sellers list.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Revenue chart (reused pattern from dashboard) ---------- */
  const revenueDatasets = {
    week: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [32000, 41000, 38500, 46000, 52500, 61000, 48940] },
    month: { labels: ['W1', 'W2', 'W3', 'W4'], values: [210000, 245000, 268000, 302000] },
    quarter: { labels: ['M1', 'M2', 'M3'], values: [980000, 1120000, 1260000] },
  };

  const revenueCanvas = document.getElementById('reportRevenueChart');
  const revenueCtx = revenueCanvas.getContext('2d');

  function drawLineChart(canvas, ctx, data, color) {
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.parentElement.clientWidth;
    const cssHeight = parseInt(canvas.getAttribute('height'), 10);
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const padding = { top: 20, right: 20, bottom: 34, left: 54 };
    const chartW = cssWidth - padding.left - padding.right;
    const chartH = cssHeight - padding.top - padding.bottom;
    const maxVal = Math.max(...data.values) * 1.15;
    const stepX = chartW / (data.labels.length - 1);
    const toX = (i) => padding.left + i * stepX;
    const toY = (v) => padding.top + chartH - (v / maxVal) * chartH;

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11.5px Inter, sans-serif';
    for (let g = 0; g <= 4; g++) {
      const y = padding.top + (chartH / 4) * g;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(cssWidth - padding.right, y);
      ctx.stroke();
      const val = maxVal - (maxVal / 4) * g;
      ctx.fillText(val >= 1000 ? `${Math.round(val / 1000)}k` : Math.round(val), 6, y + 4);
    }

    ctx.textAlign = 'center';
    data.labels.forEach((label, i) => ctx.fillText(label, toX(i), cssHeight - 10));
    ctx.textAlign = 'left';

    ctx.beginPath();
    data.values.forEach((v, i) => {
      const x = toX(i), y = toY(v);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    gradient.addColorStop(0, color + '38');
    gradient.addColorStop(1, color + '00');
    ctx.lineTo(toX(data.values.length - 1), padding.top + chartH);
    ctx.lineTo(toX(0), padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    data.values.forEach((v, i) => {
      const x = toX(i), y = toY(v);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    data.values.forEach((v, i) => {
      ctx.beginPath();
      ctx.arc(toX(i), toY(v), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = color;
      ctx.stroke();
    });
  }

  let currentPeriod = 'week';
  drawLineChart(revenueCanvas, revenueCtx, revenueDatasets[currentPeriod], '#2563eb');

  document.querySelectorAll('.report-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.report-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentPeriod = tab.getAttribute('data-period');
      drawLineChart(revenueCanvas, revenueCtx, revenueDatasets[currentPeriod], '#2563eb');
      drawOrdersChart();
    });
  });

  /* ---------- Orders bar chart ---------- */
  const ordersCanvas = document.getElementById('ordersChart');
  const ordersCtx = ordersCanvas.getContext('2d');
  const ordersDatasets = {
    week: [42, 58, 51, 63, 74, 89, 71],
    month: [280, 312, 335, 361],
    quarter: [1180, 1340, 1512],
  };
  const ordersLabels = { week: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], month: ['W1','W2','W3','W4'], quarter: ['M1','M2','M3'] };

  function drawOrdersChart() {
    const values = ordersDatasets[currentPeriod];
    const labels = ordersLabels[currentPeriod];
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = ordersCanvas.parentElement.clientWidth;
    const cssHeight = parseInt(ordersCanvas.getAttribute('height'), 10);
    ordersCanvas.width = cssWidth * dpr;
    ordersCanvas.height = cssHeight * dpr;
    ordersCanvas.style.width = cssWidth + 'px';
    ordersCanvas.style.height = cssHeight + 'px';
    ordersCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ordersCtx.clearRect(0, 0, cssWidth, cssHeight);

    const padding = { top: 16, right: 16, bottom: 30, left: 40 };
    const chartW = cssWidth - padding.left - padding.right;
    const chartH = cssHeight - padding.top - padding.bottom;
    const maxVal = Math.max(...values) * 1.2;
    const barSlot = chartW / values.length;
    const barWidth = Math.min(44, barSlot * 0.5);

    ordersCtx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
    ordersCtx.fillStyle = '#94a3b8';
    ordersCtx.font = '11px Inter, sans-serif';
    for (let g = 0; g <= 3; g++) {
      const y = padding.top + (chartH / 3) * g;
      ordersCtx.beginPath();
      ordersCtx.moveTo(padding.left, y);
      ordersCtx.lineTo(cssWidth - padding.right, y);
      ordersCtx.stroke();
    }

    values.forEach((v, i) => {
      const x = padding.left + barSlot * i + (barSlot - barWidth) / 2;
      const barH = (v / maxVal) * chartH;
      const y = padding.top + chartH - barH;
      const grad = ordersCtx.createLinearGradient(0, y, 0, padding.top + chartH);
      grad.addColorStop(0, '#2563eb');
      grad.addColorStop(1, '#60a5fa');
      ordersCtx.fillStyle = grad;
      roundRect(ordersCtx, x, y, barWidth, barH, 6);
      ordersCtx.fill();

      ordersCtx.fillStyle = '#94a3b8';
      ordersCtx.textAlign = 'center';
      ordersCtx.fillText(labels[i], x + barWidth / 2, cssHeight - 10);
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  drawOrdersChart();

  /* ---------- Best sellers list ---------- */
  const bestSellers = [
    { name: 'Colombian Roast Coffee 250g', meta: '412 units', value: '₹82,400', pct: 92, color: '#2563eb' },
    { name: 'Organic Almond Milk 1L', meta: '356 units', value: '₹64,080', pct: 78, color: '#22c55e' },
    { name: 'Artisan Sourdough Loaf', meta: '298 units', value: '₹41,720', pct: 61, color: '#f59e0b' },
    { name: 'Free Range Eggs (12)', meta: '241 units', value: '₹31,330', pct: 48, color: '#7c3aed' },
    { name: 'Basmati Rice 5kg', meta: '187 units', value: '₹28,900', pct: 40, color: '#ef4444' },
  ];
  document.getElementById('bestSellersList').innerHTML = bestSellers.map((p) => `
    <div class="top-product-row">
      <div class="top-product-thumb" style="background:${p.color};">${p.name.charAt(0)}</div>
      <div class="top-product-info">
        <h5>${p.name}</h5><span>${p.meta}</span>
        <div class="top-product-bar-track"><div class="top-product-bar-fill" style="width:${p.pct}%; background:${p.color};"></div></div>
      </div>
      <div class="top-product-value">${p.value}</div>
    </div>
  `).join('');

  /* ---------- Donut chart helper ---------- */
  function drawDonut(canvasId, legendId, segments) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = canvas.width;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = size / 2, cy = size / 2, radius = size / 2 - 8, lineWidth = 22;
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    let startAngle = -Math.PI / 2;

    segments.forEach((seg) => {
      const sliceAngle = (seg.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.strokeStyle = seg.color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'butt';
      ctx.stroke();
      startAngle += sliceAngle;
    });

    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--color-text').trim() || '#1e293b';
    ctx.font = '700 20px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, cx, cy - 6);
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('total', cx, cy + 14);

    document.getElementById(legendId).innerHTML = segments.map((seg) => `
      <div class="donut-legend-row">
        <span class="donut-legend-label"><span class="donut-legend-dot" style="background:${seg.color};"></span>${seg.label}</span>
        <span class="donut-legend-value">${seg.value}</span>
      </div>
    `).join('');
  }

  drawDonut('inventoryDonut', 'inventoryLegend', [
    { label: 'In Stock', value: 1108, color: '#22c55e' },
    { label: 'Low Stock', value: 94, color: '#f59e0b' },
    { label: 'Out of Stock', value: 46, color: '#ef4444' },
  ]);

  drawDonut('paymentDonut', 'paymentLegend', [
    { label: 'Cash', value: 41, color: '#2563eb' },
    { label: 'Card', value: 35, color: '#7c3aed' },
    { label: 'UPI', value: 24, color: '#22c55e' },
  ]);

  window.addEventListener('resize', () => {
    drawLineChart(revenueCanvas, revenueCtx, revenueDatasets[currentPeriod], '#2563eb');
    drawOrdersChart();
  });
});
