const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper para leer base de datos
async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error leyendo db.json, creando uno nuevo básico:", error);
    return {
      settings: {},
      products: { inflables: [], alimentos: [], shows: [], corporativos: [], adicionales: [] },
      users: [],
      quotations: [],
      events: [],
      inventory: [],
      recipes: [],
      providers: [],
      notifications: [],
      backups: []
    };
  }
}

// Helper para guardar base de datos
async function writeDB(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// Middleware de Autenticación
async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Acceso denegado. Falta token.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token || !token.startsWith('mock-token-')) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }

  const email = token.replace('mock-token-', '');
  const db = await readDB();
  const user = db.users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Usuario no encontrado para este token.' });
  }

  req.user = user;
  next();
}

// --- ENDPOINTS DE AUTENTICACIÓN ---

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos.' });
  }

  const db = await readDB();
  const user = db.users.find(u => u.email === email.toLowerCase() && u.password === password);
  if (!user) {
    return res.status(400).json({ error: 'Correo electrónico o contraseña incorrectos.' });
  }

  const token = `mock-token-${user.email}`;
  // Retornar el usuario sin la contraseña sensible
  const userResponse = { ...user };
  delete userResponse.password;

  res.json({
    token,
    user: userResponse
  });
});

// --- ENDPOINTS DE CONFIGURACIÓN ---

app.get('/api/settings', async (req, res) => {
  const db = await readDB();
  res.json(db.settings);
});

app.post('/api/settings', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Permiso denegado.' });
  }

  const db = await readDB();
  db.settings = { ...db.settings, ...req.body };
  await writeDB(db);
  res.json(db.settings);
});

// --- ENDPOINTS DE CATEGORÍAS ---

app.get('/api/categories', async (req, res) => {
  const db = await readDB();
  if (!db.categories) {
    db.categories = [
      { id: "inflables", name: "Inflables", description: "Selecciona los inflables que deseas alquilar. Todos incluyen montaje y operario.", extraField: "capacity", extraLabel: "Capacidad" },
      { id: "alimentos", name: "Carros de Comida", description: "Carritos clásicos de feria con porciones ilimitadas. Haz clic para seleccionar y ajustar porciones.", extraField: "minQty", extraLabel: "Cantidad Mínima" },
      { id: "shows", name: "Shows y Animaciones", description: "Animadores profesionales, shows temáticos y dinámicas cooperativas.", extraField: "duration", extraLabel: "Duración" },
      { id: "corporativos", name: "Pausas Activas y Corporativo", description: "Actividades recreativas dirigidas para empresas e integraciones.", extraField: "duration", extraLabel: "Duración" },
      { id: "adicionales", name: "Adicionales y Sonido", description: "Servicios complementarios de sonido, luces y efectos especiales.", extraField: "none", extraLabel: "" }
    ];
    await writeDB(db);
  }
  res.json(db.categories);
});

app.post('/api/categories', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Permiso denegado.' });
  }

  const category = req.body;
  const db = await readDB();
  db.categories = db.categories || [];

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

  await writeDB(db);
  res.json(category);
});

app.delete('/api/categories/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Permiso denegado.' });
  }

  const categoryId = req.params.id;
  const db = await readDB();
  
  db.categories = (db.categories || []).filter(c => c.id !== categoryId);
  if (db.products && db.products[categoryId]) {
    delete db.products[categoryId];
  }

  await writeDB(db);
  res.json({ success: true });
});

// --- ENDPOINTS DE PRODUCTOS/CATÁLOGO ---

app.get('/api/products', async (req, res) => {
  const db = await readDB();
  res.json(db.products);
});

app.post('/api/products', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Permiso denegado.' });
  }

  const { category, product } = req.body;
  if (!category || !product) {
    return res.status(400).json({ error: 'Categoría y producto requeridos.' });
  }

  const db = await readDB();
  if (!db.products[category]) {
    db.products[category] = [];
  }

  if (product.id) {
    // Editar
    const index = db.products[category].findIndex(p => p.id === product.id);
    if (index !== -1) {
      db.products[category][index] = { ...db.products[category][index], ...product };
    } else {
      db.products[category].push(product);
    }
  } else {
    // Nuevo
    product.id = `${category.substring(0, 3)}-${Date.now()}`;
    db.products[category].push(product);
  }

  await writeDB(db);
  res.json(product);
});

