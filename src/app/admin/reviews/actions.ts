
'use server';
/**
 * @fileOverview Server-side actions for managing user reviews.
 */

import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export interface Review {
    id: string;
    author: string;
    text: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string; 
    reply?: {
        author: string;
        text: string;
        isVerified: boolean;
        createdAt: string;
    };
}

// Debug: Log the initialization status
console.log('[Reviews Actions] Using getAdminDb for initialization');

const db = getAdminDb();
const reviewsCollection = db ? db.collection('reviews') : null;

// Debug: Log the initialization status
console.log('[Reviews Actions] db available:', !!db);
console.log('[Reviews Actions] reviewsCollection available:', !!reviewsCollection);

/**
 * Retrieves all reviews from Firestore, ordered by creation date.
 * @returns An array of review objects.
 */
export async function getAllReviews(): Promise<Review[]> {
    console.log('[getAllReviews] Starting to fetch reviews...');
    
    if (!reviewsCollection) {
        console.error("[getAllReviews] Admin SDK não disponível - não é possível acessar avaliações");
        console.error("[getAllReviews] db:", !!db);
        console.error("[getAllReviews] reviewsCollection:", !!reviewsCollection);
        return [];
    }

    try {
        console.log('[getAllReviews] Querying reviews collection...');
        const snapshot = await reviewsCollection.orderBy('createdAt', 'desc').get();
        
        console.log('[getAllReviews] Query completed. Empty:', snapshot.empty);
        console.log('[getAllReviews] Number of docs:', snapshot.docs.length);
        
        if (snapshot.empty) {
            console.log("[getAllReviews] No reviews found.");
            return [];
        }

        const reviews: Review[] = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            console.log('[getAllReviews] Processing doc:', doc.id, 'with data:', {
                author: data.author,
                text: data.text?.substring(0, 50) + '...',
                status: data.status,
                createdAt: data.createdAt
            });
            
            return {
                id: doc.id,
                author: data.author,
                text: data.text,
                status: data.status || 'pending',
                // Convert Firestore Timestamp to ISO string
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                reply: data.reply ? {
                    ...data.reply,
                    createdAt: data.reply.createdAt?.toDate ? data.reply.createdAt.toDate().toISOString() : new Date().toISOString(),
                } : undefined
            };
        });

        console.log('[getAllReviews] Returning reviews:', reviews.length);
        return reviews;
    } catch (error: any) {
        console.error("[getAllReviews] Error fetching reviews:", error);
        console.error("[getAllReviews] Error details:", {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        throw new Error("Failed to retrieve reviews from the database.");
    }
}


/**
 * Updates the status of a specific review.
 * @param reviewId The ID of the review to update.
 * @param status The new status ('approved' or 'rejected').
 * @returns A promise that resolves with a success or error message.
 */
export async function updateReviewStatus(reviewId: string, status: 'approved' | 'rejected'): Promise<{ success: boolean; message: string }> {
    console.log('[updateReviewStatus] Starting update for review:', reviewId, 'status:', status);
    
    if (!reviewsCollection) {
        const errorMessage = "Admin SDK não disponível - não é possível atualizar avaliação";
        console.error("[updateReviewStatus]", errorMessage);
        return { success: false, message: errorMessage };
    }

    try {
        const reviewRef = reviewsCollection.doc(reviewId);
        await reviewRef.update({ status: status });
        const message = `Avaliação ${status === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso.`;
        console.log("[updateReviewStatus]", message);
        return { success: true, message };
    } catch (error: any) {
        const errorMessage = `Erro ao atualizar a avaliação: ${error.message}`;
        console.error("[updateReviewStatus]", errorMessage);
        console.error("[updateReviewStatus] Error details:", error);
        return { success: false, message: errorMessage };
    }
}

/**
 * Deletes a specific review permanently.
 * @param reviewId The ID of the review to delete.
 * @returns A promise that resolves with a success or error message.
 */
export async function deleteReview(reviewId: string): Promise<{ success: boolean; message: string }> {
    console.log('[deleteReview] Starting deletion for review:', reviewId);
    
    if (!reviewsCollection) {
        const errorMessage = "Admin SDK não disponível - não é possível excluir avaliação";
        console.error("[deleteReview]", errorMessage);
        return { success: false, message: errorMessage };
    }

    try {
        const reviewRef = reviewsCollection.doc(reviewId);
        
        // Verificar se o documento existe antes de deletar
        const doc = await reviewRef.get();
        if (!doc.exists) {
            const errorMessage = "Avaliação não encontrada";
            console.error("[deleteReview]", errorMessage);
            return { success: false, message: errorMessage };
        }
        
        await reviewRef.delete();
        const message = "Avaliação excluída permanentemente com sucesso.";
        console.log("[deleteReview]", message);
        return { success: true, message };
    } catch (error: any) {
        const errorMessage = `Erro ao excluir a avaliação: ${error.message}`;
        console.error("[deleteReview]", errorMessage);
        console.error("[deleteReview] Error details:", error);
        return { success: false, message: errorMessage };
    }
}

/**
 * Approves all pending reviews at once
 * @returns A promise that resolves with a success or error message.
 */
export async function approveAllPendingReviews(): Promise<{ success: boolean; message: string; count: number }> {
    console.log('[approveAllPendingReviews] Starting to approve all pending reviews');
    
    if (!reviewsCollection) {
        const errorMessage = "Admin SDK não disponível - não é possível aprovar avaliações";
        console.error("[approveAllPendingReviews]", errorMessage);
        return { success: false, message: errorMessage, count: 0 };
    }

    try {
        // Get all pending reviews
        const pendingSnapshot = await reviewsCollection.where('status', '==', 'pending').get();
        
        if (pendingSnapshot.empty) {
            const message = "Nenhum review pendente encontrado para aprovar.";
            console.log("[approveAllPendingReviews]", message);
            return { success: true, message, count: 0 };
        }
        
        console.log(`[approveAllPendingReviews] Found ${pendingSnapshot.size} pending reviews to approve`);
        
        // Use batch to approve all at once
        const batch = reviewsCollection.firestore.batch();
        
        pendingSnapshot.docs.forEach((doc: any) => {
            batch.update(doc.ref, { status: 'approved' });
        });
        
        await batch.commit();
        
        const message = `${pendingSnapshot.size} reviews foram aprovados com sucesso!`;
        console.log("[approveAllPendingReviews]", message);
        return { success: true, message, count: pendingSnapshot.size };
        
    } catch (error: any) {
        const errorMessage = `Erro ao aprovar reviews em lote: ${error.message}`;
        console.error("[approveAllPendingReviews]", errorMessage);
        console.error("[approveAllPendingReviews] Error details:", error);
        return { success: false, message: errorMessage, count: 0 };
    }
}

