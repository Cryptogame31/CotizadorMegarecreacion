// Servicio de Base de Datos y API para Megarecreación con Firebase Firestore

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, getDocs, query, where, deleteDoc, addDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Tu configuración de Firebase
export const firebaseConfig = {
  apiKey: "AIzaSyDr1rdCaVgvUvMk8t0m4WuaOPqi_ZZY3rg",
  authDomain: "appmega-fa21a.firebaseapp.com",
  projectId: "appmega-fa21a",
  storageBucket: "appmega-fa21a.firebasestorage.app",
  messagingSenderId: "996324858255",
  appId: "1:996324858255:web:d6dd089f22a501525c93fa",
  measurementId: "G-PD9F1XV7JV"
};

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);

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

// Semilla de datos iniciales en Firestore si la base de datos está vacía
async function seedInitialData() {
  console.log("Iniciando sembrado de datos en Firestore...");
  const batch = writeBatch(firestore);

  // 1. Semilla de Categorías
  const defaultCategories = [
    { id: "inflables", name: "Inflables", description: "Selecciona los inflables que deseas alquilar. Todos incluyen montaje y operario.", extraField: "capacity", extraLabel: "Capacidad" },
    { id: "alimentos", name: "Carros de Comida", description: "Carritos clásicos de feria con porciones ilimitadas. Haz clic para seleccionar y ajustar porciones.", extraField: "minQty", extraLabel: "Cantidad Mínima" },
    { id: "shows", name: "Shows y Animaciones", description: "Animadores profesionales, shows temáticos y dinámicas cooperativas.", extraField: "duration", extraLabel: "Duración" },
    { id: "corporativos", name: "Pausas Activas y Corporativo", description: "Actividades recreativas dirigidas para empresas e integraciones.", extraField: "duration", extraLabel: "Duración" },
    { id: "adicionales", name: "Adicionales y Sonido", description: "Servicios complementarios de sonido, luces y efectos especiales.", extraField: "none", extraLabel: "" }
  ];
  defaultCategories.forEach(cat => {
    const docRef = doc(firestore, "categories", cat.id);
    const catData = { ...cat };
    delete catData.id;
    batch.set(docRef, catData);
  });

  // 2. Semilla de Productos
  const defaultProducts = [
    { id: "inf-castillo", category: "inflables", name: "Castillo Inflable Multicolor", price: 180000, description: "Medidas: 3m x 3m. Para niños de 3 a 7 años. Con soplador y operario.", capacity: "8 niños" },
    { id: "inf-tobogan", category: "inflables", name: "Tobogán Gigante con Piscina", price: 280000, description: "Medidas: 6m x 3.5m. Seco o agua. Con soplador y operario.", capacity: "12 niños" },
    { id: "ali-hotdogs", category: "alimentos", name: "Carro de Perros Calientes (Hot Dogs)", price: 4000, description: "Perros calientes con salsas y papita picada. Mínimo 50 porciones.", minQty: 50 },
    { id: "ali-algodon", category: "alimentos", name: "Carro de Algodón de Azúcar", price: 3000, description: "Algodón gigante rosa y azul. Mínimo 50 porciones.", minQty: 50 },
    { id: "sho-basico", category: "shows", name: "Recreación y Animación Básica", price: 220000, description: "3 horas, 2 animadores, juegos, bailes, globos y pintacaritas.", duration: "3 horas" },
    { id: "corp-pausas", category: "corporativos", name: "Pausas Activas Temáticas", price: 180000, description: "Sesión de 30-40 minutos de gimnasia mental y física laboral.", duration: "40 minutos" },
    { id: "adi-sonido", category: "adicionales", name: "Sonido Profesional y Luces", price: 150000, description: "Cabina de sonido, luces audiorítmicas y micrófono por 4 horas." }
  ];
  defaultProducts.forEach(p => {
    const docRef = doc(firestore, "products", p.id);
    const pData = { ...p };
    delete pData.id;
    batch.set(docRef, pData);
  });

  // 3. Semilla de Configuración
  const docSettings = doc(firestore, "settings", "general");
  batch.set(docSettings, {
    businessName: "Megarecreación",
    businessSubtitle: "Inflables, Carros de Comida y Eventos",
    businessLogoUrl: "assets/logo.jpg",
    contractText: "<h4 style=\"text-align: center; margin-bottom: 1rem;\">CONTRATO DE PRESTACIÓN DE SERVICIOS DE RECREACIÓN - MEGARECREACIÓN</h4><p>Entre los suscritos a saber, por una parte <strong>MEGARECREACIÓN</strong> y por otra parte el cliente cuyos datos constan en la cotización inicial, se conviene celebrar el presente acuerdo para la prestación de servicios recreativos y de entretenimiento según las especificaciones indicadas.</p><br><p><strong>PRIMERO - OBJETO:</strong> Megarecreación se compromete a prestar los servicios de alquiler de inflables, carros de alimentación, personajes, animadores o actividades empresariales especificadas.</p><p><strong>SEGUNDO - LOGÍSTICA Y MONTAJE:</strong> El cliente facilitará el espacio físico adecuado y una conexión eléctrica estable de 110V a menos de 10 metros del lugar de ubicación del inflable o carrito de comida. El equipo de logística llegará 1 hora antes para el montaje.</p><p><strong>TERCERO - PRECIO Y PAGO:</strong> El valor acordado se cancelará con un abono del 50% para separar la fecha y el saldo restante del 50% al finalizar el montaje de los equipos el día del evento.</p><p><strong>CUARTO - CONDICIONES CLIMÁTICAS:</strong> En caso de lluvia intensa o vientos fuertes que pongan en riesgo la seguridad de los participantes o la integridad de los inflables, estos se apagarán temporalmente sin que esto suponga reembolso de dinero.</p>",
    telefonoContacto1: "3163048505",
    telefonoContacto2: "3197188973",
    themePalette: "rose",
    themeFont: "outfit",
    themeFontSize: "16px"
  });

  await batch.commit();
  console.log("Sembrado finalizado con éxito.");
}