app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Permiso denegado.' });
  }

  const { category } = req.query;
  const productId = req.params.id;
  if (!category) {
    return res.status(400).json({ error: 'Categoría requerida en query params.' });
  }

  const db = await readDB();
  if (db.products[category]) {
    db.products[category] = db.products[category].filter(p => p.id !== productId);
    await writeDB(db);
    return res.json({ success: true });
  }

  res.status(400).json({ error: 'Categoría no válida.' });
});

// --- ENDPOINTS DE COTIZACIONES ---

app.get('/api/quotations', authMiddleware, async (req, res) => {
  const db = await readDB();
  // Clientes solo ven la suya
  if (req.user.role === 'cliente') {
    const userQuotes = db.quotations.filter(q => q.email === req.user.email);
    return res.json(userQuotes);
  }
  res.json(db.quotations);
});

app.post('/api/quotations', async (req, res) => {
  const quotation = req.body;
  const db = await readDB();

  quotation.id = `q-${Date.now()}`;
  quotation.status = quotation.status || 'pendiente';
  quotation.date = new Date().toISOString();
  quotation.discount = quotation.discount || 0;
  quotation.discountLabel = quotation.discountLabel || '';
  quotation.discountPercent = quotation.discountPercent || 0;

  db.quotations.push(quotation);

  // Generar notificación para el administrador
  db.notifications.push({
    id: `not-${Date.now()}`,
    text: `Nueva cotización de ${quotation.nombre} por $${quotation.total.toLocaleString()} COP para el ${quotation.fecha}`,
    read: false,
    date: new Date().toISOString()
  });

  await writeDB(db);
  res.json(quotation);
});

app.put('/api/quotations/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Permiso denegado.' });
  }

  const quotationId = req.params.id;
  const db = await readDB();
  const index = db.quotations.findIndex(q => q.id === quotationId);

  if (index !== -1) {
    db.quotations[index] = { ...db.quotations[index], ...req.body };
    await writeDB(db);
    return res.json(db.quotations[index]);
  }

  res.status(404).json({ error: 'Cotización no encontrada.' });
});

app.delete('/api/quotations/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Permiso denegado.' });
  }

  const quotationId = req.params.id;
  const db = await readDB();
  db.quotations = db.quotations.filter(q => q.id !== quotationId);
  await writeDB(db);
  res.json({ success: true });
});

// --- ENDPOINTS DE EVENTOS ---

app.get('/api/events', authMiddleware, async (req, res) => {
  const db = await readDB();
  if (req.user.role === 'cliente') {
    const userEvents = db.events.filter(e => e.clienteId === req.user.uid);
    return res.json(userEvents);
  }
  if (req.user.role === 'recreacion') {
    const recEvents = db.events.filter(e => e.recreadoresAsignados && e.recreadoresAsignados.includes(req.user.uid));
    return res.json(recEvents);
  }
  if (req.user.role === 'logistica') {
    const logEvents = db.events.filter(e => e.logisticaAsignados && e.logisticaAsignados.includes(req.user.uid));
    return res.json(logEvents);
  }
  res.json(db.events);
});

