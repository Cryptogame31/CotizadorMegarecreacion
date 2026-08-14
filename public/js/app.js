// Controlador Principal - SPA Megarecreación

import { onAuthChange, login, logout, getCurrentUser, changeUserPassword, registerNewUser } from './auth.js';
import * as DB from './db.js';

let currentRole = null;
let currentUserId = null;
let selectedTab = {};
let allProducts = { inflables: [], alimentos: [], shows: [], corporativos: [], adicionales: [] };
let allProviders = [];
let allNotifications = [];
let allCategories = [];
let notificationInterval = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let signaturePad = null;
let countdownInterval = null;
let photoCountdownInterval = null;
let systemSettings = null;
let canvasSign = null;

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupRouting();
  setupEventListeners();
  await loadCommonData();

  // Registrar Service Worker para PWA
  if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Service Worker registrado:', reg.scope))
        .catch(err => console.error('Error al registrar Service Worker:', err));
    });
  }

  // Lógica de PWA Banner
  let deferredPrompt;
  const installBanner = document.getElementById('pwa-install-banner');
  const installActionBtn = document.getElementById('btn-pwa-install-action');
  const closeBannerBtn = document.getElementById('btn-pwa-close-banner');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBanner) installBanner.style.display = 'block';
  });

  if (installActionBtn) {
    installActionBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA instalada: ${outcome}`);
        deferredPrompt = null;
        if (installBanner) installBanner.style.display = 'none';
      }
    });
  }

  if (closeBannerBtn) {
    closeBannerBtn.addEventListener('click', () => {
      if (installBanner) installBanner.style.display = 'none';
    });
  }

  // Escuchar cambios de autenticación
  onAuthChange(async (user) => {
    updateNavigation(user);
    if (user) {
      currentRole = user.role;
      currentUserId = user.uid;
      
      // Redirigir según el rol de intranet
      if (currentRole === 'superadmin') {
        navigateTo('view-admin');
      } else if (currentRole === 'cliente') {
        navigateTo('view-cliente');
      } else if (currentRole === 'compras') {
        navigateTo('view-compras');
      } else if (currentRole === 'cocina' || currentRole === 'recreacion' || currentRole === 'logistica') {
        navigateTo('view-operativo');
      }
    } else {
      currentRole = null;
      currentUserId = null;
      clearInterval(countdownInterval);
      clearInterval(photoCountdownInterval);
      stopNotificationPolling();
      const countdownBanner = document.getElementById('client-countdown-banner');
      if (countdownBanner) countdownBanner.style.display = 'none';
      navigateTo('view-cotizar');
    }
  });
});

function initTheme() {
  const savedTheme = DB.getStorageItem('megarecreacion_theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }
  updateThemeToggleButtons(savedTheme);
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('light-theme');
  const activeTheme = isLight ? 'light' : 'dark';
  DB.setStorageItem('megarecreacion_theme', activeTheme);
  
  if (systemSettings) {
    applyDynamicTheme({
      palette: systemSettings.themePalette,
      font: systemSettings.themeFont,
      fontSize: systemSettings.themeFontSize
    });
  }
  updateThemeToggleButtons(activeTheme);
}

function updateThemeToggleButtons(theme) {
  const lightIcons = document.querySelectorAll('.theme-icon-light');
  const darkIcons = document.querySelectorAll('.theme-icon-dark');
  const textLabels = document.querySelectorAll('.theme-toggle-text');
  
  if (theme === 'light') {
    lightIcons.forEach(el => el.style.display = 'inline-block');
    darkIcons.forEach(el => el.style.display = 'none');
    textLabels.forEach(el => el.textContent = 'Modo Noche');
  } else {
    lightIcons.forEach(el => el.style.display = 'none');
    darkIcons.forEach(el => el.style.display = 'inline-block');
    textLabels.forEach(el => el.textContent = 'Modo Día');
  }
}

function applyDynamicTheme(themeSettings) {
  if (!themeSettings) return;
  const root = document.documentElement;
  const isLight = document.body.classList.contains('light-theme');
  
  // Paletas de color premium para Megarecreacion
  const palettes = isLight ? {
    emerald: { color: '#059669', hover: '#047857', glow: 'rgba(5, 150, 105, 0.15)', border: 'rgba(5, 150, 105, 0.12)' },
    fiesta: { color: '#ff007a', hover: '#ff409f', glow: 'rgba(255, 0, 122, 0.15)', border: 'rgba(255, 0, 122, 0.12)' },
    gold: { color: '#c59b27', hover: '#a37d1d', glow: 'rgba(197, 155, 39, 0.15)', border: 'rgba(197, 155, 39, 0.12)' },
    sapphire: { color: '#2563eb', hover: '#1d4ed8', glow: 'rgba(37, 99, 235, 0.15)', border: 'rgba(37, 99, 235, 0.12)' },
    ruby: { color: '#dc2626', hover: '#b91c1c', glow: 'rgba(220, 38, 38, 0.15)', border: 'rgba(220, 38, 38, 0.12)' },
    rose: { color: '#db2777', hover: '#be185d', glow: 'rgba(219, 39, 119, 0.15)', border: 'rgba(219, 39, 119, 0.12)' }
  } : {
    emerald: { color: '#10b981', hover: '#34d399', glow: 'rgba(16, 185, 129, 0.25)', border: 'rgba(16, 185, 129, 0.08)' },
    fiesta: { color: '#ff007a', hover: '#ff409f', glow: 'rgba(255, 0, 122, 0.25)', border: 'rgba(255, 0, 122, 0.08)' },
    gold: { color: '#ffcf4b', hover: '#ffe28a', glow: 'rgba(255, 207, 75, 0.25)', border: 'rgba(255, 207, 75, 0.08)' },
    sapphire: { color: '#3b82f6', hover: '#60a5fa', glow: 'rgba(59, 130, 246, 0.25)', border: 'rgba(59, 130, 246, 0.08)' },
    ruby: { color: '#e11d48', hover: '#fb7185', glow: 'rgba(225, 29, 72, 0.25)', border: 'rgba(225, 29, 72, 0.08)' },
    rose: { color: '#ec4899', hover: '#f472b6', glow: 'rgba(236, 72, 153, 0.25)', border: 'rgba(236, 72, 153, 0.08)' }
  };

  const p = palettes[themeSettings.palette] || palettes.emerald;
  root.style.setProperty('--accent-gold', p.color);
  root.style.setProperty('--accent-gold-hover', p.hover);
  root.style.setProperty('--accent-gold-glow', p.glow);
  root.style.setProperty('--border-color', p.border);
  
  const fonts = {
    outfit: "'Outfit', sans-serif",
    inter: "'Inter', sans-serif",
    montserrat: "'Montserrat', sans-serif",
    playfair: "'Playfair Display', serif"
  };
  const fontVal = fonts[themeSettings.font] || fonts.montserrat;
  root.style.setProperty('--font-body', fontVal);
  root.style.setProperty('--font-title', fontVal);
  root.style.setProperty('--base-font-size', themeSettings.fontSize || '16px');
}

async function loadCommonData() {
  try {
    allCategories = await DB.getCategories();
    allCategories.forEach(cat => {
      if (!cotizacionActiva[cat.id]) {
        cotizacionActiva[cat.id] = [];
      }
    });

    // Rellenar selector de categoría del CRUD de productos
    const prodCategorySelect = document.getElementById('prod-category');
    if (prodCategorySelect) {
      prodCategorySelect.innerHTML = allCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    allProducts = await DB.getProducts();
    try {
      if (getCurrentUser()) {
        allProviders = await DB.getProviders();
      } else {
        allProviders = [];
      }
    } catch (e) {
      allProviders = [];
    }
    systemSettings = await DB.getSettings();
    applyDynamicTheme({
      palette: systemSettings.themePalette,
      font: systemSettings.themeFont,
      fontSize: systemSettings.themeFontSize
    });
    populateCotizadorForm();
    updateBrandingElements();

    // Ocultar el selector demo ya que estamos en Firebase de producción
    const demoSelector = document.getElementById('demo-auth-selector');
    if (demoSelector) {
      demoSelector.style.display = 'none';
    }
  } catch (err) {
    console.error("Error cargando datos comunes:", err);
  }
}

function updateBrandingElements() {
  const settings = systemSettings || {};
  const name = settings.businessName || 'Megarecreación';
  const subtitle = settings.businessSubtitle || 'Inflables, Carros de Comida y Eventos';
  
  document.title = `${name} - ${subtitle}`;

  // Logo en barra de escritorio
  const logoWrapper = document.getElementById('brand-logo-wrapper');
  if (logoWrapper) {
    logoWrapper.innerHTML = `<img src="assets/logo.jpg" style="max-height: 65px; border-radius: 8px;" alt="Logo ${name}" onerror="this.src='https://placehold.co/60x60?text=Mega'">`;
  }

  const sbTitle = document.getElementById('brand-sidebar-title');
  if (sbTitle) sbTitle.textContent = name.toUpperCase();

  const sbSub = document.getElementById('brand-sidebar-subtitle');
  if (sbSub) sbSub.textContent = subtitle;

  // Móvil
  const mLogoWrapper = document.getElementById('brand-mobile-logo-wrapper');
  if (mLogoWrapper) {
    mLogoWrapper.innerHTML = `<img src="assets/logo.jpg" style="max-height: 28px; border-radius: 4px;" alt="Logo">`;
  }

  const mobTitle = document.getElementById('brand-mobile-title');
  if (mobTitle) mobTitle.textContent = name.toUpperCase();

  // WA Link
  const phone = settings.telefonoContacto1 || '3163048505';
  const waBtn = document.getElementById('floating-whatsapp-btn');
  if (waBtn) {
    waBtn.href = `https://wa.me/57${phone.replace(/\D/g, '')}?text=Hola!%20Quisiera%20cotizar%20servicios%20de%20recreación%20e%20inflables.`;
    waBtn.style.display = getCurrentUser() ? 'none' : 'flex';
  }
}

// ==========================================
// SPA ROUTER
// ==========================================
function navigateTo(viewId) {
  document.querySelectorAll('.view-section').forEach(view => {
    view.classList.remove('active');
  });

  const targetView = document.getElementById(viewId);
  if (targetView) targetView.classList.add('active');

  // Menú escritorio activo
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    const link = item.querySelector('a');
    if (link && link.getAttribute('href') === `#${viewId}`) {
      item.classList.add('active');
    }
  });

  // Menú móvil activo
  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('href') === `#${viewId}`) {
      item.classList.add('active');
    }
  });

  onViewLoaded(viewId);
}

function setupRouting() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.getAttribute('href') && link.getAttribute('href').startsWith('#view-')) {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      
      const user = getCurrentUser();
      if (!user && targetId !== 'view-cotizar' && targetId !== 'view-login') {
        navigateTo('view-login');
      } else {
        navigateTo(targetId);
      }
    }
  });
}

