// Servicio de Base de Datos y API para Megarecreación

// Wrappers de almacenamiento seguro para evitar SecurityErrors en file:// y navegación privada
export function getStorageItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

export function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    return false;
  }
}

export function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    return false;
  }
}

function getAuthToken() {
  return getStorageItem('megarecreacion_token');
}

export function isUsingMock() {
  return getStorageItem('megarecreacion_force_mock') === 'true';
}

// Helper para llamadas API REST
async function apiCall(url, method = 'GET', body = null) {
  // Si estamos en modo simulador (Mock), redirigir a la simulación local
  if (isUsingMock()) {
    return await mockApiCall(url, method, body);
  }

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const token = getAuthToken();
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        const hadToken = !!getStorageItem('megarecreacion_token');
        removeStorageItem('megarecreacion_token');
        removeStorageItem('megarecreacion_current_user');
        if (hadToken) {
          alert("Tu sesión ha expirado. Por favor, inicia sesión de nuevo.");
          window.location.reload();
        }
        return;
      }
      throw new Error(errorData.error || `Error del servidor (${response.status})`);
    }
    return await response.json();
  } catch (error) {
    console.warn("Error en la conexión con el servidor. ¿Deseas activar el modo simulador local?", error);
    // Si falla la conexión con el servidor por primera vez, sugerir activar el modo simulador
    if (confirm("No se pudo conectar con el servidor backend de Megarecreación.\n\n¿Deseas activar el Modo Simulador local para probar la aplicación de inmediato en tu navegador?")) {
      setStorageItem('megarecreacion_force_mock', 'true');
      window.location.reload();
    }
    throw error;
  }
}

// ==========================================
// MOTOR DE BASE DE DATOS LOCAL (FALLBACK MOCK)
// ==========================================

// Inicializar base de datos local en LocalStorage si no existe
function getLocalDB() {
  let db = getStorageItem('megarecreacion_local_db');
  if (!db) {
    // Estructura semilla idéntica a db.json
    const semilla = {
      settings: {
        businessName: "Megarecreación",
        businessSubtitle: "Inflables, Carros de Comida y Eventos",
        businessLogoUrl: "assets/logo.jpg",
        contractText: "<h4 style=\"text-align: center; margin-bottom: 1rem;\">CONTRATO DE PRESTACIÓN DE SERVICIOS - MEGARECREACIÓN</h4><p>Contrato de servicios recreativos y alquiler de equipos...",
        telefonoContacto1: "3163048505",
        telefonoContacto2: "3197188973",
        themePalette: "emerald",
        themeFont: "outfit",
        themeFontSize: "16px"
      },
      products: {
        inflables: [
          { id: "inf-castillo", name: "Castillo Inflable Multicolor", price: 180000, description: "Medidas: 3m x 3m. Para niños de 3 a 7 años. Con soplador y operario.", capacity: "8 niños" },
          { id: "inf-tobogan", name: "Tobogán Gigante con Piscina", price: 280000, description: "Medidas: 6m x 3.5m. Seco o agua. Con soplador y operario.", capacity: "12 niños" }
        ],
        alimentos: [
          { id: "ali-hotdogs", name: "Carro de Perros Calientes (Hot Dogs)", price: 4000, description: "Perros calientes con salsas y papita picada. Mínimo 50 porciones.", minQty: 50 },
          { id: "ali-algodon", name: "Carro de Algodón de Azúcar", price: 3000, description: "Algodón gigante rosa y azul. Mínimo 50 porciones.", minQty: 50 }
        ],
        shows: [
          { id: "sho-basico", name: "Recreación y Animación Básica", price: 220000, description: "3 horas, 2 animadores, juegos, bailes, globos y pintacaritas.", duration: "3 horas" }
        ],
        corporativos: [
          { id: "corp-pausas", name: "Pausas Activas Temáticas", price: 180000, description: "Sesión de 30-40 minutos de gimnasia mental y física laboral.", duration: "40 minutos" }
        ],
        adicionales: [
          { id: "adi-sonido", name: "Sonido Profesional y Luces", price: 150000, description: "Cabina de sonido, luces audiorítmicas y micrófono por 4 horas." }
        ]
      },
      users: [
        { uid: "user-admin", email: "admin@megarecreacion.com", name: "Mauricio Gómez", role: "superadmin" },
        { uid: "user-cliente", email: "cliente@megarecreacion.com", name: "Familia Restrepo", role: "cliente", eventId: "evt-demo-1" }
      ],
      quotations: [],
      events: [
        {
          id: "evt-demo-1",
          nombre: "Cumpleaños de Tomás Restrepo",
          clienteId: "user-cliente",
          fecha: "2026-08-30",
          horaInicio: "14:00",
          direccion: "Calle 45 # 12-34, Envigado",
          invitados: 50,
          inflables: ["inf-castillo"],
          alimentos: [{"id": "ali-hotdogs", "qty": 50, "sabores": "Ketchup y papitas"}],
          shows: ["sho-basico"],
          corporativos: [],
          adicionales: ["adi-sonido"],
          contratoFirmado: false,
          valorTotal: 550000,
          pagos: [],
          saldoPendiente: 550000,
          citas: [],
          cronograma: [
            { hora: "13:00", actividad: "Montaje e inflado del castillo", estado: "pendiente" },
            { hora: "14:00", actividad: "Llegada del recreador y bienvenida", estado: "pendiente" }
          ],
          recreadoresAsignados: ["user-recreador"],
          logisticaAsignados: ["user-logistica"]
        }
      ],
      inventory: [],
      recipes: [],
      providers: [],
      notifications: [],
      backups: []
    };
    setStorageItem('megarecreacion_local_db', JSON.stringify(semilla));
    return semilla;
  }
  try {
    return JSON.parse(db) || semilla;
  } catch (e) {
    return semilla;
  }
}

