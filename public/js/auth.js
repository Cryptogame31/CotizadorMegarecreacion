// Servicio de Autenticación para Megarecreación

import { saveUser, getUsers, isUsingMock, getStorageItem, setStorageItem, removeStorageItem } from './db.js';

let currentUser = null;
const listeners = new Set();

// Inicializar cargando desde LocalStorage
function initAuth() {
  const cached = getStorageItem('megarecreacion_current_user');
  if (cached) {
    try {
      currentUser = JSON.parse(cached);
    } catch (e) {
      console.error("Error al parsear el usuario actual:", e);
    }
  }
  triggerListeners();
}

function triggerListeners() {
  listeners.forEach(callback => callback(currentUser));
}

export function onAuthChange(callback) {
  listeners.add(callback);
  callback(currentUser); 
  return () => listeners.delete(callback);
}

export function getCurrentUser() {
  return currentUser;
}

export async function login(email, password) {
  // Validar si estamos usando el modo simulador (Mock) local
  if (getStorageItem('megarecreacion_force_mock') === 'true') {
    const mockUsers = [
      { uid: "user-admin", email: "admin@megarecreacion.com", password: "123456", name: "Mauricio Gómez", role: "superadmin", phone: "3163048505" },
      { uid: "user-compras", email: "compras@megarecreacion.com", password: "123456", name: "Adriana Torres", role: "compras", phone: "3197188973" },
      { uid: "user-recreador", email: "recreador@megarecreacion.com", password: "123456", name: "Sebastián Pérez", role: "recreacion", phone: "3123456789" },
      { uid: "user-logistica", email: "logistica@megarecreacion.com", password: "123456", name: "Carlos Ruíz", role: "logistica", phone: "3139876543" },
      { uid: "user-cliente", email: "cliente@megarecreacion.com", password: "123456", name: "Familia Restrepo", role: "cliente", phone: "3154567890", eventId: "evt-demo-1" }
    ];
    
    const user = mockUsers.find(u => u.email === email.toLowerCase() && u.password === password);
    if (!user) {
      throw new Error('Correo electrónico o contraseña incorrectos.');
    }
    
    currentUser = { ...user };
    delete currentUser.password;
    setStorageItem('megarecreacion_current_user', JSON.stringify(currentUser));
    setStorageItem('megarecreacion_token', `mock-token-${currentUser.email}`);
    triggerListeners();
    return currentUser;
  }

  // REST API Login
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Correo electrónico o contraseña incorrectos.');
    }
    
    const data = await response.json();
    currentUser = data.user;
    setStorageItem('megarecreacion_current_user', JSON.stringify(currentUser));
    setStorageItem('megarecreacion_token', data.token);
    
    triggerListeners();
    return currentUser;
  } catch (error) {
    throw error;
  }
}

export async function logout() {
  currentUser = null;
  removeStorageItem('megarecreacion_current_user');
  removeStorageItem('megarecreacion_token');
  triggerListeners();
  return true;
}

export async function registerNewUser(email, password, name, role, phone) {
  if (getStorageItem('megarecreacion_force_mock') === 'true') {
    const newUser = { uid: `user-${Date.now()}`, email, name, role, phone };
    return newUser;
  }

  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role, phone })
    });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error al registrar usuario');
    }
    
    const newUser = await response.json();
    return newUser;
  } catch (error) {
    console.error("Error al crear usuario en backend:", error);
    throw error;
  }
}

export async function changeUserPassword(newPassword) {
  if (!currentUser) throw new Error("No hay usuario autenticado.");
  
  if (getStorageItem('megarecreacion_force_mock') === 'true') {
    alert("Contraseña cambiada localmente (modo simulador).");
    return true;
  }

  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getStorageItem('megarecreacion_token')}`
      },
      body: JSON.stringify({ ...currentUser, password: newPassword })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error al cambiar contraseña');
    }
    
    return true;
  } catch(error) {
    throw error;
  }
}

export async function resetPassword(email) {
  throw new Error("El restablecimiento de contraseña debe ser realizado por un administrador desde el panel.");
}

initAuth();