function onViewLoaded(viewId) {
  const user = getCurrentUser();
  if (!user && viewId !== 'view-cotizar' && viewId !== 'view-login') return;

  switch (viewId) {
    case 'view-cotizar':
      resetCotizadorForm();
      break;
    case 'view-cliente':
      loadClienteView();
      break;
    case 'view-admin':
      loadAdminView();
      break;
    case 'view-compras':
      loadComprasView();
      break;
    case 'view-operativo':
      loadOperativoView();
      break;
  }
}

function updateNavigation(user) {
  const sidebarNav = document.getElementById('sidebar-nav-links');
  const mobileNav = document.getElementById('main-mobile-nav');
  const userPanel = document.getElementById('sidebar-user-panel');
  const navLoginBtn = document.getElementById('btn-nav-login');
  
  const mobileUserActions = document.getElementById('mobile-user-actions-btn');
  const mobileInitials = document.getElementById('mobile-user-badge-initials');

  sidebarNav.innerHTML = '';
  mobileNav.innerHTML = '';

  if (user) {
    userPanel.style.display = 'block';
    navLoginBtn.style.display = 'none';
    document.getElementById('user-display-name').textContent = user.name;
    document.getElementById('user-display-role').textContent = translateRole(user.role);
    document.getElementById('user-avatar-initials').textContent = user.name.charAt(0).toUpperCase();

    // Campana de notificaciones admin/compras
    const bellBtn = document.getElementById('btn-notification-bell');
    if (bellBtn) {
      if (user.role === 'superadmin' || user.role === 'compras') {
        bellBtn.style.display = 'flex';
        checkNotifications();
        startNotificationPolling();
      } else {
        bellBtn.style.display = 'none';
        stopNotificationPolling();
      }
    }

    if (mobileUserActions && mobileInitials) {
      mobileUserActions.style.display = 'flex';
      mobileInitials.textContent = user.name.charAt(0).toUpperCase();
      
      const newActionsBtn = mobileUserActions.cloneNode(true);
      mobileUserActions.parentNode.replaceChild(newActionsBtn, mobileUserActions);
      newActionsBtn.addEventListener('click', async () => {
        if (confirm(`Hola ${user.name}\n¿Deseas cerrar tu sesión?`)) {
          await logout();
        }
      });
    }

    // Configurar enlaces por rol
    let links = [];
    if (user.role === 'superadmin') {
      links = [
        { id: 'view-admin', label: 'Admin', icon: '🏛️' },
        { id: 'view-compras', label: 'Insumos', icon: '🛒' },
        { id: 'view-operativo', label: 'Logística/Shows', icon: '📋' },
        { id: 'view-cotizar', label: 'Cotizar', icon: '💰' }
      ];
    } else if (user.role === 'cliente') {
      links = [
        { id: 'view-cliente', label: 'Mi Reserva', icon: '✨' },
        { id: 'view-cotizar', label: 'Cotizar', icon: '💰' }
      ];
    } else if (user.role === 'compras') {
      links = [
        { id: 'view-compras', label: 'Insumos', icon: '🛒' },
        { id: 'view-admin', label: 'Calendario', icon: '📅' }
      ];
    } else {
      // Recreación, logística, cocina
      links = [
        { id: 'view-operativo', label: 'Mi Agenda', icon: '📋' },
        { id: 'view-admin', label: 'Calendario', icon: '📅' }
      ];
    }

    links.forEach(link => {
      const li = document.createElement('li');
      li.className = 'nav-item';
      li.innerHTML = `<a href="#${link.id}"><span>${link.icon}</span> ${link.label}</a>`;
      sidebarNav.appendChild(li);

      const mobA = document.createElement('a');
      mobA.href = `#${link.id}`;
      mobA.className = 'mobile-nav-item';
      mobA.innerHTML = `<span style="font-size:1.4rem;">${link.icon}</span><span>${link.label}</span>`;
      mobileNav.appendChild(mobA);
    });

    // Logout móvil
    const logoutMob = document.createElement('a');
    logoutMob.href = '#';
    logoutMob.className = 'mobile-nav-item';
    logoutMob.style.color = '#feb2b2';
    logoutMob.innerHTML = `<span style="font-size:1.4rem;">🚪</span><span>Salir</span>`;
    logoutMob.addEventListener('click', async (e) => {
      e.preventDefault();
      if (confirm("¿Estás seguro de cerrar sesión?")) await logout();
    });
    mobileNav.appendChild(logoutMob);
  } else {
    // Público
    userPanel.style.display = 'none';
    navLoginBtn.style.display = 'block';
    if (mobileUserActions) mobileUserActions.style.display = 'none';
    stopNotificationPolling();

    const li = document.createElement('li');
    li.className = 'nav-item active';
    li.innerHTML = `<a href="#view-cotizar"><span>💰</span> Cotizar Servicio</a>`;
    sidebarNav.appendChild(li);

    const mobA = document.createElement('a');
    mobA.href = '#view-cotizar';
    mobA.className = 'mobile-nav-item active';
    mobA.innerHTML = `<span style="font-size:1.4rem;">💰</span><span>Cotizar</span>`;
    mobileNav.appendChild(mobA);

    const mobLogin = document.createElement('a');
    mobLogin.href = '#view-login';
    mobLogin.className = 'mobile-nav-item';
    mobLogin.innerHTML = `<span style="font-size:1.4rem;">🔑</span><span>Entrar</span>`;
    mobileNav.appendChild(mobLogin);
  }
  updateBrandingElements();
}

function translateRole(role) {
  const roles = {
    superadmin: 'Super Admin',
    compras: 'Abastecimiento',
    recreacion: 'Recreador',
    logistica: 'Logística',
    cliente: 'Cliente'
  };
  return roles[role] || role;
}

// ==========================================
// VISTA: COTIZADOR PÚBLICO
// ==========================================
let cotizacionActiva = {};

function populateCotizadorForm() {
  // Limpiar contenedor dinámico de categorías adicionales
  const dynamicContainer = document.getElementById('cot-dynamic-categories-container');
  if (dynamicContainer) dynamicContainer.innerHTML = '';

  // Renderizar cada categoría en su respectivo grid
  allCategories.forEach((cat, index) => {
    // Buscar si existe un grid predefinido en el HTML
    let grid = document.getElementById(`cot-${cat.id}-grid`);
    
    // Si no existe, es una categoría personalizada, crearla en el contenedor dinámico
    if (!grid && dynamicContainer) {
      const section = document.createElement('div');
      section.className = 'dynamic-category-section';
      section.innerHTML = `
        <h3 style="color: var(--accent-gold); font-family: var(--font-title); font-size: 1.3rem; margin: 2.5rem 0 0.5rem 0;">${index + 1}. ${cat.name}</h3>
        <p style="color:var(--text-secondary); font-size:0.85rem; margin-bottom:1rem;">${cat.description}</p>
        <div class="products-selector-grid" id="cot-${cat.id}-grid"></div>
      `;
      dynamicContainer.appendChild(section);
      grid = document.getElementById(`cot-${cat.id}-grid`);
    }

    if (grid) {
      const products = allProducts[cat.id] || [];
      
      if (cat.extraField === 'minQty') {
        // Carro de alimentos / Snacks (control de cantidad)
        grid.innerHTML = products.map(p => `
          <div class="select-card" id="card-${p.id}" data-category="${cat.id}" data-id="${p.id}" style="min-height: 180px;">
            <div onclick="toggleAlimentoSelect('${p.id}', '${cat.id}')">
              <div class="select-card-name">${p.name}</div>
              <div class="select-card-desc">${p.description}</div>
              ${p.viewLink ? `<a href="${p.viewLink}" target="_blank" onclick="event.stopPropagation()" class="prod-view-link" style="color: var(--accent-gold); font-size:0.75rem; text-decoration:underline; display:block; margin-top:0.25rem;">📸 Ver Detalles / Fotos</a>` : ''}
            </div>
            <div>
              <div class="select-card-price" id="price-${p.id}">$${(p.price * (p.minQty || 50)).toLocaleString()} COP</div>
              <div class="qty-controller" style="display:none;" id="qty-${p.id}">
                <button type="button" class="btn-qty-minus" onclick="updateAlimentoQty('${p.id}', '${cat.id}', -10)">-</button>
                <span class="qty-display" id="qty-val-${p.id}">${p.minQty || 50}</span>
                <button type="button" class="btn-qty-plus" onclick="updateAlimentoQty('${p.id}', '${cat.id}', 10)">+</button>
              </div>
            </div>
          </div>
        `).join('');
      } else {
        // Selección simple (inflables, shows, adicionales, etc.)
        grid.innerHTML = products.map(p => {
          let extraInfo = '';
          if (cat.extraField === 'capacity') extraInfo = `<div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.25rem;">Capacidad: ${p.capacity || 'N/A'}</div>`;
          else if (cat.extraField === 'duration') extraInfo = `<div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.25rem;">Duración: ${p.duration || 'N/A'}</div>`;

          return `
            <div class="select-card" data-category="${cat.id}" data-id="${p.id}" onclick="toggleProductSelect(this)">
              <div>
                <div class="select-card-name">${p.name}</div>
                <div class="select-card-desc">${p.description}</div>
                ${extraInfo}
                ${p.viewLink ? `<a href="${p.viewLink}" target="_blank" onclick="event.stopPropagation()" class="prod-view-link" style="color: var(--accent-gold); font-size:0.75rem; text-decoration:underline; display:block; margin-top:0.25rem;">📸 Ver Detalles / Fotos</a>` : ''}
              </div>
              <div class="select-card-price">$${p.price.toLocaleString()} COP</div>
            </div>
          `;
        }).join('');
      }
    }
  });

  calculateCotizacion();
}

window.toggleProductSelect = function(element) {
  const category = element.getAttribute('data-category');
  const id = element.getAttribute('data-id');
  element.classList.toggle('selected');

  cotizacionActiva[category] = cotizacionActiva[category] || [];

  if (element.classList.contains('selected')) {
    cotizacionActiva[category].push(id);
  } else {
    cotizacionActiva[category] = cotizacionActiva[category].filter(x => x !== id);
  }
  calculateCotizacion();
};

window.toggleAlimentoSelect = function(id, catId) {
  const card = document.getElementById(`card-${id}`);
  const qtyController = document.getElementById(`qty-${id}`);
  card.classList.toggle('selected');

  cotizacionActiva[catId] = cotizacionActiva[catId] || [];

  if (card.classList.contains('selected')) {
    qtyController.style.display = 'flex';
    const products = allProducts[catId] || [];
    const prod = products.find(a => a.id === id);
    const qtyVal = parseInt(document.getElementById(`qty-val-${id}`).textContent);
    cotizacionActiva[catId].push({ id, qty: qtyVal });
  } else {
    qtyController.style.display = 'none';
    cotizacionActiva[catId] = cotizacionActiva[catId].filter(a => a.id !== id);
  }
  calculateCotizacion();
};