function saveLocalDB(db) {
  setStorageItem('megarecreacion_local_db', JSON.stringify(db));
}

// Simulador de API local
async function mockApiCall(url, method, body) {
  // Simular delay de red corto
  await new Promise(resolve => setTimeout(resolve, 150));
  const db = getLocalDB();

  // 1.1. Categories
  if (url === '/api/categories') {
    if (method === 'POST') {
      const category = body;
      if (!category.id) {
        category.id = category.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
        if (db.categories.some(c => c.id === category.id)) {
          category.id = `${category.id}-${Date.now()}`;
        }
      }
      const index = db.categories.findIndex(c => c.id === category.id);
      if (index !== -1) {
        db.categories[index] = { ...db.categories[index], ...category };
      } else {
        db.categories.push(category);
        db.products = db.products || {};
        db.products[category.id] = [];
      }
      saveLocalDB(db);
      return category;
    }
    if (!db.categories) {
      db.categories = [
        { id: "inflables", name: "Inflables", description: "Selecciona los inflables que deseas alquilar. Todos incluyen montaje y operario.", extraField: "capacity", extraLabel: "Capacidad" },
        { id: "alimentos", name: "Carros de Comida", description: "Carritos clásicos de feria con porciones ilimitadas. Haz clic para seleccionar y ajustar porciones.", extraField: "minQty", extraLabel: "Cantidad Mínima" },
        { id: "shows", name: "Shows y Animaciones", description: "Animadores profesionales, shows temáticos y dinámicas cooperativas.", extraField: "duration", extraLabel: "Duración" },
        { id: "corporativos", name: "Pausas Activas y Corporativo", description: "Actividades recreativas dirigidas para empresas e integraciones.", extraField: "duration", extraLabel: "Duración" },
        { id: "adicionales", name: "Adicionales y Sonido", description: "Servicios complementarios de sonido, luces y efectos especiales.", extraField: "none", extraLabel: "" }
      ];
      saveLocalDB(db);
    }
    return db.categories;
  }

  if (url.startsWith('/api/categories/')) {
    const id = url.split('/').pop();
    db.categories = (db.categories || []).filter(c => c.id !== id);
    if (db.products && db.products[id]) {
      delete db.products[id];
    }
    saveLocalDB(db);
    return { success: true };
  }

  // 1. Settings
  if (url === '/api/settings') {
    if (method === 'POST') {
      db.settings = { ...db.settings, ...body };
      saveLocalDB(db);
    }
    return db.settings;
  }

  // 2. Products
  if (url === '/api/products') {
    if (method === 'POST') {
      const { category, product } = body;
      if (!product.id) product.id = `prod-${Date.now()}`;
      db.products[category] = db.products[category] || [];
      const index = db.products[category].findIndex(p => p.id === product.id);
      if (index !== -1) db.products[category][index] = product;
      else db.products[category].push(product);
      saveLocalDB(db);
      return product;
    }
    return db.products;
  }

  if (url.startsWith('/api/products/')) {
    const id = url.split('/').pop().split('?')[0];
    const category = new URLSearchParams(url.split('?')[1]).get('category');
    if (db.products[category]) {
      db.products[category] = db.products[category].filter(p => p.id !== id);
    }
    saveLocalDB(db);
    return { success: true };
  }

  // 3. Quotations
  if (url === '/api/quotations') {
    if (method === 'POST') {
      body.id = `q-${Date.now()}`;
      body.status = 'pendiente';
      body.date = new Date().toISOString();
      db.quotations.push(body);
      db.notifications.push({ id: `not-${Date.now()}`, text: `Nueva cotización local de ${body.nombre}`, read: false, date: new Date().toISOString() });
      saveLocalDB(db);
      return body;
    }
    return db.quotations;
  }

  if (url.startsWith('/api/quotations/')) {
    const id = url.split('/').pop();
    if (method === 'DELETE') {
      db.quotations = db.quotations.filter(q => q.id !== id);
    } else if (method === 'PUT') {
      const index = db.quotations.findIndex(q => q.id === id);
      if (index !== -1) db.quotations[index] = { ...db.quotations[index], ...body };
    }
    saveLocalDB(db);
    return { success: true };
  }

  // 4. Events
  if (url === '/api/events') {
    if (method === 'POST') {
      body.id = `evt-${Date.now()}`;
      body.contratoFirmado = false;
      body.pagos = [];
      body.citas = [];
      db.events.push(body);
      saveLocalDB(db);
      return body;
    }
    return db.events;
  }

  if (url.startsWith('/api/events/')) {
    const id = url.split('/').pop();
    if (method === 'DELETE') {
      db.events = db.events.filter(e => e.id !== id);
    } else if (method === 'PUT') {
      const index = db.events.findIndex(e => e.id === id);
      if (index !== -1) db.events[index] = { ...db.events[index], ...body };
    }
    saveLocalDB(db);
    return { success: true };
  }

  // 5. Inventory
  if (url === '/api/inventory') {
    if (method === 'POST') {
      if (!body.id) body.id = `inv-${Date.now()}`;
      const index = db.inventory.findIndex(i => i.id === body.id);
      if (index !== -1) db.inventory[index] = body;
      else db.inventory.push(body);
      saveLocalDB(db);
      return body;
    }
    return db.inventory;
  }

  if (url.startsWith('/api/inventory/')) {
    const id = url.split('/').pop();
    db.inventory = db.inventory.filter(i => i.id !== id);
    saveLocalDB(db);
    return { success: true };
  }

  // 6. Recipes
  if (url === '/api/recipes') {
    if (method === 'POST') {
      if (!body.id) body.id = `rec-${Date.now()}`;
      const index = db.recipes.findIndex(r => r.id === body.id);
      if (index !== -1) db.recipes[index] = body;
      else db.recipes.push(body);
      saveLocalDB(db);
      return body;
    }
    return db.recipes;
  }

  if (url.startsWith('/api/recipes/')) {
    const id = url.split('/').pop();
    db.recipes = db.recipes.filter(r => r.id !== id);
    saveLocalDB(db);
    return { success: true };
  }

  // 7. Providers
  if (url === '/api/providers') {
    if (method === 'POST') {
      if (!body.id) body.id = `prov-${Date.now()}`;
      const index = db.providers.findIndex(p => p.id === body.id);
      if (index !== -1) db.providers[index] = body;
      else db.providers.push(body);
      saveLocalDB(db);
      return body;
    }
    return db.providers;
  }

  if (url.startsWith('/api/providers/')) {
    const id = url.split('/').pop();
    db.providers = db.providers.filter(p => p.id !== id);
    saveLocalDB(db);
    return { success: true };
  }

  // 8. Users
  if (url === '/api/users') {
    if (method === 'POST') {
      if (!body.uid) body.uid = `user-${Date.now()}`;
      const index = db.users.findIndex(u => u.uid === body.uid);
      if (index !== -1) db.users[index] = body;
      else db.users.push(body);
      saveLocalDB(db);
      return body;
    }
    return db.users;
  }

  if (url.startsWith('/api/users/')) {
    const uid = url.split('/').pop();
    db.users = db.users.filter(u => u.uid !== uid);
    saveLocalDB(db);
    return { success: true };
  }

  // 9. Notifications
  if (url === '/api/notifications') {
    return db.notifications;
  }
  if (url === '/api/notifications/read') {
    const index = db.notifications.findIndex(n => n.id === body.id);
    if (index !== -1) db.notifications[index].read = true;
    saveLocalDB(db);
    return { success: true };
  }
  if (url === '/api/notifications/read-all') {
    db.notifications.forEach(n => n.read = true);
    saveLocalDB(db);
    return { success: true };
  }

  // 10. Backups
  if (url === '/api/backups') return db.backups || [];
  if (url === '/api/backups/manual') {
    const record = { filename: `mock-backup-${Date.now()}.json`, date: new Date().toISOString(), size: 1024 };
    db.backups = db.backups || [];
    db.backups.push(record);
    saveLocalDB(db);
    return record;
  }
  if (url === '/api/backups/restore') {
    alert("La restauración de base de datos no está disponible en el simulador local.");
    return { success: true };
  }

  throw new Error(`Endpoint no simulado: ${url}`);
}


