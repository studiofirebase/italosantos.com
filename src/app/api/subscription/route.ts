import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';

// Função para verificar se o usuário é assinante ativo (mesma lógica unificada)
async function checkUserSubscription(email: string) {
  try {
    console.log(`[Subscription API] Verificando assinatura para email: ${email}`);
    
    if (!email) {
      return NextResponse.json({
        success: false,
        message: 'Email é obrigatório'
      });
    }

    const adminDb = getAdminDb();
    // 1. Verificar na coleção 'users' (mesma fonte dos usuários)
    if (adminDb) {
      try {
        const usersRef = adminDb.collection('users');
        const userQuery = await usersRef.where('email', '==', email).get();
        
        if (!userQuery.empty) {
          const userDoc = userQuery.docs[0];
          const userData = userDoc.data();
          
          console.log(`[Subscription API] User data:`, userData);
          
          // Verificar se tem isSubscriber ou subscriptionStatus
          if (userData?.isSubscriber === true || userData?.subscriptionStatus === 'active') {
            console.log(`[Subscription API] Usuário encontrado como assinante ativo no perfil`);
            
            return NextResponse.json({
              success: true,
              isSubscriber: true,
              hasActiveSubscription: true,
              subscription: {
                id: userDoc.id,
                email: userData.email,
                paymentMethod: userData.paymentMethod || 'pix',
                paymentDate: userData.subscriptionStartDate || userData.createdAt,
                expirationDate: userData.subscriptionEndDate || userData.expiresAt,
                amount: userData.amount || 99.00,
                planDuration: userData.planDuration || 30,
                daysRemaining: userData.daysRemaining || 30
              },
              message: 'Assinatura ativa encontrada'
            });
          }
        }
      } catch (error) {
        console.error('[Subscription API] Erro ao verificar perfil do usuário:', error);
      }
    }
    
    // 2. Verificar na coleção 'subscribers' (mesma fonte dos pagamentos)
    if (adminDb) {
      try {
  const adminApp = getAdminApp();
        const subscribersRef = adminDb.collection('subscribers');
        const subscriberSnapshot = await subscribersRef
          .where('email', '==', email)
          .where('status', '==', 'active')
          .get();
        
        console.log(`[Subscription API] Firestore subscribers encontrados: ${subscriberSnapshot.size}`);
        
        if (!subscriberSnapshot.empty) {
          const subscriberDoc = subscriberSnapshot.docs[0];
          const subscriberData = subscriberDoc.data();
          
          console.log(`[Subscription API] Usuário encontrado como assinante ativo no Firestore`);
          
          return NextResponse.json({
            success: true,
            isSubscriber: true,
            hasActiveSubscription: true,
            subscription: {
              id: subscriberDoc.id,
              email: subscriberData.email,
              paymentMethod: subscriberData.paymentMethod || 'pix',
              paymentDate: subscriberData.startDate || subscriberData.createdAt,
              expirationDate: subscriberData.endDate || subscriberData.expiresAt,
              amount: subscriberData.amount || 99.00,
              planDuration: subscriberData.planDuration || 30,
              daysRemaining: subscriberData.daysRemaining || 30
            },
            message: 'Assinatura ativa encontrada'
          });
        }
      } catch (error) {
        console.error('[Subscription API] Erro ao verificar Firestore:', error);
      }
    }
    
    const adminApp = getAdminApp();
    // 3. Verificar na coleção 'subscriptions' (Realtime Database - backup)
    if (adminApp) {
      try {
        const rtdb = getDatabase(adminApp);
        const subscriptionsRef = rtdb.ref('subscriptions');
        const snapshot = await subscriptionsRef.orderByChild('email').equalTo(email).once('value');
        const subscriptions = snapshot.val();
        
        if (subscriptions) {
          const subscriptionId = Object.keys(subscriptions)[0];
          const subscription = subscriptions[subscriptionId];
          
          console.log(`[Subscription API] RTDB subscription data:`, subscription);
          
          if (subscription && subscription.status === 'active') {
            const now = new Date();
            const endDate = new Date(subscription.endDate);
            
            if (endDate > now) {
              console.log(`[Subscription API] Usuário encontrado como assinante ativo no RTDB`);
              
              return NextResponse.json({
                success: true,
                isSubscriber: true,
                hasActiveSubscription: true,
                subscription: {
                  id: subscriptionId,
                  email: subscription.email,
                  paymentMethod: subscription.paymentMethod || 'pix',
                  paymentDate: subscription.startDate,
                  expirationDate: subscription.endDate,
                  amount: subscription.amount || 99.00,
                  planDuration: subscription.planDuration || 30,
                  daysRemaining: Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                },
                message: 'Assinatura ativa encontrada'
              });
            }
          }
        }
      } catch (error) {
        console.error('[Subscription API] Erro ao verificar RTDB:', error);
      }
    }
    
    console.log(`[Subscription API] Usuário NÃO é assinante ativo`);
    
    return NextResponse.json({
      success: true,
      isSubscriber: false,
      hasActiveSubscription: false,
      message: 'Nenhuma assinatura ativa encontrada'
    });

  } catch (error) {
    console.error('[Subscription API] Erro geral ao verificar assinatura:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao verificar assinatura'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, customerEmail } = await request.json();

    console.log(`[Subscription API] POST request - action: ${action}, email: ${customerEmail}`);

    switch (action) {
      case 'checkSubscription':
        return await checkUserSubscription(customerEmail);
      
      case 'createSubscription':
        return await createSubscription(customerEmail, 'test-payment-id');
      
      default:
        return NextResponse.json({ 
          success: false, 
          message: 'Ação não reconhecida' 
        });
    }

  } catch (error) {
    console.error('[Subscription API] Erro na API subscription:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
}

// ✅ SIMPLIFICADO: Criar assinatura básica
async function createSubscription(email: string, paymentId: string) {
  try {
    console.log('🔥 Criando assinatura para:', email);
    
    if (!email) {
      return NextResponse.json({
        success: false,
        message: 'Email é obrigatório'
      });
    }
    
    const now = new Date();
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 1); // 30 dias

    const adminDb = getAdminDb();
    // Salvar na coleção 'users' (mesma fonte dos usuários)
    if (adminDb) {
      const usersRef = adminDb.collection('users');
      const userQuery = await usersRef.where('email', '==', email).get();

      if (!userQuery.empty) {
        // Atualizar usuário existente
        const userDoc = userQuery.docs[0];
        await userDoc.ref.update({
          isSubscriber: true,
          subscriptionStatus: 'active',
          subscriptionStartDate: now.toISOString(),
          subscriptionEndDate: expirationDate.toISOString(),
          paymentMethod: 'pix',
          amount: 99.00,
          planDuration: 30,
          updatedAt: now.toISOString()
        });
      } else {
        // Criar novo usuário
        await usersRef.add({
          email: email,
          displayName: email.split('@')[0],
          isSubscriber: true,
          subscriptionStatus: 'active',
          subscriptionStartDate: now.toISOString(),
          subscriptionEndDate: expirationDate.toISOString(),
          paymentMethod: 'pix',
          amount: 99.00,
          planDuration: 30,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        });
      }
    }

    // Salvar na coleção 'subscribers' (mesma fonte dos pagamentos)
    if (adminDb) {
      const subscribersRef = adminDb.collection('subscribers');
      await subscribersRef.add({
        email: email,
        status: 'active',
        startDate: now.toISOString(),
        endDate: expirationDate.toISOString(),
        paymentMethod: 'pix',
        amount: 99.00,
        planDuration: 30,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Assinatura criada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Erro ao criar assinatura' 
    });
  }
}
