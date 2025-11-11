// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAgQVYgZ62v1RIKmcxHQcYjNVcj2B0hh8",
  authDomain: "facepass-afhid.firebaseapp.com",
  databaseURL: "https://facepass-afhid-default-rtdb.firebaseio.com",
  projectId: "facepass-afhid",
  storageBucket: "facepass-afhid.firebasestorage.app",
  messagingSenderId: "423019559653",
  appId: "1:423019559653:web:dc278b16cac06e0dfaf20c",
  measurementId: "G-VBFV45J460"
};


firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {

  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png'
  };

  self.registration.showNotification(notificationTitle,
    notificationOptions);
});
