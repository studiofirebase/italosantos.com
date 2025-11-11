
'use server';
/**
 * @fileOverview Server-side actions for the admin dashboard.
 */

import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
const adminApp = getAdminApp();
const db = adminApp ? getDatabase(adminApp) : null;
const firestore = adminApp ? getFirestore(adminApp) : null;

// Cache para evitar consultas desnecessárias
let statsCache: { data: DashboardStats; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

interface DashboardStats {
  totalSubscribers: number;
  totalConversations: number;
  totalProducts: number;
  pendingReviews: number;
}

interface TopPage {
  id: string;
  path: string;
  count: number;
}

/**
 * Retrieves statistics for the admin dashboard.
 * @returns A promise that resolves with the dashboard statistics.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  // Check cache first
  if (statsCache && Date.now() - statsCache.timestamp < CACHE_DURATION) {
    return statsCache.data;
  }

  if (!firestore || !db) {
    console.error('[Dashboard] Firebase Admin SDK not available');
    throw new Error('Firebase Admin SDK não está configurado corretamente');
  }

  try {
    let totalSubscribers = 0;
    let totalConversations = 0;
    let totalProducts = 0;
    let pendingReviews = 0;

    // Get total subscribers from Realtime Database
    try {
      const subscribersRef = db.ref('facialAuth/users');
      const subscribersSnapshot = await subscribersRef.once('value');
      totalSubscribers = subscribersSnapshot.exists() ? subscribersSnapshot.numChildren() : 0;
    } catch (error) {
      console.error("Error counting subscribers:", error);
      totalSubscribers = 0;
    }

    // Get active conversations from Firestore
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    try {
      const recentChatsSnapshot = await firestore
        .collection('chats')
        .where('createdAt', '>=', sevenDaysAgo)
        .count()
        .get();
      
      totalConversations = recentChatsSnapshot.data().count;
      console.log(`Found ${totalConversations} active conversations in the last 7 days`);
    } catch (error) {
      console.error("Error counting active conversations:", error);
      try {
        const allChatsSnapshot = await firestore.collection('chats').count().get();
        totalConversations = allChatsSnapshot.data().count;
        console.log(`Fallback: counting all ${totalConversations} chats`);
      } catch (fallbackError) {
        console.error("Error in fallback chat count:", fallbackError);
        totalConversations = 0;
      }
    }

    // Get total products from Firestore
    try {
      const productsSnapshot = await firestore.collection('products').count().get();
      totalProducts = productsSnapshot.data().count;
    } catch (error) {
      console.error("Error counting products:", error);
      totalProducts = 0;
    }

    // Get pending reviews from Firestore
    try {
      const pendingReviewsSnapshot = await firestore.collection('reviews').where('status', '==', 'pending').count().get();
      pendingReviews = pendingReviewsSnapshot.data().count;
    } catch (error) {
      console.error("Error counting pending reviews:", error);
      pendingReviews = 0;
    }

    const stats = {
      totalSubscribers,
      totalConversations,
      totalProducts,
      pendingReviews,
    };

    // Update cache
    statsCache = {
      data: stats,
      timestamp: Date.now()
    };

    return stats;
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    throw new Error("Erro ao buscar estatísticas do dashboard");
  }
}

/**
 * Invalidates the dashboard stats cache
 */
export async function invalidateStatsCache(): Promise<void> {
  statsCache = null;
}

/**
 * Retrieves the top 3 most accessed pages from the 'pageViews' collection.
 * @returns A promise that resolves with an array of top pages.
 */
export async function getTopPages(): Promise<TopPage[]> {
    if (!firestore) {
        console.error('[getTopPages] Firebase Admin SDK not available');
        throw new Error('Firebase Admin SDK não está configurado corretamente');
    }

    try {
        const pageViewsRef = firestore.collection('pageViews');
        const q = pageViewsRef.orderBy('count', 'desc').limit(3);
        const querySnapshot = await q.get();

        if (querySnapshot.empty) {
            return [];
        }

        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            path: doc.data().path,
            count: doc.data().count
        }));
    } catch (error) {
        console.error("Error fetching top pages:", error);
        throw new Error("Erro ao buscar páginas mais acessadas");
    }
}