window.updateAlimentoQty = function(id, catId, delta) {
  const products = allProducts[catId] || [];
  const prod = products.find(a => a.id === id);
  if (!prod) return;

  const qtyDisplay = document.getElementById(`qty-val-${id}`);
  let currentQty = parseInt(qtyDisplay.textContent);
  
  currentQty += delta;
  const minQty = prod.minQty || 10;
  if (currentQty < minQty) currentQty = minQty;
  qtyDisplay.textContent = currentQty;

  const priceDisplay = document.getElementById(`price-${id}`);
  priceDisplay.textContent = `$${(prod.price * currentQty).toLocaleString()} COP`;

  cotizacionActiva[catId] = cotizacionActiva[catId] || [];
  const itemIndex = cotizacionActiva[catId].findIndex(a => a.id === id);
  if (itemIndex !== -1) {
    cotizacionActiva[catId][itemIndex].qty = currentQty;
  }
  calculateCotizacion();
};

function calculateCotizacion() {
  let subtotal = 0;
  const breakdown = [];

  allCategories.forEach(cat => {
    const activeIds = cotizacionActiva[cat.id] || [];
    const products = allProducts[cat.id] || [];
    
    if (cat.extraField === 'minQty') {
      activeIds.forEach(item => {
        const p = products.find(x => x.id === item.id);
        if (p) {
          const val = p.price * item.qty;
          subtotal += val;
          breakdown.push({ name: `${p.name} (x${item.qty} porc.)`, value: val });
        }
      });
    } else {
      activeIds.forEach(id => {
        const p = products.find(x => x.id === id);
        if (p) {
          subtotal += p.price;
          breakdown.push({ name: p.name, value: p.price });
        }
      });
    }
  });

  const breakdownContainer = document.getElementById('cot-summary-breakdown');
  if (breakdownContainer) {
    if (breakdown.length === 0) {
      breakdownContainer.innerHTML = `<p style="color:var(--text-muted); text-align:center;">Selecciona servicios para ver el presupuesto en tiempo real.</p>`;
    } else {
      breakdownContainer.innerHTML = `
        <div class="breakdown-items-list" style="max-height: 250px; overflow-y: auto; padding-right:0.5rem; margin-bottom:1rem;">
          ${breakdown.map(b => `
            <div class="summary-row">
              <span>${b.name}</span>
              <span>$${b.value.toLocaleString()} COP</span>
            </div>
          `).join('')}
        </div>
        <div class="summary-row total">
          <span>Total Estimado:</span>
          <span>$${subtotal.toLocaleString()} COP</span>
        </div>
      `;
    }
  }

  const summaryPanel = document.querySelector('.cotizacion-summary-panel');
  if (summaryPanel) {
    if (breakdown.length === 0) {
      summaryPanel.classList.add('summary-empty');
    } else {
      summaryPanel.classList.remove('summary-empty');
    }
  }

  cotizacionActiva.total = subtotal;
}

function resetCotizadorForm() {
  const form = document.getElementById('form-cotizador');
  if (form) form.reset();
  
  const searchInput = document.getElementById('cot-search-services');
  if (searchInput) searchInput.value = '';
  
  cotizacionActiva = {};
  allCategories.forEach(cat => {
    cotizacionActiva[cat.id] = [];
  });
  
  document.querySelectorAll('.select-card').forEach(card => {
    card.classList.remove('selected');
    const id = card.getAttribute('data-id');
    const qty = document.getElementById(`qty-${id}`);
    if (qty) qty.style.display = 'none';
  });

  filterCotizadorServices();
  calculateCotizacion();
}

function filterCotizadorServices() {
  const query = (document.getElementById('cot-search-services')?.value || '').toLowerCase().trim();
  
  allCategories.forEach(cat => {
    const gridId = cat.id === 'corporativos' ? 'cot-corp-grid' : `cot-${cat.id}-grid`;
    const grid = document.getElementById(gridId);
    if (!grid) return;

    let visibleInGrid = 0;
    const cards = grid.querySelectorAll('.select-card');
    cards.forEach(card => {
      const name = (card.querySelector('h4')?.textContent || '').toLowerCase();
      const desc = (card.querySelector('p')?.textContent || '').toLowerCase();
      if (name.includes(query) || desc.includes(query)) {
        card.style.display = 'flex';
        visibleInGrid++;
      } else {
        card.style.display = 'none';
      }
    });

    let titleEl = null;
    let descEl = null;

    if (['inflables', 'alimentos', 'shows', 'corporativos', 'adicionales'].includes(cat.id)) {
      descEl = grid.previousElementSibling;
      if (descEl && descEl.tagName === 'P') {
        titleEl = descEl.previousElementSibling;
      }
    } else {
      const wrapper = grid.closest('.dynamic-category-section');
      if (wrapper) {
        titleEl = wrapper;
      }
    }

    if (titleEl) {
      if (visibleInGrid > 0) {
        titleEl.style.display = '';
        if (descEl) descEl.style.display = '';
        grid.style.display = '';
      } else {
        titleEl.style.display = 'none';
        if (descEl) descEl.style.display = 'none';
        grid.style.display = 'none';
      }
    }
  });
}

// Envío del formulario de cotización pública
const formCotizador = document.getElementById('form-cotizador');
if (formCotizador) {
  formCotizador.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (cotizacionActiva.total === 0) {
      alert("Por favor, selecciona al menos un servicio (inflable, show o snack) antes de enviar.");
      return;
    }

    const quotation = {
      nombre: document.getElementById('cot-nombre').value,
      email: document.getElementById('cot-email').value,
      telefono: document.getElementById('cot-telefono').value,
      tipoEvento: document.getElementById('cot-tipo').value,
      fecha: document.getElementById('cot-fecha').value,
      invitados: parseInt(document.getElementById('cot-invitados').value) || 20,
      ...cotizacionActiva
    };

    try {
      const btn = document.getElementById('btn-submit-cotizacion');
      btn.textContent = "Enviando...";
      btn.disabled = true;

      const res = await DB.createQuotation(quotation);
      alert(`¡Solicitud enviada correctamente!\n\nHemos registrado tu cotización con el ID ${res.id}. Nos pondremos en contacto contigo por WhatsApp.`);
      resetCotizadorForm();
      navigateTo('view-cotizar');
    } catch (err) {
      alert("Error al enviar cotización: " + err.message);
    } finally {
      const btn = document.getElementById('btn-submit-cotizacion');
      btn.textContent = "Solicitar Cotización Oficial";
      btn.disabled = false;
    }
  });
}

function setupEventListeners() {
  // Definido como fallback vacío, los listeners corren a nivel de módulo.
}

// ==========================================
// DETECTORES DE EVENTOS COMUNES
// ==========================================
// Botones de navegación
const btnNavLogin = document.getElementById('btn-nav-login');
if (btnNavLogin) {
  btnNavLogin.addEventListener('click', () => navigateTo('view-login'));
}

const btnBackCotizar = document.getElementById('btn-back-cotizar');
if (btnBackCotizar) {
  btnBackCotizar.addEventListener('click', () => navigateTo('view-cotizar'));
}

// Alternar temas
const themeToggleBtn = document.getElementById('theme-toggle-btn');
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', toggleTheme);
}

const themeToggleMobileBtn = document.getElementById('theme-toggle-mobile-btn');
if (themeToggleMobileBtn) {
  themeToggleMobileBtn.addEventListener('click', toggleTheme);
}

// Búsqueda en administración de usuarios
const searchInput = document.getElementById('admin-users-search');
if (searchInput) {
  searchInput.addEventListener('input', () => renderAdminUsers());
}

// Cerrar sesión desde la barra lateral (Desktop)
const btnLogoutSidebar = document.getElementById('btn-logout-sidebar');
if (btnLogoutSidebar) {
  btnLogoutSidebar.addEventListener('click', async () => {
    if (confirm("¿Estás seguro de que deseas cerrar sesión?")) {
      await logout();
    }
  });
}

// Búsqueda en catálogo público
const cotSearchServices = document.getElementById('cot-search-services');
if (cotSearchServices) {
  cotSearchServices.addEventListener('input', filterCotizadorServices);
}

// Búsqueda en catálogo administración
const adminProductsSearch = document.getElementById('admin-products-search');
if (adminProductsSearch) {
  adminProductsSearch.addEventListener('input', () => renderAdminProducts());
}