app.post('/api/events', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Permiso denegado.' });
  }

  const eventData = req.body;
  const db = await readDB();

  eventData.id = `evt-${Date.now()}`;
  eventData.contratoFirmado = eventData.contratoFirmado || false;
  eventData.firmaCliente = eventData.firmaCliente || '';
  eventData.pagos = eventData.pagos || [];
  eventData.citas = eventData.citas || [];
  eventData.recreadoresAsignados = eventData.recreadoresAsignados || [];
  eventData.logisticaAsignados = eventData.logisticaAsignados || [];
  eventData.enlaceFotos = eventData.enlaceFotos || '';
  eventData.seleccionFotos = eventData.seleccionFotos || '';
  eventData.fechaPublicacionFotos = eventData.fechaPublicacionFotos || '';

  // Generar cronograma básico de recreación por defecto
  eventData.cronograma = eventData.cronograma || [
    { hora: "01:00", actividad: "Montaje y alistamiento de equipos", estado: "pendiente" },
    { hora: "00:00", actividad: "Inicio de actividades y bienvenida", estado: "pendiente" },
    { hora: "01:00", actividad: "Juegos dirigidos e inflables activos", estado: "pendiente" },
    { hora: "02:00", actividad: "Servicio de snacks (algodón, crispetas)", estado: "pendiente" },
    { hora: "02:30", actividad: "Show principal (magia o títeres)", estado: "pendiente" },
    { hora: "03:00", actividad: "Cierre, piñata y pastel", estado: "pendiente" }
  ];

  db.events.push(eventData);

  // Vincular evento al cliente si existe
  if (eventData.clienteId) {
    const clientIndex = db.users.findIndex(u => u.uid === eventData.clienteId);
    if (clientIndex !== -1) {
      db.users[clientIndex].eventId = eventData.id;
    }
  }

  await writeDB(db);
  res.json(eventData);
});

app.put('/api/events/:id', authMiddleware, async (req, res) => {
  const eventId = req.params.id;
  const db = await readDB();
  const index = db.events.findIndex(e => e.id === eventId);

  if (index === -1) {
    return res.status(404).json({ error: 'Evento no encontrado.' });
  }

  // Restricciones de roles
  const user = req.user;
  const oldEvent = db.events[index];

  if (user.role === 'superadmin') {
    db.events[index] = { ...oldEvent, ...req.body };
  } else if (user.role === 'cliente' && oldEvent.clienteId === user.uid) {
    // Clientes pueden actualizar: lista de invitados (participantes), firma contrato, selección fotos y toppings/comidas
    const allowedUpdates = {};
    if (req.body.invitados !== undefined) allowedUpdates.invitados = req.body.invitados;
    if (req.body.alimentos !== undefined) allowedUpdates.alimentos = req.body.alimentos;
    if (req.body.contratoFirmado !== undefined) allowedUpdates.contratoFirmado = req.body.contratoFirmado;
    if (req.body.firmaCliente !== undefined) allowedUpdates.firmaCliente = req.body.firmaCliente;
    if (req.body.seleccionFotos !== undefined) allowedUpdates.seleccionFotos = req.body.seleccionFotos;
    
    db.events[index] = { ...oldEvent, ...allowedUpdates };
  } else if ((user.role === 'recreacion' || user.role === 'logistica') && 
            (oldEvent.recreadoresAsignados.includes(user.uid) || oldEvent.logisticaAsignados.includes(user.uid))) {
    // Recreadores/Logística pueden actualizar el estado del cronograma
    if (req.body.cronograma) {
      db.events[index].cronograma = req.body.cronograma;
    }
  } else {
    return res.status(403).json({ error: 'Acceso no autorizado para modificar este evento.' });
  }

  await writeDB(db);
  res.json(db.events[index]);
});

app.delete('/api/events/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Permiso denegado.' });
  }

  const eventId = req.params.id;
  const db = await readDB();
  db.events = db.events.filter(e => e.id !== eventId);
  await writeDB(db);
  res.json({ success: true });
});

// --- ENDPOINTS DE INVENTARIO ---

app.get('/api/inventory', authMiddleware, async (req, res) => {
  const db = await readDB();
  res.json(db.inventory);
});

