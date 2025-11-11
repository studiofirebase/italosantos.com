#!/bin/bash

# Firebase Deployment with Environment Variables
# This script helps you deploy with environment variables

set -e

echo "🚀 Firebase Deployment with Environment Variables"
echo "=================================================="

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please login first:"
    echo "firebase login"
    exit 1
fi

echo ""
echo "📋 Environment Variables Setup"
echo "=============================="
echo ""

# Prompt for Firebase configuration
echo "Please enter your Firebase configuration:"
echo ""

read -p "Firebase API Key: " FIREBASE_API_KEY
read -p "Firebase Auth Domain: " FIREBASE_AUTH_DOMAIN
read -p "Firebase Database URL: " FIREBASE_DATABASE_URL
read -p "Firebase Project ID: " FIREBASE_PROJECT_ID
read -p "Firebase Storage Bucket: " FIREBASE_STORAGE_BUCKET
read -p "Firebase Messaging Sender ID: " FIREBASE_MESSAGING_SENDER_ID
read -p "Firebase App ID: " FIREBASE_APP_ID
read -p "Firebase Measurement ID (optional): " FIREBASE_MEASUREMENT_ID

echo ""
echo "🔧 Setting up environment variables..."

# Export variables for the current session
export NEXT_PUBLIC_FIREBASE_API_KEY="$FIREBASE_API_KEY"
export NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$FIREBASE_AUTH_DOMAIN"
export NEXT_PUBLIC_FIREBASE_DATABASE_URL="$FIREBASE_DATABASE_URL"
export NEXT_PUBLIC_FIREBASE_PROJECT_ID="$FIREBASE_PROJECT_ID"
export NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="$FIREBASE_STORAGE_BUCKET"
export NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="$FIREBASE_MESSAGING_SENDER_ID"
export NEXT_PUBLIC_FIREBASE_APP_ID="$FIREBASE_APP_ID"
export NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="$FIREBASE_MEASUREMENT_ID"

echo "✅ Environment variables set for this session"

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Building the application with environment variables..."
npm run firebase-build

echo ""
echo "📤 Deploying to Firebase..."
firebase deploy

echo ""
echo "✅ Deployment completed successfully!"
echo "🌐 Your app should be available at: https://YOUR_FIREBASE_PROJECT_ID.web.app"
echo ""
echo "⚠️  Note: Environment variables were only set for this session."
echo "   For permanent setup, add them to your .env.local file or CI/CD environment."