// Búsqueda en cotizaciones administración
const adminQuotesSearch = document.getElementById('admin-quotes-search');
if (adminQuotesSearch) {
  adminQuotesSearch.addEventListener('input', () => renderAdminQuotations());
}
// Descargar cotización en PDF usando jsPDF
const btnDownloadQuote = document.getElementById('btn-descargar-cotizacion');
if (btnDownloadQuote) {
  btnDownloadQuote.addEventListener('click', () => {
    if (!cotizacionActiva.total || cotizacionActiva.total === 0) {
      alert("No hay ningún servicio seleccionado para descargar en PDF.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const nombre = document.getElementById('cot-nombre').value || 'Cliente';
    const email = document.getElementById('cot-email').value || 'N/A';
    const telefono = document.getElementById('cot-telefono').value || 'N/A';
    const fecha = document.getElementById('cot-fecha').value || 'N/A';
    const tipo = document.getElementById('cot-tipo').value || 'fiesta_infantil';

    // Formatear PDF
    doc.setFillColor(11, 13, 22); // Background header
    doc.rect(0, 0, 210, 45, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text("MEGARECREACIÓN", 15, 20);

    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("Atracciones inflables, snacks y shows divertidos", 15, 27);
    doc.text("WhatsApp: 3163048505 - 3197188973", 15, 33);

    doc.setFontSize(16);
    doc.setTextColor(11, 13, 22);
    doc.text("COTIZACIÓN DE SERVICIOS SOCIALES", 15, 60);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Cliente: ${nombre}`, 15, 70);
    doc.text(`Email: ${email}`, 15, 75);
    doc.text(`Teléfono: ${telefono}`, 15, 80);
    doc.text(`Fecha del Evento: ${fecha}`, 120, 70);
    doc.text(`Tipo de Evento: ${tipo.replace('_', ' ').toUpperCase()}`, 120, 75);

    // Tabla de Items
    let y = 95;
    doc.setFont("helvetica", "bold");
    doc.setFillColor(240, 242, 245);
    doc.rect(15, y - 5, 180, 8, 'F');
    doc.setTextColor(0, 0, 0);
    doc.text("Descripción del Servicio", 20, y);
    doc.text("Valor", 160, y);
    
    doc.setFont("helvetica", "normal");
    y += 10;

    // Inyectar items del desglose de forma dinámica
    const items = [];
    allCategories.forEach(cat => {
      const activeIds = cotizacionActiva[cat.id] || [];
      const products = allProducts[cat.id] || [];
      
      if (cat.extraField === 'minQty') {
        activeIds.forEach(i => {
          const p = products.find(x => x.id === i.id);
          if (p) items.push({ name: `${p.name} (x${i.qty} porc.)`, val: p.price * i.qty });
        });
      } else {
        activeIds.forEach(id => {
          const p = products.find(x => x.id === id);
          if (p) items.push({ name: p.name, val: p.price });
        });
      }
    });

    items.forEach(item => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.text(item.name, 20, y);
      doc.text(`$${item.val.toLocaleString()} COP`, 160, y);
      y += 8;
    });

    // Total
    y += 5;
    doc.line(15, y - 5, 195, y - 5);
    doc.setFont("helvetica", "bold");
    doc.text("Total Estimado:", 120, y);
    doc.text(`$${cotizacionActiva.total.toLocaleString()} COP`, 160, y);

    // Nota legal
    y += 20;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("Nota: Este documento representa un presupuesto estimado en tiempo real. La separación de la fecha", 15, y);
    doc.text("se formaliza únicamente con el abono del 50% de reserva y la firma del contrato respectivo.", 15, y + 4);

    doc.save(`cotizacion-megarecreacion-${nombre.replace(/\s+/g, '-')}.pdf`);
  });
}

// Consultar disponibilidad pública
const btnCheckAvail = document.getElementById('btn-check-availability');
if (btnCheckAvail) {
  btnCheckAvail.addEventListener('click', async () => {
    const dateInput = document.getElementById('check-avail-date').value;
    if (!dateInput) {
      alert("Por favor, selecciona una fecha primero.");
      return;
    }

    try {
      const events = await DB.getEvents();
      const bookedEvents = events.filter(e => e.fecha === dateInput);
      
      const resultsDiv = document.getElementById('availability-results');
      resultsDiv.style.display = 'block';

      if (bookedEvents.length === 0) {
        resultsDiv.innerHTML = `
          <div style="background:rgba(16, 185, 129, 0.1); border:1px solid var(--success); padding:1rem; border-radius:8px; color:var(--success);">
            ✓ ¡Excelente! No tenemos reservas registradas para el <strong>${dateInput}</strong>. Todos nuestros inflables, sopladores, shows de magia y carros de comida están 100% disponibles.
          </div>
        `;
      } else {
        // Encontrar equipos ocupados
        const ocupados = [];
        bookedEvents.forEach(e => {
          e.inflables.forEach(infId => {
            const p = allProducts.inflables.find(x => x.id === infId);
            if (p) ocupados.push(p.name);
          });
        });

        resultsDiv.innerHTML = `
          <div style="background:rgba(245, 158, 11, 0.1); border:1px solid var(--warning); padding:1rem; border-radius:8px; color:var(--warning); margin-bottom:1rem;">
            ⚠ Contamos con reservas agendadas para el <strong>${dateInput}</strong>.
          </div>
          ${ocupados.length > 0 ? `
            <p style="font-size:0.9rem; margin-bottom:0.5rem; font-weight:600;">Equipos/Atracciones ocupadas para esta fecha:</p>
            <ul style="padding-left:1.5rem; font-size:0.85rem; color:var(--text-secondary);">
              ${ocupados.map(o => `<li>${o} (No disponible)</li>`).join('')}
            </ul>
          ` : `<p style="font-size:0.85rem; color:var(--text-secondary);">Aunque hay eventos programados, aún tenemos disponibilidad de atracciones para esta fecha.</p>`}
        `;
      }
    } catch (err) {
      alert("Error al verificar disponibilidad: " + err.message);
    }
  });
}

// ==========================================
// VISTA: LOGIN
// ==========================================
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-password').value;
  try {
    await login(email, pass);
  } catch (err) {
    if (err.message.includes('Failed to fetch') || err.message.includes('API responded')) {
      if (confirm("No se pudo iniciar sesión con el backend Express.\n¿Deseas activar el modo simulador (Mock) local?")) {
        DB.setStorageItem('megarecreacion_force_mock', 'true');
        window.location.reload();
      }
    } else {
      alert("Error: " + err.message);
    }
  }
});

const btnForgotPassword = document.getElementById('btn-forgot-password');
if (btnForgotPassword) {
  btnForgotPassword.addEventListener('click', (e) => {
    e.preventDefault();
    alert("Por favor, solicita a un administrador que restablezca tu contraseña.");
  });
}

// Selector rápido de cuentas para Demo
const selectDemoUser = document.getElementById('select-demo-user');
if (selectDemoUser) {
  selectDemoUser.addEventListener('change', () => {
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-password');
    if (emailInput && passInput) {
      emailInput.value = selectDemoUser.value;
      passInput.value = "123456";
    }
  });
}

// ==========================================
// VISTA: PORTAL DEL CLIENTE (MI EVENTO)
// ==========================================
let activeClientEvent = null;

async function loadClienteView() {
  setupTabs('view-cliente');
  
  try {
    const events = await DB.getEvents();
    if (events.length === 0) {
      alert("Aún no tienes ningún evento agendado o aprobado.");
      navigateTo('view-cotizar');
      return;
    }

    activeClientEvent = events[0];
    document.getElementById('client-event-name').textContent = activeClientEvent.nombre;

    // Configurar Banner de Cuenta Regresiva
    setupCountdown(activeClientEvent.fecha, activeClientEvent.horaInicio);
    
    // Rellenar tab Mi Reserva
    document.getElementById('c-info-fecha').textContent = activeClientEvent.fecha;
    document.getElementById('c-info-hora').textContent = activeClientEvent.horaInicio || 'N/A';
    
    // Obtener nombres de atracciones contratadas
    const inflablesList = (activeClientEvent.inflables || []).map(id => {
      const p = (allProducts.inflables || []).find(x => x.id === id);
      return p ? p.name : id;
    }).join(', ') || 'Ninguno';
    document.getElementById('c-info-salon').textContent = inflablesList;

    const showsList = (activeClientEvent.shows || []).map(id => {
      const p = (allProducts.shows || []).find(x => x.id === id);
      return p ? p.name : id;
    }).join(', ') || 'Ninguno';
    document.getElementById('c-info-recreacion').textContent = showsList;

    const adicList = (activeClientEvent.adicionales || []).map(id => {
      const p = (allProducts.adicionales || []).find(x => x.id === id);
      return p ? p.name : id;
    }).join(', ') || 'Ninguno';
    document.getElementById('c-info-fotografia').textContent = adicList;

    // Firmado contrato
    const badgeFirma = document.getElementById('c-info-firma-status');
    if (activeClientEvent.contratoFirmado) {
      badgeFirma.innerHTML = `<span class="badge badge-confirmada">Contrato Firmado</span>`;
      document.getElementById('firma-pendiente-box').style.display = 'none';
      const firmBox = document.getElementById('firma-realizada-box');
      firmBox.style.display = 'block';
      document.getElementById('img-signature-saved').src = activeClientEvent.firmaCliente || '';
    } else {
      badgeFirma.innerHTML = `<span class="badge badge-pendiente">Pendiente de Firma</span>`;
      document.getElementById('firma-pendiente-box').style.display = 'block';
      document.getElementById('firma-realizada-box').style.display = 'none';
    }

    // Rellenar citas
    const citasContainer = document.getElementById('client-citas-lista-container');
    const citasCard = document.getElementById('client-citas-card');
    if (activeClientEvent.citas && activeClientEvent.citas.length > 0) {
      citasCard.style.display = 'block';
      citasContainer.innerHTML = activeClientEvent.citas.map(c => `
        <div style="background:var(--bg-secondary); border:1px solid var(--border-color); padding:1rem; border-radius:8px;">
          <strong style="color:var(--accent-gold);">${c.titulo}</strong>
          <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.25rem;">Fecha: ${c.fecha} | Hora: ${c.hora}</div>
          <p style="font-size:0.85rem; margin-top:0.5rem;">${c.descripcion}</p>
        </div>
      `).join('');
    } else {
      citasCard.style.display = 'none';
    }

    // Cargar tab de invitados (participantes)
    renderClientGuests();

    // Cargar tab carritos / menús
    renderClientMenuSelection();

    // Cargar tab cronograma
    renderClientTimeline();

    // Cargar tab documentos y pagos
    renderClientPaymentsAndContract();

    // Cargar tab fotografía
    renderClientPhotography();

  } catch (err) {
    console.error("Error al cargar vista de cliente:", err);
  }
}

function setupCountdown(eventDate, eventTime) {
  clearInterval(countdownInterval);
  const banner = document.getElementById('client-countdown-banner');
  if (!banner) return;
  banner.style.display = 'flex';

  document.getElementById('client-countdown-event-date').textContent = `${eventDate} a las ${eventTime || '00:00'}`;

  const target = new Date(`${eventDate}T${eventTime || '00:00'}:00`).getTime();

  function updateTimer() {
    const now = new Date().getTime();
    const diff = target - now;

    if (diff <= 0) {
      clearInterval(countdownInterval);
      document.getElementById('countdown-timer-container').innerHTML = `<h4 style="color:var(--accent-gold);">¡Es hoy! ¡A divertirse! 🎉</h4>`;
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById('timer-days').textContent = String(days).padStart(2, '0');
    document.getElementById('timer-hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('timer-minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('timer-seconds').textContent = String(seconds).padStart(2, '0');
  }

  updateTimer();
  countdownInterval = setInterval(updateTimer, 1000);
}

// CLIENT TAB: PARTICIPANTES / INVITADOS
function renderClientGuests() {
  const container = document.getElementById('client-guests-list');
  const guests = activeClientEvent.invitados_list || [];

  const totalDisplay = document.getElementById('cg-total');
  const confDisplay = document.getElementById('cg-confirmados');
  const pendDisplay = document.getElementById('cg-pendientes');

  totalDisplay.textContent = guests.length;
  confDisplay.textContent = guests.filter(g => g.confirmed).length;
  pendDisplay.textContent = guests.filter(g => !g.confirmed).length;

  if (guests.length === 0) {
    container.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">Aún no has agregado participantes.</td></tr>`;
  } else {
    container.innerHTML = guests.map((g, index) => `
      <tr>
        <td><strong>${g.name}</strong></td>
        <td>
          <span class="badge ${g.confirmed ? 'badge-confirmada' : 'badge-pendiente'}">
            ${g.confirmed ? 'Confirmado' : 'Pendiente'}
          </span>
        </td>
        <td>
          <button class="btn-qty-minus" style="display:inline-flex; width:26px; height:26px; font-size:0.75rem; border-radius:6px; margin-right:0.25rem;" onclick="editGuest(${index})" title="Editar">✏</button>
          <button class="btn-qty-minus" style="display:inline-flex; width:26px; height:26px; font-size:0.75rem; border-radius:6px; background-color:rgba(239, 68, 68, 0.1); border-color:var(--danger); color:var(--danger);" onclick="deleteGuest(${index})" title="Eliminar">🗑</button>
        </td>
      </tr>
    `).join('');
  }
}

window.editGuest = function(index) {
  const guest = activeClientEvent.invitados_list[index];
  document.getElementById('guest-index').value = index;
  document.getElementById('guest-name').value = guest.name;
  document.getElementById('guest-confirmed').checked = guest.confirmed;
  document.getElementById('form-invitado-container').style.display = 'block';
};

window.deleteGuest = async function(index) {
  if (confirm("¿Seguro que deseas eliminar este participante?")) {
    activeClientEvent.invitados_list.splice(index, 1);
    await DB.updateEvent(activeClientEvent.id, { invitados_list: activeClientEvent.invitados_list });
    renderClientGuests();
  }
};

document.getElementById('btn-agregar-invitado').addEventListener('click', () => {
  document.getElementById('guest-index').value = '';
  document.getElementById('guest-name').value = '';
  document.getElementById('guest-confirmed').checked = true;
  document.getElementById('form-invitado-container').style.display = 'block';
});

document.getElementById('btn-cancelar-invitado').addEventListener('click', () => {
  document.getElementById('form-invitado-container').style.display = 'none';
});

document.getElementById('btn-guardar-invitado').addEventListener('click', async () => {
  const index = document.getElementById('guest-index').value;
  const name = document.getElementById('guest-name').value;
  const confirmed = document.getElementById('guest-confirmed').checked;

  if (!name.trim()) {
    alert("Por favor, ingresa el nombre del participante.");
    return;
  }

  activeClientEvent.invitados_list = activeClientEvent.invitados_list || [];
  
  if (index !== '') {
    // Editar
    activeClientEvent.invitados_list[index] = { name, confirmed };
  } else {
    // Agregar
    activeClientEvent.invitados_list.push({ name, confirmed });
  }

  try {
    await DB.updateEvent(activeClientEvent.id, { invitados_list: activeClientEvent.invitados_list });
    document.getElementById('form-invitado-container').style.display = 'none';
    renderClientGuests();
  } catch (e) {
    alert("Error al guardar participante: " + e.message);
  }
});

// CLIENT TAB: CARROS & ALIMENTACIÓN
function renderClientMenuSelection() {
  const fieldsGrid = document.getElementById('client-menu-fields-grid');
  if (!fieldsGrid) return;

  if (!activeClientEvent.alimentos || activeClientEvent.alimentos.length === 0) {
    fieldsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:var(--text-muted);">No tienes contratado ningún carro de alimentación para este evento.</p>`;
    document.getElementById('btn-save-menu').style.display = 'none';
    return;
  }

  document.getElementById('btn-save-menu').style.display = 'inline-block';
  fieldsGrid.innerHTML = activeClientEvent.alimentos.map((ali, index) => {
    const prod = allProducts.alimentos.find(x => x.id === ali.id);
    const pName = prod ? prod.name : ali.id;
    return `
      <div class="form-group">
        <label for="menu-sabor-${index}">Especificaciones para: <strong>${pName}</strong> (x${ali.qty} porc.)</label>
        <input type="text" id="menu-sabor-${index}" value="${ali.sabores || ''}" placeholder="Ej: Sabores fresa/chicle, salsas tradicionales, etc.">
      </div>
    `;
  }).join('');
}

const formMenuSelection = document.getElementById('form-menu-seleccion');
if (formMenuSelection) {
  formMenuSelection.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    activeClientEvent.alimentos.forEach((ali, index) => {
      const input = document.getElementById(`menu-sabor-${index}`);
      if (input) {
        ali.sabores = input.value;
      }
    });

    try {
      await DB.updateEvent(activeClientEvent.id, { alimentos: activeClientEvent.alimentos });
      alert("¡Especificaciones de los carros de comida guardadas correctamente!");
    } catch (e) {
      alert("Error: " + e.message);
    }
  });
}

// CLIENT TAB: CRONOGRAMA DE ACTIVIDADES
function renderClientTimeline() {
  const container = document.getElementById('client-timeline-list');
  if (!container) return;

  const timeline = activeClientEvent.cronograma || [];
  if (timeline.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); text-align:center;">El cronograma está en proceso de diseño por el administrador.</p>`;
    return;
  }

  container.innerHTML = timeline.map((t, idx) => {
    let statusClass = '';
    if (t.estado === 'realizado') statusClass = 'completed';
    else if (t.estado === 'ejecucion') statusClass = 'active';

    return `
      <div class="timeline-item ${statusClass}">
        <span class="timeline-time">${t.hora}</span>
        <div class="timeline-title">${t.actividad}</div>
      </div>
    `;
  }).join('');
}

// CLIENT TAB: DOCUMENTOS, CONTRATO Y PAGOS
function renderClientPaymentsAndContract() {
  // Valores financieros
  const valTotal = activeClientEvent.valorTotal || 0;
  const abonosRealizados = (activeClientEvent.pagos || []).reduce((acc, p) => acc + p.valor, 0);
  const saldoPendiente = valTotal - abonosRealizados;

  document.getElementById('cd-total-value').textContent = `$${valTotal.toLocaleString()} COP`;
  document.getElementById('cd-abonos').textContent = `$${abonosRealizados.toLocaleString()} COP`;
  document.getElementById('cd-saldo').textContent = `$${saldoPendiente.toLocaleString()} COP`;

  // Historial de pagos
  const paymentsList = document.getElementById('client-payments-list');
  if (activeClientEvent.pagos && activeClientEvent.pagos.length > 0) {
    paymentsList.innerHTML = activeClientEvent.pagos.map(p => `
      <tr>
        <td>${p.fecha}</td>
        <td><strong>$${p.valor.toLocaleString()} COP</strong></td>
        <td><span style="font-size:0.8rem; color:var(--text-secondary);">${p.tipo}</span></td>
      </tr>
    `).join('');
  } else {
    paymentsList.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">No hay abonos registrados.</td></tr>`;
  }
}

// Panel de firma digital
const btnAbrirFirma = document.getElementById('btn-abrir-firma');
if (btnAbrirFirma) {
  btnAbrirFirma.addEventListener('click', () => {
    // Abrir modal de firma
    document.getElementById('modal-firma-contrato').classList.add('active');
    
    // Inicializar canvas de firma
    canvasSign = document.getElementById('signature-pad');
    const ctx = canvasSign.getContext('2d');
    ctx.clearRect(0, 0, canvasSign.width, canvasSign.height);

    let drawing = false;

    // Mouse events
    canvasSign.addEventListener('mousedown', () => drawing = true);
    canvasSign.addEventListener('mouseup', () => {
      drawing = false;
      ctx.beginPath();
    });
    canvasSign.addEventListener('mousemove', draw);

    // Touch events
    canvasSign.addEventListener('touchstart', (e) => {
      drawing = true;
      e.preventDefault();
    });
    canvasSign.addEventListener('touchend', (e) => {
      drawing = false;
      ctx.beginPath();
      e.preventDefault();
    });
    canvasSign.addEventListener('touchmove', drawTouch);

    function draw(e) {
      if (!drawing) return;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#050609'; // Tinta negra en fondo blanco
      
      const rect = canvasSign.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    function drawTouch(e) {
      if (!drawing) return;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#050609';
      
      const rect = canvasSign.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
      e.preventDefault();
    }
  });
}

const btnClearFirma = document.getElementById('btn-clear-signature');
if (btnClearFirma) {
  btnClearFirma.addEventListener('click', () => {
    if (canvasSign) {
      const ctx = canvasSign.getContext('2d');
      ctx.clearRect(0, 0, canvasSign.width, canvasSign.height);
    }
  });
}

const btnCloseModalFirma = document.getElementById('btn-cerrar-modal-firma');
if (btnCloseModalFirma) {
  btnCloseModalFirma.addEventListener('click', () => {
    document.getElementById('modal-firma-contrato').classList.remove('active');
  });
}

const btnGuardarFirma = document.getElementById('btn-guardar-signature');
if (btnGuardarFirma) {
  btnGuardarFirma.addEventListener('click', async () => {
    if (!canvasSign) return;
    
    // Guardar como DataURL base64
    const dataUrl = canvasSign.toDataURL();
    
    try {
      await DB.updateEvent(activeClientEvent.id, {
        contratoFirmado: true,
        firmaCliente: dataUrl
      });
      document.getElementById('modal-firma-contrato').classList.remove('active');
      alert("¡Contrato firmado digitalmente con éxito!");
      loadClienteView();
    } catch (e) {
      alert("Error al firmar: " + e.message);
    }
  });
}

// CLIENT TAB: FOTOGRAFÍA POST-EVENTO
function renderClientPhotography() {
  const countdownBox = document.getElementById('photo-countdown-container');
  const linkBox = document.getElementById('photo-link-container');
  const selectionBox = document.getElementById('photo-selection-container');
  
  clearInterval(photoCountdownInterval);

  if (!activeClientEvent.fechaPublicacionFotos) {
    // Aún no hay fotos
    countdownBox.style.display = 'none';
    linkBox.style.display = 'block';
    document.getElementById('photo-link-header').textContent = "Tus fotos están en cola";
    document.getElementById('photo-link-description').textContent = "Las fotografías oficiales de recreación serán publicadas y enlazadas pronto por el administrador después de la limpieza y edición digital.";
    document.getElementById('btn-client-photo-drive').style.display = 'none';
    selectionBox.style.display = 'none';
    return;
  }

  const pubDate = new Date(activeClientEvent.fechaPublicacionFotos).getTime();
  const now = new Date().getTime();

  if (now < pubDate) {
    // Mostrar cuenta regresiva de fotos
    countdownBox.style.display = 'block';
    linkBox.style.display = 'none';
    selectionBox.style.display = 'none';

    function updatePhotoTimer() {
      const current = new Date().getTime();
      const diff = pubDate - current;

      if (diff <= 0) {
        clearInterval(photoCountdownInterval);
        renderClientPhotography(); // Recargar para mostrar enlace
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      document.getElementById('photo-countdown-timer').innerHTML = `
        <div style="text-align: center; min-width: 50px; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); padding:0.4rem; border-radius:6px;">
          <strong style="color:var(--accent-gold); font-size:1.2rem;">${days}</strong><br><span style="font-size:0.6rem;">Días</span>
        </div>
        <div style="text-align: center; min-width: 50px; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); padding:0.4rem; border-radius:6px;">
          <strong style="color:var(--accent-gold); font-size:1.2rem;">${hours}</strong><br><span style="font-size:0.6rem;">Horas</span>
        </div>
        <div style="text-align: center; min-width: 50px; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); padding:0.4rem; border-radius:6px;">
          <strong style="color:var(--accent-gold); font-size:1.2rem;">${minutes}</strong><br><span style="font-size:0.6rem;">Min.</span>
        </div>
      `;
    }

    updatePhotoTimer();
    photoCountdownInterval = setInterval(updatePhotoTimer, 1000);
  } else {
    // Fotos disponibles
    countdownBox.style.display = 'none';
    linkBox.style.display = 'block';
    selectionBox.style.display = 'block';
    
    document.getElementById('photo-link-header').textContent = "¡Tus fotos están listas! 📸";
    document.getElementById('photo-link-description').textContent = "Puedes acceder a tu álbum de recreación en Google Drive para ver y descargar las fotos de Spiderman, los inflables y el show de magia haciendo clic aquí:";
    
    const driveLink = document.getElementById('btn-client-photo-drive');
    driveLink.style.display = 'inline-flex';
    driveLink.href = activeClientEvent.enlaceFotos || '#';

    // Rellenar comentarios/selección
    document.getElementById('client-photo-selection-text').value = activeClientEvent.seleccionFotos || '';
  }
}

// Guardar comentarios de fotos
const btnSavePhotoSel = document.getElementById('btn-client-save-photo-selection');
if (btnSavePhotoSel) {
  btnSavePhotoSel.addEventListener('click', async () => {
    const text = document.getElementById('client-photo-selection-text').value;
    try {
      await DB.updateEvent(activeClientEvent.id, { seleccionFotos: text });
      alert("¡Comentarios y selección de fotos guardados correctamente!");
    } catch (e) {
      alert("Error: " + e.message);
    }
  });
}

// WhatsApp del fotógrafo/admin
const btnPhotoWAAdmin = document.getElementById('btn-client-send-photo-admin-wa');
if (btnPhotoWAAdmin) {
  btnPhotoWAAdmin.addEventListener('click', () => {
    const text = document.getElementById('client-photo-selection-text').value;
    const settings = systemSettings || {};
    const phone = settings.telefonoContacto1 || '3163048505';
    const message = `Hola!%20Soy%20el%20cliente%20de%20evento%20${activeClientEvent.nombre}.%20Esta%20es%20mi%20selección%20de%20fotos:%20${encodeURIComponent(text)}`;
    window.open(`https://wa.me/57${phone.replace(/\D/g, '')}?text=${message}`, '_blank');
  });
}

// ==========================================
// VISTA: PANEL DE ADMINISTRACIÓN (INTRANET)
// ==========================================
async function loadAdminView() {
  setupTabs('view-admin');
  
  // Renderizar Calendario Mensual
  renderCalendar();

  // Renderizar Cotizaciones recibidas
  await renderAdminQuotations();

  // Renderizar Gestión de Usuarios
  await renderAdminUsers();

  // Renderizar Configuraciones y tema
  renderAdminSettings();

  // Renderizar Catálogo de Servicios
  await renderAdminProducts();

  // Renderizar Categorías
  await renderAdminCategories();
}

// 1. Calendario
function renderCalendar() {
  const container = document.getElementById('calendar-month-grid');
  if (!container) return;

  container.innerHTML = '';

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  document.getElementById('calendar-month-title').textContent = `${monthNames[currentMonth]} ${currentYear}`;

  // Cabecera de días
  const daysHeader = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  daysHeader.forEach(d => {
    const el = document.createElement('div');
    el.className = 'calendar-day-header';
    el.textContent = d;
    container.appendChild(el);
  });

  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday, 1 is Monday
  const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Ajustar a Lunes-Domingo
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  const prevMonthTotalDays = new Date(currentYear, currentMonth, 0).getDate();

  // Obtener eventos del mes
  DB.getEvents().then(events => {
    // Días del mes anterior
    for (let i = adjustedFirstDay; i > 0; i--) {
      const day = prevMonthTotalDays - i + 1;
      const el = document.createElement('div');
      el.className = 'calendar-day other-month';
      el.innerHTML = `<span class="calendar-day-num">${day}</span>`;
      container.appendChild(el);
    }

    // Días del mes actual
    const today = new Date();
    for (let day = 1; day <= totalDays; day++) {
      const el = document.createElement('div');
      el.className = 'calendar-day';
      
      const isToday = today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
      if (isToday) el.classList.add('today');

      el.innerHTML = `
        <span class="calendar-day-num">${day}</span>
        <div class="calendar-events-container" id="cal-events-${day}"></div>
      `;

      // Inyectar eventos de este día
      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = events.filter(e => e.fecha === dateString);
      
      const eventsContainer = el.querySelector('.calendar-events-container');
      dayEvents.forEach(evt => {
        const pill = document.createElement('div');
        pill.className = `calendar-event-pill ${evt.contratoFirmado ? '' : 'pending'}`;
        pill.textContent = evt.nombre;
        pill.title = `${evt.nombre} (${evt.horaInicio})`;
        pill.onclick = (e) => {
          e.stopPropagation();
          showEventDetailsModal(evt);
        };
        eventsContainer.appendChild(pill);
      });

      // Click para crear evento nuevo en esta fecha
      el.onclick = () => {
        if (getCurrentUser().role === 'superadmin') {
          showCreateEventModal(dateString);
        }
      };

      container.appendChild(el);
    }
  });
}

document.getElementById('btn-calendar-prev').addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
});

document.getElementById('btn-calendar-next').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
});

