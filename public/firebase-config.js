// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = { 
  apiKey: "AIzaSyAgQVYgZ62v1RIKmcxHQcYjNVcj2Bv0hh8", 
  authDomain: "facepass-afhid.firebaseapp.com", 
  databaseURL: "https://facepass-afhid-default-rtdb.firebaseio.com", 
  projectId: "facepass-afhid", 
  storageBucket: "facepass-afhid.firebasestorage.app", 
  messagingSenderId: "423019559653", 
  appId: "1:423019559653:web:dc278b16cac06e0dfaf20c", 
  measurementId: "G-VBFV45J460" 
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);