// --- CATEGORÍAS ---
export async function getCategories() {
  return await apiCall('/api/categories');
}

export async function saveCategory(category) {
  return await apiCall('/api/categories', 'POST', category);
}

export async function deleteCategory(id) {
  await apiCall(`/api/categories/${id}`, 'DELETE');
  return true;
}

// --- CONFIGURACIÓN Y VALORES BASE ---
export async function getSettings() {
  return await apiCall('/api/settings');
}

export async function saveSettings(settings) {
  return await apiCall('/api/settings', 'POST', settings);
}

// --- PRODUCTOS Y SERVICIOS ---
export async function getProducts() {
  return await apiCall('/api/products');
}

export async function saveProduct(product) {
  const category = product.category; // Añadido para encajar con Express backend
  return await apiCall('/api/products', 'POST', { category, product });
}

export async function deleteProduct(productId, category) {
  const url = `/api/products/${productId}?category=${category}`;
  await apiCall(url, 'DELETE');
  return true;
}

// --- COTIZACIONES ---
export async function getQuotations() {
  return await apiCall('/api/quotations');
}

export async function createQuotation(quotation) {
  return await apiCall('/api/quotations', 'POST', quotation);
}

export async function updateQuotationStatus(id, status) {
  return await apiCall(`/api/quotations/${id}`, 'PUT', { status });
}