function showEventDetailsModal(event) {
  alert(`Detalles del Evento:\n\nNombre: ${event.nombre}\nFecha: ${event.fecha}\nHora: ${event.horaInicio}\nDirección: ${event.direccion}\nTotal: $${event.valorTotal.toLocaleString()} COP\nContrato Firmado: ${event.contratoFirmado ? 'SÍ' : 'NO'}`);
}

function showCreateEventModal(dateString) {
  const name = prompt(`Crear nuevo evento para la fecha ${dateString}\n\nIngresa el nombre del evento (Ej: Cumpleaños de Lucas):`);
  if (name) {
    const clientEmail = prompt("Ingresa el correo electrónico del cliente para vincular el evento:");
    if (!clientEmail) return;

    DB.getUsers().then(async users => {
      const client = users.find(u => u.email === clientEmail.toLowerCase());
      if (!client) {
        alert("El cliente no está registrado. Por favor créalo en la pestaña 'Usuarios' primero.");
        return;
      }

      try {
        await DB.createEvent({
          nombre: name,
          clienteId: client.uid,
          fecha: dateString,
          horaInicio: "15:00",
          direccion: "Dirección del evento",
          valorTotal: 300000,
          inflables: [],
          alimentos: [],
          shows: [],
          corporativos: [],
          adicionales: []
        });
        alert("¡Evento creado correctamente en el calendario!");
        renderCalendar();
      } catch (err) {
        alert("Error al crear evento: " + err.message);
      }
    });
  }
}

