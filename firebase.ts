
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBGDZPE7hIj3yTsGePkTt8HU1WkvB5jNzw",
  authDomain: "fortimepro-8d3d6.firebaseapp.com",
  projectId: "fortimepro-8d3d6",
  storageBucket: "fortimepro-8d3d6.firebasestorage.app",
  messagingSenderId: "371387130294",
  appId: "1:371387130294:web:42d0316ffc65ed7707e117",
  measurementId: "G-PLBL6WXZ5N"
};

let db: any;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (error) {
  console.error("Erro ao conectar ao novo Firebase:", error);
}

export { db };
