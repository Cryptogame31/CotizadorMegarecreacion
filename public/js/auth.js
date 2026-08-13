// Servicio de Autenticación para Megarecreación con Firebase Authentication

import { getStorageItem, setStorageItem, removeStorageItem, app, firestore, firebaseConfig } from './db.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, updatePassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Inicializar Authentication de la app principal
export const auth = getAuth(app);

let currentUser = null;
const listeners = new Set();

// Inicializar escuchador de Authentication
function initAuth() {
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const userDoc = await getDoc(doc(firestore, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          currentUser = { uid: firebaseUser.uid, ...userDoc.data() };
        } else {
          // Auto-curar perfil si se creó en Auth pero no en Firestore
          let role = "cliente";
          let name = firebaseUser.displayName || "Usuario Registrado";
          if (firebaseUser.email.toLowerCase() === "admin@megarecreacion.com") {
            role = "superadmin";
            name = "Mauricio Gómez";
          }
          
          currentUser = { uid: firebaseUser.uid, email: firebaseUser.email, name, role };
          await setDoc(doc(firestore, "users", firebaseUser.uid), {
            email: firebaseUser.email,
            name,
            role,
            phone: ""
          });
        }
        setStorageItem('megarecreacion_current_user', JSON.stringify(currentUser));
        setStorageItem('megarecreacion_token', firebaseUser.accessToken || `token-${firebaseUser.uid}`);
      } catch (e) {
        console.error("Error al cargar perfil desde Firestore:", e);
        // Fallback básico en memoria local
        currentUser = { uid: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.displayName || "Usuario", role: "cliente" };
      }
    } else {
      currentUser = null;
      removeStorageItem('megarecreacion_current_user');
      removeStorageItem('megarecreacion_token');
    }
    triggerListeners();
  });
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
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    // Registro automático de superadmin en primer login si no existe en Authentication
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.message.includes('invalid-credential')) {
      if (email.toLowerCase() === 'admin@megarecreacion.com' && password === '123456') {
        console.log("Creando cuenta de Superadmin en Firebase Authentication...");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await setDoc(doc(firestore, "users", user.uid), {
          email: user.email,
          name: "Mauricio Gómez",
          role: "superadmin",
          phone: "3163048505"
        });
        return user;
      }
    }
    
    let errMsg = error.message;
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
      errMsg = "Correo electrónico o contraseña incorrectos.";
    } else if (error.code === 'auth/invalid-email') {
      errMsg = "El correo electrónico ingresado no es válido.";
    }
    throw new Error(errMsg);
  }
}

export async function logout() {
  await signOut(auth);
  currentUser = null;
  triggerListeners();
  return true;
}

// Registro secundario para crear otros usuarios sin desloguear al administrador
export async function registerNewUser(email, password, name, role, phone) {
  try {
    // Inicializar app de Firebase secundaria e independiente
    const secondaryApp = initializeApp(firebaseConfig, `SecondaryApp-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    
    // Crear el nuevo usuario en Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const user = userCredential.user;
    const uid = user.uid;
    
    // Desloguear y destruir la app secundaria para liberar memoria
    await secondaryAuth.signOut();
    await secondaryApp.delete();
    
    // Guardar el perfil en la base de datos Firestore de la app principal
    await setDoc(doc(firestore, "users", uid), {
      email: email.toLowerCase(),
      name,
      role,
      phone
    });
    
    return { uid, email, name, role, phone };
  } catch (error) {
    console.error("Error al registrar nuevo usuario en Firebase:", error);
    let errMsg = error.message;
    if (error.code === 'auth/email-already-in-use') {
      errMsg = "El correo electrónico ya está registrado en el sistema.";
    } else if (error.code === 'auth/weak-password') {
      errMsg = "La contraseña debe tener al menos 6 caracteres.";
    }
    throw new Error(errMsg);
  }
}

export async function changeUserPassword(newPassword) {
  const user = auth.currentUser;
  if (!user) throw new Error("No hay usuario autenticado actualmente.");
  try {
    await updatePassword(user, newPassword);
    return true;
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    let errMsg = error.message;
    if (error.code === 'auth/requires-recent-login') {
      errMsg = "Para cambiar tu contraseña debes haber iniciado sesión recientemente. Por favor, cierra sesión e ingresa de nuevo.";
    }
    throw new Error(errMsg);
  }
}

export async function resetPassword(email) {
  throw new Error("El restablecimiento de contraseña debe ser realizado por un administrador desde el panel.");
}

// Inicializar Authentication
initAuth();
