// ============================================
// FUNÇÃO 2: isAdmin
// ============================================
// Copie este código para o index.js no Console

const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * FUNÇÃO: isAdmin
 * Verifica se um usuário tem permissão de administrador
 */
exports.isAdmin = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Usuário não autenticado.'
        );
    }

    const uid = context.auth.uid;

    try {
        const user = await admin.auth().getUser(uid);
        const customClaims = user.customClaims || {};
        const hasAdminClaim = customClaims.admin === true;

        const adminDoc = await admin.firestore()
            .collection('admins')
            .where('uid', '==', uid)
            .limit(1)
            .get();

        const isAdminInCollection = !adminDoc.empty;
        const isAdminUser = hasAdminClaim || isAdminInCollection;

        // Auto-set claim se estiver na collection mas não tem claim
        if (isAdminInCollection && !hasAdminClaim) {
            await admin.auth().setCustomUserClaims(uid, {
                admin: true,
                role: 'admin'
            });

            await adminDoc.docs[0].ref.update({
                adminClaimSet: true,
                adminClaimSetAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`✅ Custom claim definido automaticamente para: ${uid}`);
        }

        return {
            isAdmin: isAdminUser,
            hasCustomClaim: hasAdminClaim,
            inAdminCollection: isAdminInCollection,
            uid
        };
    } catch (error) {
        console.error('❌ Erro ao verificar admin:', error);
        throw new functions.https.HttpsError(
            'internal',
            `Erro: ${error.message}`
        );
    }
});
