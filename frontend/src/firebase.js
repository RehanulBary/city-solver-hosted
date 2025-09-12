// src/firebase.js
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBSo7MrGDGzkBFfPKDy7tYcCQ50MxrzQ9c",
  authDomain: "civil-service-664eb.firebaseapp.com",
  projectId: "civil-service-664eb",
  storageBucket: "civil-service-664eb.appspot.com", // Make sure this is correct
  messagingSenderId: "553804434851",
  appId: "1:553804434851:web:98d3551822558487a91e16",
  measurementId: "G-LPW4F1WJEN"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Storage
const storage = getStorage(app);

export { storage };