app.post('/api/inventory', authMiddleware, async (req, res) => {
  const item = req.body;
  const db = await readDB();

  if (item.id) {
    const index = db.inventory.findIndex(i => i.id === item.id);
    if (index !== -1) {
      db.inventory[index] = { ...db.inventory[index], ...item };
    } else {
      db.inventory.push(item);
    }
  } else {
    item.id = `inv-${Date.now()}`;
    db.inventory.push(item);
  }

  // Comprobar alertas de stock mínimo
  if (parseFloat(item.cantidad) < parseFloat(item.minimo)) {
    db.notifications.push({
      id: `not-${Date.now()}`,
      text: `Alerta: El stock de "${item.name}" (${item.cantidad} ${item.unidad}) está por debajo del mínimo de seguridad (${item.minimo})`,
      read: false,
      date: new Date().toISOString()
    });
  }

  await writeDB(db);
  res.json(item);
});

app.delete('/api/inventory/:id', authMiddleware, async (req, res) => {
  const itemId = req.params.id;
  const db = await readDB();
  db.inventory = db.inventory.filter(i => i.id !== itemId);
  await writeDB(db);
  res.json({ success: true });
});

// --- ENDPOINTS DE RECETARIO ---

app.get('/api/recipes', authMiddleware, async (req, res) => {
  const db = await readDB();
  res.json(db.recipes);
});

app.post('/api/recipes', authMiddleware, async (req, res) => {
  const recipe = req.body;
  const db = await readDB();

  if (recipe.id) {
    const index = db.recipes.findIndex(r => r.id === recipe.id);
    if (index !== -1) {
      db.recipes[index] = { ...db.recipes[index], ...recipe };
    } else {
      db.recipes.push(recipe);
    }
  } else {
    recipe.id = `rec-${Date.now()}`;
    db.recipes.push(recipe);
  }

  await writeDB(db);
  res.json(recipe);
});

app.delete('/api/recipes/:id', authMiddleware, async (req, res) => {
  const recipeId = req.params.id;
  const db = await readDB();
  db.recipes = db.recipes.filter(r => r.id !== recipeId);
  await writeDB(db);
  res.json({ success: true });
});

// --- ENDPOINTS DE PROVEEDORES ---

app.get('/api/providers', authMiddleware, async (req, res) => {
  const db = await readDB();
  res.json(db.providers);
});

app.post('/api/providers', authMiddleware, async (req, res) => {
  const provider = req.body;
  const db = await readDB();

  if (provider.id) {
    const index = db.providers.findIndex(p => p.id === provider.id);
    if (index !== -1) {
      db.providers[index] = { ...db.providers[index], ...provider };
    } else {
      db.providers.push(provider);
    }
  } else {
    provider.id = `prov-${Date.now()}`;
    db.providers.push(provider);
  }

  await writeDB(db);
  res.json(provider);
});

app.delete('/api/providers/:id', authMiddleware, async (req, res) => {
  const providerId = req.params.id;
  const db = await readDB();
  db.providers = db.providers.filter(p => p.id !== providerId);
  await writeDB(db);
  res.json({ success: true });
});

// --- ENDPOINTS DE USUARIOS ---

app.get('/api/users', authMiddleware, async (req, res) => {
  const db = await readDB();
  // Ocultar contraseñas en el listado general
  const safeUsers = db.users.map(u => {
    const safe = { ...u };
    delete safe.password;
    return safe;
  });
  res.json(safeUsers);
});