// 2. Gestión de Cotizaciones
async function renderAdminQuotations() {
  const container = document.getElementById('admin-quotes-list');
  if (!container) return;

  const query = (document.getElementById('admin-quotes-search')?.value || '').toLowerCase().trim();

  try {
    const quotes = await DB.getQuotations();
    const filtered = quotes.filter(q => {
      return (q.nombre || '').toLowerCase().includes(query) ||
             (q.email || '').toLowerCase().includes(query) ||
             (q.id || '').toLowerCase().includes(query) ||
             (q.fecha || '').toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
      container.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No se encontraron cotizaciones.</td></tr>`;
      return;
    }

    container.innerHTML = filtered.map(q => `
      <tr>
        <td><strong>${q.nombre}</strong><br><span style="font-size:0.75rem; color:var(--text-secondary);">${q.email}</span></td>
        <td>${q.fecha}</td>
        <td><strong>$${q.total.toLocaleString()} COP</strong></td>
        <td><span class="badge badge-${q.status}">${q.status.toUpperCase()}</span></td>
        <td>
          <button class="btn-qty-minus" style="display:inline-flex; width:26px; height:26px; font-size:0.75rem;" onclick="viewQuotationDetails('${q.id}')" title="Ver detalles/Aprobar">🔍</button>
          <button class="btn-qty-minus" style="display:inline-flex; width:26px; height:26px; font-size:0.75rem; background-color:rgba(239, 68, 68, 0.1); border-color:var(--danger); color:var(--danger);" onclick="deleteQuotation('${q.id}')" title="Eliminar">🗑</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

window.viewQuotationDetails = async function(id) {
  try {
    const quotes = await DB.getQuotations();
    const q = quotes.find(x => x.id === id);
    if (!q) return;

    const details = `
      Cotización de ${q.nombre} (${q.telefono})
      Fecha del evento: ${q.fecha}
      Servicios Seleccionados:
      - Inflables: ${q.inflables.join(', ') || 'Ninguno'}
      - Snacks: ${q.alimentos.map(a => `${a.id} (x${a.qty})`).join(', ') || 'Ninguno'}
      - Shows: ${q.shows.join(', ') || 'Ninguno'}
      - Adicionales: ${q.adicionales.join(', ') || 'Ninguno'}
      
      Total Estimado: $${q.total.toLocaleString()} COP
    `;

    if (confirm(`${details}\n\n¿Deseas APROBAR esta cotización y convertirla en reserva/evento activo?`)) {
      // 1. Crear usuario cliente si no existe o buscarlo
      let clientUser;
      try {
        const users = await DB.getUsers();
        clientUser = users.find(u => u.email === q.email.toLowerCase());
        
        if (!clientUser) {
          // Auto-crear cliente
          clientUser = await registerNewUser(q.email, "123456", q.nombre, "cliente", q.telefono);
          alert(`Hemos registrado una nueva cuenta de cliente para ${q.nombre} (Usuario: ${q.email} / Clave: 123456).`);
        }

        // 2. Crear evento vinculado
        await DB.createEvent({
          nombre: `Recreación de ${q.nombre}`,
          clienteId: clientUser.uid,
          fecha: q.fecha,
          horaInicio: "14:00",
          direccion: "A convenir con el cliente",
          invitados: q.invitados || 30,
          inflables: q.inflables,
          alimentos: q.alimentos,
          shows: q.shows,
          corporativos: q.corporativos,
          adicionales: q.adicionales,
          valorTotal: q.total,
          contratoFirmado: false
        });

        // 3. Actualizar estado cotización
        await DB.updateQuotationStatus(q.id, 'aprobada');
        alert("¡Cotización aprobada y convertida en Evento activo en el Calendario!");
        loadAdminView();
      } catch (e) {
        alert("Error al procesar aprobación: " + e.message);
      }
    }
  } catch (err) {
    alert("Error al obtener detalles: " + err.message);
  }
};

window.deleteQuotation = async function(id) {
  if (confirm("¿Estás seguro de eliminar esta cotización?")) {
    await DB.deleteQuotation(id);
    renderAdminQuotations();
  }
};

// 3. Gestión de Usuarios
async function renderAdminUsers() {
  const container = document.getElementById('admin-users-list');
  if (!container) return;

  try {
    const users = await DB.getUsers();
    container.innerHTML = users.map(u => `
      <tr>
        <td><strong>${u.name}</strong></td>
        <td>${u.email}</td>
        <td><span class="badge badge-confirmada">${translateRole(u.role).toUpperCase()}</span></td>
        <td>${u.phone || 'N/A'}</td>
        <td>
          <button class="btn-qty-minus" style="display:inline-flex; width:26px; height:26px; font-size:0.75rem; background-color:rgba(239, 68, 68, 0.1); border-color:var(--danger); color:var(--danger);" onclick="deleteUser('${u.uid}')" title="Eliminar">🗑</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

window.deleteUser = async function(uid) {
  if (uid === getCurrentUser().uid) {
    alert("No puedes eliminar tu propia cuenta.");
    return;
  }
  if (confirm("¿Seguro que deseas eliminar este usuario?")) {
    await DB.deleteUser(uid);
    renderAdminUsers();
  }
};

const formCreateUser = document.getElementById('form-admin-user');
if (formCreateUser) {
  formCreateUser.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('usr-email').value;
    const name = document.getElementById('usr-nombre').value;
    const role = document.getElementById('usr-rol').value;
    const phone = document.getElementById('usr-telefono').value;
    const pass = document.getElementById('usr-password').value || "123456";

    try {
      await registerNewUser(email, pass, name, role, phone);
      alert("¡Usuario creado con éxito!");
      formCreateUser.reset();
      renderAdminUsers();
    } catch (err) {
      alert("Error al crear usuario: " + err.message);
    }
  });
}

// 4. Configuraciones Generales y Tema
function renderAdminSettings() {
  const settings = systemSettings || {};
  
  document.getElementById('sett-business-name').value = settings.businessName || '';
  document.getElementById('sett-business-subtitle').value = settings.businessSubtitle || '';
  document.getElementById('sett-contact-phone').value = settings.telefonoContacto1 || '';
  document.getElementById('sett-theme-palette').value = settings.themePalette || 'emerald';
  document.getElementById('sett-theme-font').value = settings.themeFont || 'outfit';
}

const formSettings = document.getElementById('form-admin-settings');
if (formSettings) {
  formSettings.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const settings = {
      businessName: document.getElementById('sett-business-name').value,
      businessSubtitle: document.getElementById('sett-business-subtitle').value,
      telefonoContacto1: document.getElementById('sett-contact-phone').value,
      themePalette: document.getElementById('sett-theme-palette').value,
      themeFont: document.getElementById('sett-theme-font').value
    };

    try {
      await DB.saveSettings(settings);
      alert("¡Configuraciones guardadas y aplicadas con éxito!");
      window.location.reload();
    } catch (err) {
      alert("Error al guardar: " + err.message);
    }
  });
}

// ==========================================
// CONTROLADOR DE CATÁLOGO Y PRODUCTOS (CRUD)
// ==========================================



function translateProductCategory(cat) {
  const c = allCategories.find(x => x.id === cat);
  return c ? c.name : cat;
}

async function renderAdminProducts() {
  const container = document.getElementById('admin-products-list');
  if (!container) return;

  const query = (document.getElementById('admin-products-search')?.value || '').toLowerCase().trim();

  try {
    const products = await DB.getProducts();
    let html = '';
    
    allCategories.forEach(cat => {
      const catProducts = products[cat.id] || [];
      catProducts.forEach(p => {
        const matchesQuery = (p.name || '').toLowerCase().includes(query) || 
                             (p.description || '').toLowerCase().includes(query) || 
                             (cat.name || '').toLowerCase().includes(query);
        if (!matchesQuery && query !== '') return;

        let extraInfo = '';
        if (cat.extraField === 'capacity') {
          extraInfo = `${cat.extraLabel || 'Capacidad'}: ${p.capacity || 'N/A'}`;
        } else if (cat.extraField === 'duration') {
          extraInfo = `${cat.extraLabel || 'Duración'}: ${p.duration || 'N/A'}`;
        } else if (cat.extraField === 'minQty') {
          extraInfo = `${cat.extraLabel || 'Cantidad Mínima'}: ${p.minQty || 'N/A'}`;
        }

        html += `
          <tr>
            <td><span class="badge badge-confirmada" style="font-size:0.75rem;">${cat.name.toUpperCase()}</span></td>
            <td>
              <strong>${p.name}</strong><br>
              <span style="font-size:0.75rem; color:var(--text-secondary);">${p.description}</span><br>
              ${p.viewLink ? `<a href="${p.viewLink}" target="_blank" style="font-size:0.75rem; color:var(--accent-gold); text-decoration:underline; font-weight:600; display:inline-block; margin-top:0.25rem;">📸 Enlace de Visualización</a><br>` : ''}
              <span style="font-size:0.75rem; color:var(--accent-gold); font-weight:600;">${extraInfo}</span>
            </td>
            <td><strong>$${p.price.toLocaleString()} COP</strong></td>
            <td>
              <button class="btn-qty-minus" style="display:inline-flex; width:26px; height:26px; font-size:0.75rem;" onclick="editProduct('${cat.id}', '${p.id}')" title="Editar">✏</button>
              <button class="btn-qty-minus" style="display:inline-flex; width:26px; height:26px; font-size:0.75rem; background-color:rgba(239, 68, 68, 0.1); border-color:var(--danger); color:var(--danger);" onclick="deleteProduct('${p.id}', '${cat.id}')" title="Eliminar">🗑</button>
            </td>
          </tr>
        `;
      });
    });

    if (html === '') {
      container.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No se encontraron productos coincidentes.</td></tr>`;
    } else {
      container.innerHTML = html;
    }
  } catch (err) {
    console.error("Error al renderizar catálogo:", err);
  }
}

window.editProduct = async function(category, id) {
  try {
    const products = await DB.getProducts();
    const list = products[category] || [];
    const p = list.find(x => x.id === id);
    if (!p) return;

    document.getElementById('admin-product-form-title').textContent = "Editar Servicio";
    document.getElementById('prod-id').value = p.id;
    document.getElementById('prod-category').value = category;
    document.getElementById('prod-category').disabled = true;
    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-price').value = p.price;
    document.getElementById('prod-desc').value = p.description;
    document.getElementById('prod-link').value = p.viewLink || '';

    updateDynamicProductFields(category);

    const cat = allCategories.find(c => c.id === category);
    if (cat) {
      if (cat.extraField === 'capacity') {
        document.getElementById('prod-capacity').value = p.capacity || '';
      } else if (cat.extraField === 'duration') {
        document.getElementById('prod-duration').value = p.duration || '';
      } else if (cat.extraField === 'minQty') {
        document.getElementById('prod-minqty').value = p.minQty || '';
      }
    }
    
    document.getElementById('prod-name').focus();
  } catch (err) {
    alert("Error al cargar producto: " + err.message);
  }
};

window.deleteProduct = async function(id, category) {
  if (confirm("¿Estás seguro de eliminar este producto del catálogo?\nEsto afectará las futuras cotizaciones.")) {
    try {
      await DB.deleteProduct(id, category);
      alert("Producto eliminado con éxito.");
      await loadCommonData();
      await renderAdminProducts();
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    }
  }
};

function resetProductForm() {
  document.getElementById('form-admin-product').reset();
  document.getElementById('prod-id').value = '';
  document.getElementById('prod-link').value = '';
  document.getElementById('prod-category').disabled = false;
  document.getElementById('admin-product-form-title').textContent = "Agregar Nuevo Servicio";
  
  if (allCategories.length > 0) {
    updateDynamicProductFields(allCategories[0].id);
  }
}

function updateDynamicProductFields(catId) {
  document.querySelectorAll('.din-prod-field').forEach(field => field.style.display = 'none');
  
  const cat = allCategories.find(c => c.id === catId);
  if (!cat) return;

  if (cat.extraField === 'capacity') {
    document.getElementById('prod-field-capacity').style.display = 'block';
    if (cat.extraLabel) {
      document.querySelector('#prod-field-capacity label').textContent = cat.extraLabel;
    }
  } else if (cat.extraField === 'duration') {
    document.getElementById('prod-field-duration').style.display = 'block';
    if (cat.extraLabel) {
      document.querySelector('#prod-field-duration label').textContent = cat.extraLabel;
    }
  } else if (cat.extraField === 'minQty') {
    document.getElementById('prod-field-minqty').style.display = 'block';
    if (cat.extraLabel) {
      document.querySelector('#prod-field-minqty label').textContent = cat.extraLabel;
    }
  }
}

// Vincular escuchadores del CRUD de catálogo a nivel de módulo
const prodCategorySelect = document.getElementById('prod-category');
if (prodCategorySelect) {
  prodCategorySelect.addEventListener('change', (e) => {
    updateDynamicProductFields(e.target.value);
  });
}

const btnCancelEditProd = document.getElementById('btn-cancel-edit-product');
if (btnCancelEditProd) {
  btnCancelEditProd.addEventListener('click', resetProductForm);
}

const formAdminProduct = document.getElementById('form-admin-product');
if (formAdminProduct) {
  formAdminProduct.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    const category = document.getElementById('prod-category').value;
    const name = document.getElementById('prod-name').value;
    const price = parseInt(document.getElementById('prod-price').value);
    const description = document.getElementById('prod-desc').value;
    const viewLink = document.getElementById('prod-link').value;

    const product = {
      name,
      price,
      description,
      viewLink
    };

    if (id) {
      product.id = id;
    }

    const cat = allCategories.find(c => c.id === category);
    if (cat) {
      if (cat.extraField === 'capacity') {
        product.capacity = document.getElementById('prod-capacity').value;
      } else if (cat.extraField === 'duration') {
        product.duration = document.getElementById('prod-duration').value;
      } else if (cat.extraField === 'minQty') {
        product.minQty = parseInt(document.getElementById('prod-minqty').value) || 50;
      }
    }

    try {
      await DB.saveProduct({ category, ...product });
      alert(id ? "¡Servicio actualizado con éxito!" : "¡Servicio añadido con éxito al catálogo!");
      resetProductForm();
      await loadCommonData();
      await renderAdminProducts();
    } catch (err) {
      alert("Error al guardar producto: " + err.message);
    }
  });
}


// ==========================================
// CONTROLADOR DE CATEGORÍAS (CRUD)
// ==========================================

async function renderAdminCategories() {
  const container = document.getElementById('admin-categories-list');
  if (!container) return;

  try {
    const categories = await DB.getCategories();
    container.innerHTML = categories.map(c => {
      let fieldType = 'Fijo';
      if (c.extraField === 'capacity') fieldType = `Capacidad (${c.extraLabel})`;
      else if (c.extraField === 'duration') fieldType = `Duración (${c.extraLabel})`;
      else if (c.extraField === 'minQty') fieldType = `Cantidad Mínima (${c.extraLabel})`;

      return `
        <tr>
          <td><code>${c.id}</code></td>
          <td>
            <strong>${c.name}</strong><br>
            <span style="font-size:0.75rem; color:var(--text-secondary);">${c.description}</span>
          </td>
          <td><span style="font-size:0.8rem; font-weight:600; color:var(--accent-gold);">${fieldType}</span></td>
          <td>
            <button class="btn-qty-minus" style="display:inline-flex; width:26px; height:26px; font-size:0.75rem;" onclick="editCategory('${c.id}')" title="Editar">✏</button>
            <button class="btn-qty-minus" style="display:inline-flex; width:26px; height:26px; font-size:0.75rem; background-color:rgba(239, 68, 68, 0.1); border-color:var(--danger); color:var(--danger);" onclick="deleteCategory('${c.id}')" title="Eliminar">🗑</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error("Error al renderizar categorías:", err);
  }
}

window.editCategory = async function(id) {
  try {
    const categories = await DB.getCategories();
    const c = categories.find(x => x.id === id);
    if (!c) return;

    document.getElementById('admin-category-form-title').textContent = "Editar Categoría";
    document.getElementById('cat-id').value = c.id;
    document.getElementById('cat-name').value = c.name;
    document.getElementById('cat-desc').value = c.description;
    document.getElementById('cat-extrafield').value = c.extraField || 'none';
    document.getElementById('cat-extralabel').value = c.extraLabel || '';
    
    // Enfocar
    document.getElementById('cat-name').focus();
  } catch (err) {
    alert("Error al cargar categoría: " + err.message);
  }
};

window.deleteCategory = async function(id) {
  const systemCats = ['inflables', 'alimentos', 'shows', 'corporativos', 'adicionales'];
  if (systemCats.includes(id)) {
    alert("No se pueden eliminar las categorías base del sistema.");
    return;
  }

  if (confirm("¿Estás seguro de eliminar esta categoría?\nATENCIÓN: Todos los productos/servicios asociados a esta categoría se eliminarán también de forma permanente.")) {
    try {
      await DB.deleteCategory(id);
      alert("Categoría eliminada con éxito.");
      await loadCommonData();
      await renderAdminProducts();
      await renderAdminCategories();
    } catch (err) {
      alert("Error al eliminar categoría: " + err.message);
    }
  }
};

function resetCategoryForm() {
  document.getElementById('form-admin-category').reset();
  document.getElementById('cat-id').value = '';
  document.getElementById('admin-category-form-title').textContent = "Agregar Nueva Categoría";
}

// Vincular escuchadores de categorías a nivel de módulo
const btnCancelEditCat = document.getElementById('btn-cancel-edit-category');
if (btnCancelEditCat) {
  btnCancelEditCat.addEventListener('click', resetCategoryForm);
}

const formAdminCategory = document.getElementById('form-admin-category');
if (formAdminCategory) {
  formAdminCategory.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('cat-id').value;
    const name = document.getElementById('cat-name').value;
    const description = document.getElementById('cat-desc').value;
    const extraField = document.getElementById('cat-extrafield').value;
    const extraLabel = document.getElementById('cat-extralabel').value;

    const category = {
      name,
      description,
      extraField,
      extraLabel
    };

    if (id) {
      category.id = id;
    }

    try {
      await DB.saveCategory(category);
      alert(id ? "¡Categoría actualizada con éxito!" : "¡Categoría creada con éxito!");
      resetCategoryForm();
      await loadCommonData();
      await renderAdminProducts();
      await renderAdminCategories();
    } catch (err) {
      alert("Error al guardar categoría: " + err.message);
    }
  });
}


// ==========================================
// VISTA: INSUMOS E INVENTARIO (COMPRAS)
// ==========================================
async function loadComprasView() {
  setupTabs('view-compras');
  
  const container = document.getElementById('compras-inventory-list');
  if (!container) return;

  try {
    const items = await DB.getInventory();
    if (items.length === 0) {
      container.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No hay insumos en el inventario.</td></tr>`;
      return;
    }

    container.innerHTML = items.map(i => {
      const isLow = parseFloat(i.cantidad) < parseFloat(i.minimo);
      return `
        <tr style="${isLow ? 'background:rgba(239,68,68,0.05);' : ''}">
          <td><strong>${i.name}</strong></td>
          <td>${i.cantidad} ${i.unidad}</td>
          <td>${i.categoria.toUpperCase()}</td>
          <td>
            ${isLow ? `<span class="badge badge-rechazada">Bajo Stock</span>` : `<span class="badge badge-aprobada">Óptimo</span>`}
          </td>
          <td>
            <button class="btn-qty-minus" style="display:inline-flex; width:26px; height:26px; font-size:0.75rem;" onclick="editInventoryItem('${i.id}')" title="Ajustar Stock">✏</button>
            <button class="btn-qty-minus" style="display:inline-flex; width:26px; height:26px; font-size:0.75rem; background-color:rgba(239, 68, 68, 0.1); border-color:var(--danger); color:var(--danger);" onclick="deleteInventoryItem('${i.id}')" title="Eliminar">🗑</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
  }
}

window.editInventoryItem = async function(id) {
  try {
    const items = await DB.getInventory();
    const item = items.find(x => x.id === id);
    if (!item) return;

    const qtyString = prompt(`Ajustar stock para "${item.name}"\nCantidad actual: ${item.cantidad} ${item.unidad}\n\nIngresa la nueva cantidad:`, item.cantidad);
    if (qtyString !== null) {
      const cantidad = parseFloat(qtyString);
      if (isNaN(cantidad)) {
        alert("Cantidad no válida.");
        return;
      }
      item.cantidad = cantidad;
      await DB.updateInventoryItem(item);
      alert("Stock actualizado con éxito.");
      loadComprasView();
    }
  } catch (e) {
    alert("Error al editar: " + e.message);
  }
};

window.deleteInventoryItem = async function(id) {
  if (confirm("¿Estás seguro de eliminar este insumo del inventario?")) {
    await DB.deleteInventoryItem(id);
    loadComprasView();
  }
};

const formInventoryItem = document.getElementById('form-compras-item');
if (formInventoryItem) {
  formInventoryItem.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('i-nombre').value;
    const cantidad = parseFloat(document.getElementById('i-cantidad').value);
    const unidad = document.getElementById('i-unidad').value;
    const categoria = document.getElementById('i-categoria').value;
    const minimo = parseFloat(document.getElementById('i-minimo').value);

    try {
      await DB.updateInventoryItem({ name, cantidad, unidad, categoria, minimo });
      alert("¡Insumo añadido al inventario!");
      formInventoryItem.reset();
      loadComprasView();
    } catch (err) {
      alert("Error: " + err.message);
    }
  });
}

// ==========================================
// VISTA: OPERACIONES (RECREADORES Y LOGÍSTICA)
// ==========================================
async function loadOperativoView() {
  const container = document.getElementById('operativo-events-list');
  if (!container) return;

  try {
    const events = await DB.getEvents();
    if (events.length === 0) {
      container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:2rem;">No tienes asignaciones de shows o logística.</div>`;
      return;
    }

    container.innerHTML = events.map(e => `
      <div class="card" style="margin-bottom:1.5rem; padding:1.5rem;">
        <div class="flex-between" style="align-items:center;">
          <h3 style="color:var(--accent-gold); font-family:var(--font-title); font-size:1.2rem;">${e.nombre}</h3>
          <span class="badge ${e.contratoFirmado ? 'badge-aprobada' : 'badge-pendiente'}">
            ${e.contratoFirmado ? 'Confirmado' : 'Sin Firma'}
          </span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.5rem; display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:0.5rem;">
          <div>📅 Fecha: <strong>${e.fecha}</strong></div>
          <div>⏰ Hora: <strong>${e.horaInicio}</strong></div>
          <div>📍 Lugar: <strong>${e.direccion}</strong></div>
          <div>👥 Participantes: <strong>${e.invitados}</strong></div>
        </div>
        <div style="margin-top:1rem; border-top:1px solid var(--glass-border); padding-top:1rem;">
          <strong style="font-size:0.85rem;">Cronograma del Show (Hacer clic para marcar realizado):</strong>
          <div style="display:flex; flex-direction:column; gap:0.5rem; margin-top:0.5rem;">
            ${(e.cronograma || []).map((t, idx) => `
              <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; cursor:pointer;" onclick="toggleCronogramaItem('${e.id}', ${idx})">
                <input type="checkbox" ${t.estado === 'realizado' ? 'checked' : ''} style="accent-color:var(--accent-gold);">
                <span style="${t.estado === 'realizado' ? 'text-decoration:line-through; color:var(--text-muted);' : ''}">
                  <strong>${t.hora}</strong> - ${t.actividad}
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

window.toggleCronogramaItem = async function(eventId, itemIdx) {
  try {
    const events = await DB.getEvents();
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const item = event.cronograma[itemIdx];
    item.estado = item.estado === 'realizado' ? 'pendiente' : 'realizado';
    
    await DB.updateEvent(eventId, { cronograma: event.cronograma });
    loadOperativoView();
  } catch (e) {
    alert("Error al actualizar actividad: " + e.message);
  }
};

// ==========================================
// HELPERS Y BINDING GENERAL DE EVENTOS
// ==========================================

// Configuración de pestañas (Tabs switcher)
function setupTabs(viewId) {
  const container = document.getElementById(viewId);
  if (!container) return;

  const tabButtons = container.querySelectorAll('.tab-btn');
  const tabContents = container.querySelectorAll('.tab-content');

  // Limpiar listeners anteriores clonando botones
  tabButtons.forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
  });

  const refreshedButtons = container.querySelectorAll('.tab-btn');

  refreshedButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      
      refreshedButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetContent = container.querySelector(`#${tabId}`);
      if (targetContent) targetContent.classList.add('active');

      selectedTab[viewId] = tabId;
    });
  });

  // Activar la primera pestaña por defecto si no hay seleccionada
  if (!selectedTab[viewId]) {
    const firstBtn = refreshedButtons[0];
    if (firstBtn) firstBtn.click();
  } else {
    const savedBtn = container.querySelector(`[data-tab="${selectedTab[viewId]}"]`);
    if (savedBtn) savedBtn.click();
  }
}

// Notificaciones Polling
function checkNotifications() {
  DB.getNotifications().then(notifications => {
    allNotifications = notifications;
    const unread = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notification-badge');
    if (badge) {
      if (unread > 0) {
        badge.textContent = unread;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    }
  });
}

function startNotificationPolling() {
  stopNotificationPolling();
  checkNotifications();
  notificationInterval = setInterval(checkNotifications, 15000); // Cada 15 segundos
}

function stopNotificationPolling() {
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
  }
}

// Modal de notificaciones
const bellBtn = document.getElementById('btn-notification-bell');
if (bellBtn) {
  bellBtn.addEventListener('click', () => {
    document.getElementById('modal-notifications').classList.add('active');
    renderNotificationsModalList();
  });
}

document.getElementById('btn-cerrar-modal-notifications').addEventListener('click', () => {
  document.getElementById('modal-notifications').classList.remove('active');
});

async function renderNotificationsModalList() {
  const container = document.getElementById('notifications-list');
  if (!container) return;

  try {
    const notifications = await DB.getNotifications();
    if (notifications.length === 0) {
      container.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 2rem 0;">No tienes notificaciones en este momento.</p>`;
      return;
    }

    container.innerHTML = notifications.map(n => `
      <div style="padding:1rem; border-bottom:1px solid var(--glass-border); display:flex; justify-content:space-between; align-items:center; background:${n.read ? 'transparent' : 'rgba(16,185,129,0.05)'};">
        <div>
          <p style="font-size:0.9rem; font-weight:${n.read ? 'normal' : 'bold'}; color:var(--text-primary);">${n.text}</p>
          <span style="font-size:0.75rem; color:var(--text-muted);">${new Date(n.date).toLocaleString()}</span>
        </div>
        ${n.read ? '' : `<button class="btn-qty-minus" style="font-size:0.7rem; border-radius:4px; padding:0.25rem 0.5rem;" onclick="readNotification('${n.id}')">Leído</button>`}
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

window.readNotification = async function(id) {
  await DB.markNotificationRead(id);
  checkNotifications();
  renderNotificationsModalList();
};

document.getElementById('btn-notifications-read-all').addEventListener('click', async () => {
  await DB.markAllNotificationsRead();
  checkNotifications();
  renderNotificationsModalList();
});
