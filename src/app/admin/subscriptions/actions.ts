'use server'

import { getAdminDb, getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { UserSubscription, SubscriptionPlan, SUBSCRIPTION_PLANS } from '@/lib/subscription-manager';

// Função unificada para buscar todas as assinaturas usando a mesma fonte de dados
// MODIFICADO: Agora busca TODOS os usuários cadastrados, não apenas assinantes
async function getAllSubscriptionsFromUnifiedSource(): Promise<UserSubscription[]> {
  const subscriptions: UserSubscription[] = [];

  try {
    // console.log('[Actions] Buscando TODOS os usuários cadastrados...');

    const adminDb = getAdminDb();
    // 1. Buscar TODOS os usuários da coleção 'users' (não apenas isSubscriber = true)
    if (adminDb) {
      try {
        const usersSnapshot = await adminDb.collection('users').get();
        
        usersSnapshot.forEach((doc: any) => {
          const userData = doc.data();
          
          // Determinar status baseado em isSubscriber e subscriptionStatus
          let status: 'active' | 'expired' | 'canceled' = 'expired';
          if (userData.isSubscriber === true && userData.subscriptionStatus === 'active') {
            status = 'active';
          } else if (userData.subscriptionStatus === 'canceled') {
            status = 'canceled';
          }
          
          const subscription: UserSubscription = {
            id: doc.id,
            userId: userData.uid || userData.userId || doc.id,
            planId: userData.planId || (userData.isSubscriber ? 'monthly' : 'free'),
            email: userData.email || 'Sem e-mail',
            paymentId: userData.paymentId || userData.transactionId || 'N/A',
            paymentMethod: userData.paymentMethod || (userData.isSubscriber ? 'pix' : 'N/A'),
            status: status,
            startDate: userData.subscriptionStartDate || userData.createdAt || new Date().toISOString(),
            endDate: userData.subscriptionEndDate || userData.expiresAt || new Date().toISOString(),
            autoRenew: userData.autoRenew || false,
            createdAt: userData.createdAt || new Date().toISOString(),
            updatedAt: userData.updatedAt || new Date().toISOString()
          };
          subscriptions.push(subscription);
        });
        
        // console.log(`[Actions] Encontrados ${usersSnapshot.size} usuários na coleção users`);
      } catch (error) {
        console.error('[Actions] Erro ao buscar da coleção users:', error);
      }
    }

    // 2. Buscar da coleção 'subscribers' (mesma fonte dos pagamentos)
    if (adminDb) {
      try {
        const subscribersSnapshot = await adminDb.collection('subscribers').get();
        
        subscribersSnapshot.forEach((doc: any) => {
          const data = doc.data();
          const subscription: UserSubscription = {
            id: doc.id,
            userId: data.userId || data.customerId || '',
            planId: data.planId || 'monthly',
            email: data.email || data.customerEmail || '',
            paymentId: data.paymentId || data.transactionId || '',
            paymentMethod: data.paymentMethod || 'pix',
            status: data.status || 'active',
            startDate: data.startDate || data.createdAt || new Date().toISOString(),
            endDate: data.endDate || data.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            autoRenew: data.autoRenew || false,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString()
          };
          subscriptions.push(subscription);
        });
        
        // console.log(`[Actions] Encontradas ${subscribersSnapshot.size} assinaturas na coleção subscribers`);
      } catch (error) {
        console.error('[Actions] Erro ao buscar da coleção subscribers:', error);
      }
    }

    // 3. Buscar da coleção 'subscriptions' (Realtime Database - backup)
    const adminApp = getAdminApp();
    if (adminApp) {
      try {
        const rtdb = getDatabase(adminApp);
        const subscriptionsRef = rtdb.ref('subscriptions');
        const snapshot = await subscriptionsRef.once('value');
        const subscriptionsData = snapshot.val();

        if (subscriptionsData) {
          const subs = Object.values(subscriptionsData) as UserSubscription[];
          subscriptions.push(...subs);
          // console.log(`[Actions] Encontradas ${subs.length} assinaturas no Realtime Database`);
        }
      } catch (error) {
        console.error('[Actions] Erro ao buscar do Realtime Database:', error);
      }
    }

    // console.log(`[Actions] Total de assinaturas encontradas: ${subscriptions.length}`);
    return subscriptions;
  } catch (error) {
    console.error('[Actions] Erro geral ao buscar assinaturas:', error);
    return [];
  }
}

export async function createSubscription(data: {
  userId: string;
  email: string;
  planId: string;
  paymentId: string;
  paymentMethod: 'pix' | 'paypal' | 'mercadopago' | 'google_pay';
}) {
  try {
    // console.log('[Actions] Criando assinatura:', data);
    
    const adminDb = getAdminDb();
    // Salvar na coleção 'users' (mesma fonte dos usuários)
    if (adminDb) {
      const usersRef = adminDb.collection('users');
      const userQuery = await usersRef.where('email', '==', data.email).get();
      
      if (!userQuery.empty) {
        // Atualizar usuário existente
        const userDoc = userQuery.docs[0];
        await userDoc.ref.update({
          isSubscriber: true,
          subscriptionStatus: 'active',
          planId: data.planId,
          paymentId: data.paymentId,
          paymentMethod: data.paymentMethod,
          subscriptionStartDate: new Date().toISOString(),
          subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 99.00,
          updatedAt: new Date().toISOString()
        });
        // console.log('[Actions] Usuário atualizado com assinatura');
      } else {
        // Criar novo usuário
        await usersRef.add({
          email: data.email,
          uid: data.userId,
          isSubscriber: true,
          subscriptionStatus: 'active',
          planId: data.planId,
          paymentId: data.paymentId,
          paymentMethod: data.paymentMethod,
          subscriptionStartDate: new Date().toISOString(),
          subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 99.00,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        // console.log('[Actions] Novo usuário criado com assinatura');
      }
    }

    // Salvar na coleção 'subscribers' (mesma fonte dos pagamentos)
    if (adminDb) {
      const subscribersRef = adminDb.collection('subscribers');
      await subscribersRef.add({
        userId: data.userId,
        email: data.email,
        planId: data.planId,
        paymentId: data.paymentId,
        paymentMethod: data.paymentMethod,
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 99.00,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      // console.log('[Actions] Assinatura salva na coleção subscribers');
    }

    return { success: true, message: 'Assinatura criada com sucesso' };
  } catch (error: any) {
    console.error('Erro ao criar assinatura:', error);
    return { success: false, error: error.message };
  }
}

export async function checkUserSubscription(userId: string) {
  try {
    // console.log('[Actions] Verificando assinatura para userId:', userId);
    
    const adminDb = getAdminDb();
    // Verificar na coleção 'users' (mesma fonte dos usuários)
    if (adminDb) {
      const usersRef = adminDb.collection('users');
      const userQuery = await usersRef.where('uid', '==', userId).get();
      
      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
        const userData = userDoc.data();
        
        if (userData.isSubscriber === true) {
          const plan = SUBSCRIPTION_PLANS.find(p => p.id === (userData.planId || 'monthly'));
          
          return { 
            success: true, 
            isActive: true, 
            subscription: {
              id: userDoc.id,
              userId: userData.uid,
              planId: userData.planId || 'monthly',
              email: userData.email,
              paymentId: userData.paymentId,
              paymentMethod: userData.paymentMethod || 'pix',
              status: 'active',
              startDate: userData.subscriptionStartDate,
              endDate: userData.subscriptionEndDate,
              autoRenew: false,
              createdAt: userData.createdAt,
              updatedAt: userData.updatedAt
            },
            plan
          };
        }
      }
    }
    
    return { 
      success: true, 
      isActive: false, 
      subscription: null,
      plan: null
    };
  } catch (error: any) {
    console.error('Erro ao verificar assinatura:', error);
    return { success: false, error: error.message };
  }
}

export async function cancelUserSubscription(subscriptionId: string) {
  try {
    // console.log('[Actions] Cancelando assinatura:', subscriptionId);
    
    const adminDb = getAdminDb();
    // Cancelar na coleção 'users'
    if (adminDb) {
      const userDoc = adminDb.collection('users').doc(subscriptionId);
      const userSnapshot = await userDoc.get();
      
      if (userSnapshot.exists) {
        await userDoc.update({
          isSubscriber: false,
          subscriptionStatus: 'canceled',
          updatedAt: new Date().toISOString()
        });
        // console.log('[Actions] Assinatura cancelada na coleção users');
      }
    }
    
    // Cancelar na coleção 'subscribers'
    if (adminDb) {
      const subscriberDoc = adminDb.collection('subscribers').doc(subscriptionId);
      const subscriberSnapshot = await subscriberDoc.get();
      
      if (subscriberSnapshot.exists) {
        await subscriberDoc.update({
          status: 'canceled',
          updatedAt: new Date().toISOString()
        });
        // console.log('[Actions] Assinatura cancelada na coleção subscribers');
      }
    }
    
    return { success: true, message: 'Assinatura cancelada com sucesso' };
  } catch (error: any) {
    console.error('Erro ao cancelar assinatura:', error);
    return { success: false, error: error.message };
  }
}

export async function getAllSubscriptionsAdmin() {
  try {
    // console.log('[Actions] Buscando todas as assinaturas...');
    const subscriptions = await getAllSubscriptionsFromUnifiedSource();
    
    const subscriptionsWithPlans = subscriptions.map(sub => ({
      ...sub,
      plan: SUBSCRIPTION_PLANS.find(p => p.id === sub.planId)
    }));
    
    // console.log('[Actions] Retornando assinaturas com planos:', subscriptionsWithPlans.length);
    
    return { success: true, subscriptions: subscriptionsWithPlans };
  } catch (error: any) {
    console.error('[Actions] Erro ao buscar assinaturas:', error);
    return { success: false, error: error.message };
  }
}

export async function cleanupExpiredSubscriptions() {
  try {
    // console.log('[Actions] Iniciando cleanup de assinaturas expiradas...');
    let expiredCount = 0;
    
    const adminDb = getAdminDb();
    // Cleanup na coleção 'users'
    if (adminDb) {
      const usersSnapshot = await adminDb.collection('users').where('isSubscriber', '==', true).get();
      
      for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        if (userData.subscriptionEndDate) {
          const endDate = new Date(userData.subscriptionEndDate);
          if (endDate <= new Date()) {
            await doc.ref.update({
              isSubscriber: false,
              subscriptionStatus: 'expired',
              updatedAt: new Date().toISOString()
            });
            expiredCount++;
          }
        }
      }
    }
    
    // Cleanup na coleção 'subscribers'
    if (adminDb) {
      const subscribersSnapshot = await adminDb.collection('subscribers').where('status', '==', 'active').get();
      
      for (const doc of subscribersSnapshot.docs) {
        const data = doc.data();
        if (data.endDate) {
          const endDate = new Date(data.endDate);
          if (endDate <= new Date()) {
            await doc.ref.update({
              status: 'expired',
              updatedAt: new Date().toISOString()
            });
            expiredCount++;
          }
        }
      }
    }
    
    // console.log(`[Actions] Cleanup concluído: ${expiredCount} assinaturas expiradas`);
    return { success: true, cleanupCount: expiredCount };
  } catch (error: any) {
    console.error('Erro no cleanup:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteTestSubscriptions() {
  try {
    // console.log('[Actions] Iniciando exclusão de assinaturas de teste...');
    let deletedCount = 0;
    
    const adminDb = getAdminDb();
    // Excluir da coleção 'users'
    if (adminDb) {
      const usersSnapshot = await adminDb.collection('users').where('isSubscriber', '==', true).get();
      
      for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        const email = userData.email?.toLowerCase() || '';
        
        // Verificar se é uma assinatura de teste
        if (email.includes('test') || 
            email.includes('@test.com') ||
            email.includes('exemplo') ||
            email.includes('demo') ||
            userData.paymentId?.includes('test') ||
            userData.planId?.includes('test')) {
          
          await doc.ref.delete();
          deletedCount++;
          // console.log(`[Actions] Excluída assinatura de teste: ${email}`);
        }
      }
    }
    
    // Excluir da coleção 'subscribers'
    if (adminDb) {
      const subscribersSnapshot = await adminDb.collection('subscribers').get();
      
      for (const doc of subscribersSnapshot.docs) {
        const data = doc.data();
        const email = data.email?.toLowerCase() || '';
        
        // Verificar se é uma assinatura de teste
        if (email.includes('test') || 
            email.includes('@test.com') ||
            email.includes('exemplo') ||
            email.includes('demo') ||
            data.paymentId?.includes('test') ||
            data.planId?.includes('test')) {
          
          await doc.ref.delete();
          deletedCount++;
          // console.log(`[Actions] Excluída assinatura de teste: ${email}`);
        }
      }
    }
    
    // console.log(`[Actions] Exclusão concluída: ${deletedCount} assinaturas de teste excluídas`);
    return { success: true, deletedCount };
  } catch (error: any) {
    console.error('Erro ao excluir assinaturas de teste:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Presentear membro com dias grátis de assinatura
 * Adiciona dias à assinatura existente ou cria uma nova
 */
export async function giftSubscriptionDays(
  userId: string,
  email: string,
  days: number
): Promise<{ success: boolean; error?: string; subscription?: UserSubscription }> {
  try {
    console.log(`[Actions] Presenteando ${email} com ${days} dias de assinatura...`);

    const adminDb = getAdminDb();
    if (!adminDb) {
      return { success: false, error: 'Banco de dados não disponível' };
    }

    // Buscar assinatura existente do usuário
    let existingSubscription: UserSubscription | null = null;
    let userDocRef: any = null;

    // Verificar na coleção 'users'
    const userSnapshot = await adminDb.collection('users').doc(userId).get();
    if (userSnapshot.exists) {
      const userData = userSnapshot.data();
      userDocRef = userSnapshot.ref;
      
      if (userData?.isSubscriber && userData?.subscriptionEndDate) {
        existingSubscription = {
          id: userSnapshot.id,
          userId: userId,
          planId: userData.planId || 'monthly',
          email: email,
          paymentId: userData.paymentId || `gift-${Date.now()}`,
          paymentMethod: 'gift',
          status: userData.subscriptionStatus || 'active',
          startDate: userData.subscriptionStartDate || new Date().toISOString(),
          endDate: userData.subscriptionEndDate,
          autoRenew: false,
          createdAt: userData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
    }

    const now = new Date();
    let newEndDate: Date;

    if (existingSubscription) {
      // Se já tem assinatura ativa, adicionar dias à data de expiração
      const currentEndDate = new Date(existingSubscription.endDate);
      
      // Se a assinatura já expirou, começar de hoje
      if (currentEndDate < now) {
        newEndDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      } else {
        // Adicionar dias à data atual de expiração
        newEndDate = new Date(currentEndDate.getTime() + days * 24 * 60 * 60 * 1000);
      }
    } else {
      // Nova assinatura: começar de hoje
      newEndDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    }

    const updatedSubscription: UserSubscription = {
      id: userId,
      userId: userId,
      planId: 'gift',
      email: email,
      paymentId: `gift-${Date.now()}`,
      paymentMethod: 'gift',
      status: 'active',
      startDate: existingSubscription?.startDate || now.toISOString(),
      endDate: newEndDate.toISOString(),
      autoRenew: false,
      createdAt: existingSubscription?.createdAt || now.toISOString(),
      updatedAt: now.toISOString()
    };

    // Atualizar no Firestore - coleção 'users'
    if (userDocRef) {
      await userDocRef.update({
        isSubscriber: true,
        subscriptionStatus: 'active',
        subscriptionStartDate: updatedSubscription.startDate,
        subscriptionEndDate: updatedSubscription.endDate,
        planId: updatedSubscription.planId,
        paymentMethod: 'gift',
        updatedAt: now.toISOString(),
        giftedDays: (userSnapshot.data()?.giftedDays || 0) + days,
        lastGiftDate: now.toISOString()
      });
    } else {
      // Criar novo documento se não existir
      await adminDb.collection('users').doc(userId).set({
        uid: userId,
        email: email,
        isSubscriber: true,
        subscriptionStatus: 'active',
        subscriptionStartDate: updatedSubscription.startDate,
        subscriptionEndDate: updatedSubscription.endDate,
        planId: 'gift',
        paymentMethod: 'gift',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        giftedDays: days,
        lastGiftDate: now.toISOString()
      });
    }

    // Adicionar também na coleção 'subscribers' para backup
    await adminDb.collection('subscribers').doc(userId).set({
      userId: userId,
      email: email,
      planId: 'gift',
      paymentMethod: 'gift',
      status: 'active',
      startDate: updatedSubscription.startDate,
      endDate: updatedSubscription.endDate,
      autoRenew: false,
      createdAt: existingSubscription?.createdAt || now.toISOString(),
      updatedAt: now.toISOString(),
      giftedDays: days,
      lastGiftDate: now.toISOString()
    }, { merge: true });

    console.log(`[Actions] ✅ Presenteado com sucesso: ${email} - ${days} dias até ${newEndDate.toLocaleDateString('pt-BR')}`);

    return { 
      success: true, 
      subscription: updatedSubscription 
    };
  } catch (error: any) {
    console.error('Erro ao presentear assinatura:', error);
    return { success: false, error: error.message };
  }
}