app.post('/api/users', async (req, res) => {
  const userData = req.body;
  const db = await readDB();

  // Si no hay token de admin, solo se permite autoregistrarse como cliente
  const authHeader = req.headers['authorization'];
  let isSelfRegister = true;

  if (authHeader) {
    const token = authHeader.split(' ')[1];
    const email = token.replace('mock-token-', '');
    const actingUser = db.users.find(u => u.email === email);
    if (actingUser && actingUser.role === 'superadmin') {
      isSelfRegister = false;
    }
  }

  if (isSelfRegister && userData.role && userData.role !== 'cliente') {
    return res.status(403).json({ error: 'Solo se permite el autoregistro como rol cliente.' });
  }

  if (userData.uid) {
    // Editar
    const index = db.users.findIndex(u => u.uid === userData.uid);
    if (index !== -1) {
      // No permitir cambiar rol a menos que sea admin
      if (isSelfRegister && userData.role && userData.role !== db.users[index].role) {
        return res.status(403).json({ error: 'No tienes permiso para cambiar tu rol.' });
      }
      db.users[index] = { ...db.users[index], ...userData };
      await writeDB(db);
      const safeUser = { ...db.users[index] };
      delete safeUser.password;
      return res.json(safeUser);
    }
  } else {
    // Crear
    if (db.users.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    userData.uid = `user-${Date.now()}`;
    userData.email = userData.email.toLowerCase();
    userData.role = userData.role || 'cliente';
    db.users.push(userData);
    await writeDB(db);

    const safeUser = { ...userData };
    delete safeUser.password;
    return res.json(safeUser);
  }

  res.status(400).json({ error: 'Error procesando usuario.' });
});

app.delete('/api/users/:uid', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Permiso denegado.' });
  }

  const userUid = req.params.uid;
  const db = await readDB();
  db.users = db.users.filter(u => u.uid !== userUid);
  await writeDB(db);
  res.json({ success: true });
});

// --- ENDPOINTS DE NOTIFICACIONES ---

app.get('/api/notifications', authMiddleware, async (req, res) => {
  const db = await readDB();
  // Ordenar más recientes primero
  const sorted = db.notifications.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(sorted);
});

app.post('/api/notifications/read', authMiddleware, async (req, res) => {
  const { id } = req.body;
  const db = await readDB();
  const index = db.notifications.findIndex(n => n.id === id);
  if (index !== -1) {
    db.notifications[index].read = true;
    await writeDB(db);
  }
  res.json({ success: true });
});

app.post('/api/notifications/read-all', authMiddleware, async (req, res) => {
  const db = await readDB();
  db.notifications.forEach(n => n.read = true);
  await writeDB(db);
  res.json({ success: true });
});

// --- ENDPOINTS DE COPIAS DE SEGURIDAD (BACKUPS) ---

app.get('/api/backups', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Permiso denegado.' });
  }
  const db = await readDB();
  res.json(db.backups || []);
});

app.post('/api/backups/manual', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Permiso denegado.' });
  }

  const db = await readDB();
  const backupFolder = path.join(__dirname, 'backups');
  await fs.mkdir(backupFolder, { recursive: true });

  const filename = `backup-${Date.now()}.json`;
  const backupPath = path.join(backupFolder, filename);

  // Guardar archivo físico de backup
  await fs.writeFile(backupPath, JSON.stringify(db, null, 2), 'utf8');

  // Registrar backup en el listado
  const backupRecord = {
    filename,
    date: new Date().toISOString(),
    size: (await fs.stat(backupPath)).size
  };

  db.backups = db.backups || [];
  db.backups.push(backupRecord);
  await writeDB(db);

  res.json(backupRecord);
});

app.post('/api/backups/restore', authMiddleware, async (req, res) => {
  const { filename, adminPassword } = req.body;
  if (!filename || !adminPassword) {
    return res.status(400).json({ error: 'Nombre de archivo y contraseña requeridos.' });
  }

  const db = await readDB();
  
  // Validar contraseña de superadmin
  if (req.user.role !== 'superadmin' || db.users.find(u => u.uid === req.user.uid).password !== adminPassword) {
    return res.status(403).json({ error: 'Contraseña de administrador incorrecta.' });
  }

  const backupPath = path.join(__dirname, 'backups', filename);
  try {
    const backupContent = await fs.readFile(backupPath, 'utf8');
    const restoredData = JSON.parse(backupContent);
    
    // Conservar backups registrados actuales para no perder el historial
    restoredData.backups = db.backups;
    
    await writeDB(restoredData);
    res.json({ success: true, message: 'Base de datos restaurada correctamente.' });
  } catch (error) {
    console.error("Error al restaurar backup:", error);
    res.status(500).json({ error: 'Error al leer o restaurar el archivo de copia de seguridad.' });
  }
});

// Arrancar Servidor
app.listen(PORT, () => {
  console.log(`Servidor de Megarecreación corriendo en http://localhost:${PORT}`);
});
