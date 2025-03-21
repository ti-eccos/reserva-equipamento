import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Suas credenciais do Firebase (substitua com os dados do seu projeto)
const firebaseConfig = {
    apiKey: "AIzaSyClto3wjPhSR4vSL7rcjufCPTzFoL_oChw",
    authDomain: "reserva-equipamentos-56109.firebaseapp.com",
    projectId: "reserva-equipamentos-56109",
    storageBucket: "reserva-equipamentos-56109.firebasestorage.app",
    messagingSenderId: "855020860427",
    appId: "1:855020860427:web:f343ca564af7834c96430e",
    measurementId: "G-CY9MY48DQH"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };