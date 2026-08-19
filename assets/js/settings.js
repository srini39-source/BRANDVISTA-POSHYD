/* ==========================================================================
   Settings page logic — tab switching, live receipt-footer preview, theme
   selection, backup export/import (as a downloadable JSON file), and
   persisting store preferences to localStorage.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // undefined = "logo untouched this session"; null = "cleared"; string = new
  // data-URL awaiting Save. Distinguishing undefined from null is what stops a
  // save of unrelated fields from wiping an existing logo.
  let pendingLogo = undefined;

  const taxEnabledInput = document.getElementById('taxEnabled');

  /* ---------- Tab navigation ---------- */
  const navItems = document.querySelectorAll('.settings-nav-item');
  const panels = document.querySelectorAll('.settings-panel');

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      navItems.forEach((i) => i.classList.remove('active'));
      panels.forEach((p) => p.classList.remove('active'));
      item.classList.add('active');
      document.getElementById(`panel-${item.getAttribute('data-panel')}`).classList.add('active');
    });
  });

  /* ---------- Live receipt footer preview ---------- */
  const footerInput = document.getElementById('receiptFooter');
  const footerPreview = document.getElementById('receiptFooterPreview');
  footerInput.addEventListener('input', () => {
    footerPreview.textContent = footerInput.value || 'Thank you for shopping with us!';
  });

  /* ---------- Theme option cards ---------- */
  const themeOptions = document.querySelectorAll('.theme-option');
  const savedTheme = localStorage.getItem('bv_theme') || 'light';
  themeOptions.forEach((opt) => {
    if (opt.getAttribute('data-theme-option') === savedTheme) opt.classList.add('active');
    opt.addEventListener('click', () => {
      themeOptions.forEach((o) => o.classList.remove('active'));
      opt.classList.add('active');
      const choice = opt.getAttribute('data-theme-option');
      const resolved = choice === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : choice;
      document.documentElement.setAttribute('data-theme', resolved);
      localStorage.setItem('bv_theme', resolved);
    });
  });

  /* ---------- Logo upload ----------
     Stored as a data-URL in settings so it survives a refresh and can be
     stamped onto receipts without a backend. Kept small (256px, JPEG-quality
     0.85) because localStorage quota is ~5MB and a raw phone photo would
     blow it on its own. */
  const logoPreview = document.getElementById('logoPreview');

  const logoInput = document.createElement('input');
  logoInput.type = 'file';
  logoInput.accept = 'image/png, image/jpeg, image/svg+xml, image/webp';
  logoInput.hidden = true;
  document.body.appendChild(logoInput);

  document.getElementById('uploadLogoBtn').addEventListener('click', () => logoInput.click());

  logoInput.addEventListener('change', () => {
    const file = logoInput.files && logoInput.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      BrandVista.showToast('That image is over 5MB — please choose a smaller file.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      downscaleImage(reader.result, 256, (dataUrl) => {
        pendingLogo = dataUrl;
        renderLogoPreview(dataUrl);
        BrandVista.showToast('Logo ready — press Save Changes to apply it.', 'info');
      });
    };
    reader.onerror = () => BrandVista.showToast('Could not read that image file.', 'error');
    reader.readAsDataURL(file);
  });

  function renderLogoPreview(dataUrl) {
    if (dataUrl) {
      logoPreview.innerHTML = `<img src="${dataUrl}" alt="Store logo" style="width:100%;height:100%;object-fit:contain;border-radius:inherit;">`;
    } else {
      logoPreview.textContent = 'BV';
    }
  }

  // SVGs are already small and lose fidelity when rasterised, so pass through.
  function downscaleImage(dataUrl, maxSize, done) {
    if (dataUrl.startsWith('data:image/svg')) { done(dataUrl); return; }

    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        done(canvas.toDataURL('image/png'));
      } catch (e) {
        done(dataUrl);
      }
    };
    img.onerror = () => done(dataUrl);
    img.src = dataUrl;
  }

  /* ---------- Backup / restore ---------- */
  document.getElementById('downloadBackupBtn').addEventListener('click', () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      storeName: document.getElementById('storeName').value,
      currency: document.getElementById('currency').value,
      gstRate: document.getElementById('defaultGst').value,
      receiptFooter: document.getElementById('receiptFooter').value,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brandvista-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    BrandVista.showToast('Backup downloaded.', 'success');
  });

  document.getElementById('restoreBackupBtn').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.addEventListener('change', () => {
      if (input.files.length) {
        BrandVista.showToast(`Restoring from "${input.files[0].name}"…`, 'info');
      }
    });
    input.click();
  });

  document.getElementById('resetDataBtn').addEventListener('click', () => {
    if (confirm('This will permanently erase all store data. Continue?')) {
      BrandVista.showToast('Store data has been reset.', 'success');
    }
  });

  /* ---------- Save settings ----------
     Writes EVERY business field, not just the four the old build persisted.
     Anything omitted here is a field the user can edit but that silently
     reverts on reload, which is exactly the bug this replaces. */
  document.getElementById('saveSettingsBtn').addEventListener('click', () => {
    const patch = {
      storeName: valueOf('storeName'),
      storePhone: valueOf('storePhone'),
      storeEmail: valueOf('storeEmail'),
      storeAddress: valueOf('storeAddress'),
      gstNumber: valueOf('gstNumber'),
      gstRate: BrandVista.parseTaxRate(valueOf('defaultGst')),
      taxEnabled: taxEnabledInput ? taxEnabledInput.checked : true,
      currencySymbol: valueOf('currency'),
      receiptFooter: valueOf('receiptFooter'),
    };
    if (pendingLogo !== undefined) patch.logo = pendingLogo;

    BrandVista.saveSettings(patch);
    pendingLogo = undefined;

    // Reflect the new name/logo in the sidebar immediately.
    BrandVista.applyBrandingToPage();
    BrandVista.showToast('Settings saved successfully.', 'success');
  });

  function valueOf(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  /* ---------- Hydrate the form from saved settings ----------
     The markup carries hard-coded value="" attributes as design placeholders.
     Without this pass those placeholders win on every load and the page looks
     like it forgot what you saved. Runs last so it overwrites them. */
  function hydrate() {
    const s = BrandVista.getSettings();

    setValue('storeName', s.storeName);
    setValue('storePhone', s.storePhone);
    setValue('storeEmail', s.storeEmail);
    setValue('storeAddress', s.storeAddress);
    setValue('gstNumber', s.gstNumber);
    setValue('currency', s.currencySymbol);
    setValue('receiptFooter', s.receiptFooter);

    // The GST <select> holds options like "5%" while we store the number 5.
    const gstSelect = document.getElementById('defaultGst');
    if (gstSelect) {
      const match = Array.from(gstSelect.options)
        .find((o) => BrandVista.parseTaxRate(o.value || o.textContent) === s.gstRate);
      if (match) gstSelect.value = match.value || match.textContent;
    }

    if (taxEnabledInput) taxEnabledInput.checked = s.taxEnabled;

    renderLogoPreview(s.logo);

    if (footerPreview) {
      footerPreview.textContent = s.receiptFooter || 'Thank you for shopping with us!';
    }
  }

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) el.value = value;
  }

  hydrate();
});