export async function deleteQuotation(id) {
  await apiCall(`/api/quotations/${id}`, 'DELETE');
  return { success: true };
}

export async function updateQuotationDiscount(id, discount, discountLabel, discountPercent) {
  return await apiCall(`/api/quotations/${id}`, 'PUT', { discount, discountLabel, discountPercent });
}

// --- EVENTOS ---
export async function getEvents() {
  return await apiCall('/api/events');
}

export async function createEvent(event) {
  return await apiCall('/api/events', 'POST', event);
}

export async function updateEvent(id, eventData) {
  return await apiCall(`/api/events/${id}`, 'PUT', eventData);
}

export async function deleteEvent(id) {
  return await apiCall(`/api/events/${id}`, 'DELETE');
}

// --- RECETARIO MAESTRO ---
export async function getRecipes() {
  return await apiCall('/api/recipes');
}

export async function saveRecipe(recipe) {
  return await apiCall('/api/recipes', 'POST', recipe);
}

export async function deleteRecipe(recipeId) {
  await apiCall(`/api/recipes/${recipeId}`, 'DELETE');
  return true;
}

// --- INVENTARIO ---
export async function getInventory() {
  return await apiCall('/api/inventory');
}

export async function updateInventoryItem(item) {
  return await apiCall('/api/inventory', 'POST', item);
}

export async function deleteInventoryItem(itemId) {
  await apiCall(`/api/inventory/${itemId}`, 'DELETE');
  return true;
}

// --- USUARIOS ---
export async function getUsers() {
  return await apiCall('/api/users');
}

export async function saveUser(user) {
  return await apiCall('/api/users', 'POST', user);
}

export async function deleteUser(uid) {
  await apiCall(`/api/users/${uid}`, 'DELETE');
  return true;
}

// --- PROVEEDORES ---
export async function getProviders() {
  return await apiCall('/api/providers');
}

export async function saveProvider(provider) {
  return await apiCall('/api/providers', 'POST', provider);
}

export async function deleteProvider(id) {
  await apiCall(`/api/providers/${id}`, 'DELETE');
  return true;
}

// --- NOTIFICACIONES ---
export async function getNotifications() {
  return await apiCall('/api/notifications');
}

export async function markNotificationRead(id) {
  return await apiCall('/api/notifications/read', 'POST', { id });
}

export async function markAllNotificationsRead() {
  return await apiCall('/api/notifications/read-all', 'POST');
}

// --- COPIAS DE SEGURIDAD (BACKUPS) ---
export async function getBackups() {
  return await apiCall('/api/backups');
}

export async function triggerManualBackup() {
  return await apiCall('/api/backups/manual', 'POST');
}

export async function restoreBackup(filename, adminPassword) {
  return await apiCall('/api/backups/restore', 'POST', { filename, adminPassword });
}