// --- CATEGORÍAS ---
export async function getCategories() {
  const snap = await getDocs(collection(firestore, "categories"));
  let categories = [];
  snap.forEach(doc => {
    categories.push({ id: doc.id, ...doc.data() });
  });
  
  if (categories.length === 0) {
    await seedInitialData();
    return await getCategories();
  }
  return categories;
}

export async function saveCategory(category) {
  const id = category.id || category.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
  const catData = { ...category };
  delete catData.id;
  await setDoc(doc(firestore, "categories", id), catData);
  return { id, ...catData };
}

export async function deleteCategory(id) {
  await deleteDoc(doc(firestore, "categories", id));
  return true;
}

// --- PRODUCTOS ---
export async function getProducts() {
  const snap = await getDocs(collection(firestore, "products"));
  let products = {};
  snap.forEach(doc => {
    const data = doc.data();
    const cat = data.category || "adicionales";
    products[cat] = products[cat] || [];
    products[cat].push({ id: doc.id, ...data });
  });
  return products;
}

export async function saveProduct(category, product) {
  const id = product.id || `prod-${Date.now()}`;
  const pData = { ...product, category };
  delete pData.id;
  await setDoc(doc(firestore, "products", id), pData);
  return { id, ...pData };
}

export async function deleteProduct(id, category) {
  await deleteDoc(doc(firestore, "products", id));
  return true;
}

// --- SETTINGS (MARCA) ---
export async function getSettings() {
  const snap = await getDoc(doc(firestore, "settings", "general"));
  if (snap.exists()) {
    return snap.data();
  }
  return {
    businessName: "Megarecreación",
    businessSubtitle: "Inflables, Carros de Comida y Eventos",
    businessLogoUrl: "assets/logo.jpg"
  };
}

export async function saveSettings(settings) {
  await setDoc(doc(firestore, "settings", "general"), settings);
  return settings;
}

// --- COTIZACIONES ---
export async function getQuotations() {
  const snap = await getDocs(collection(firestore, "quotations"));
  let list = [];
  snap.forEach(doc => {
    list.push({ id: doc.id, ...doc.data() });
  });
  return list.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function createQuotation(quotation) {
  const qData = {
    ...quotation,
    status: 'pendiente',
    date: new Date().toISOString()
  };
  const docRef = await addDoc(collection(firestore, "quotations"), qData);
  
  // Guardar notificación para el administrador
  await addDoc(collection(firestore, "notifications"), {
    text: `Nueva cotización de ${quotation.nombre}`,
    read: false,
    date: new Date().toISOString()
  });

  return { id: docRef.id, ...qData };
}

export async function updateQuotationStatus(id, status) {
  await updateDoc(doc(firestore, "quotations", id), { status });
  return true;
}

export async function deleteQuotation(id) {
  await deleteDoc(doc(firestore, "quotations", id));
  return true;
}

// --- EVENTOS ---
export async function getEvents() {
  const snap = await getDocs(collection(firestore, "events"));
  let list = [];
  snap.forEach(doc => {
    list.push({ id: doc.id, ...doc.data() });
  });
  return list;
}

export async function createEvent(event) {
  const docRef = await addDoc(collection(firestore, "events"), event);
  return { id: docRef.id, ...event };
}

export async function updateEvent(id, fields) {
  await updateDoc(doc(firestore, "events", id), fields);
  return true;
}

// --- USUARIOS ---
export async function getUsers() {
  const snap = await getDocs(collection(firestore, "users"));
  let list = [];
  snap.forEach(doc => {
    list.push({ uid: doc.id, ...doc.data() });
  });
  return list;
}

export async function saveUser(user) {
  const uData = { ...user };
  const uid = uData.uid;
  delete uData.uid;
  await setDoc(doc(firestore, "users", uid), uData);
  return { uid, ...uData };
}

export async function deleteUser(uid) {
  await deleteDoc(doc(firestore, "users", uid));
  return true;
}

// --- PROVEEDORES ---
export async function getProviders() {
  const snap = await getDocs(collection(firestore, "providers"));
  let list = [];
  snap.forEach(doc => {
    list.push({ id: doc.id, ...doc.data() });
  });
  return list;
}

export async function saveProvider(provider) {
  const id = provider.id || `prov-${Date.now()}`;
  const pData = { ...provider };
  delete pData.id;
  await setDoc(doc(firestore, "providers", id), pData);
  return { id, ...pData };
}

export async function deleteProvider(id) {
  await deleteDoc(doc(firestore, "providers", id));
  return true;
}

// --- NOTIFICACIONES ---
export async function getNotifications() {
  const snap = await getDocs(collection(firestore, "notifications"));
  let list = [];
  snap.forEach(doc => {
    list.push({ id: doc.id, ...doc.data() });
  });
  return list.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function markNotificationAsRead(id) {
  await updateDoc(doc(firestore, "notifications", id), { read: true });
  return true;
}
