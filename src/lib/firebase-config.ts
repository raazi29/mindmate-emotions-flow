// Firebase configuration for real-time chat functionality
// Using Firebase free tier for real-time database and authentication

// Import Firebase modules
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// Replace with your own Firebase project configuration
// You can get this from your Firebase project settings
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoAPIKeyReplaceWithYourOwn",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "your-project-id.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://your-project-id-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "your-project-id.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "your-messaging-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "your-app-id",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const database = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, database, auth, storage };

// Instructions for setting up Firebase (free tier):
// 1. Go to https://firebase.google.com/ and sign in with a Google account
// 2. Click "Add project" and follow the setup steps
// 3. In your project:
//    - Enable Authentication (with Anonymous auth method)
//    - Enable Realtime Database (start in test mode)
//    - Enable Storage (start in test mode)
// 4. Go to Project Settings > Your Apps > Web App
// 5. Click "Register app" and copy the configuration
// 6. Replace the placeholder values above with your config
// 
// Free Tier Limits (as of last update):
// - Realtime Database: 1GB storage, 10GB/month downloads
// - Authentication: 50K monthly active users
// - Storage: 5GB storage, 1GB/day downloads
// These limits are generous for most small to medium applications 