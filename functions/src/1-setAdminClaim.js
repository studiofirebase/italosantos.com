// ============================================
// FUNÇÃO 1: setAdminClaim
// ============================================
// Copie este código para o index.js no Console

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Inicializar Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * FUNÇÃO: setAdminClaim
 * Define custom claim 'admin: true' para um usuário específico
 */
exports.setAdminClaim = functions.https.onCall(async (data, context) => {
    // Verificar autenticação
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Usuário não autenticado.'
        );
    }

    const { uid } = data;

    if (!uid) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'UID do usuário é obrigatório.'
        );
    }

    try {
        // Verificar se existe na collection 'admins'
        const adminDoc = await admin.firestore()
            .collection('admins')
            .where('uid', '==', uid)
            .limit(1)
            .get();

        if (adminDoc.empty) {
            throw new functions.https.HttpsError(
                'not-found',
                'Usuário não encontrado na coleção de administradores.'
            );
        }

        // Setar custom claim 'admin'
        await admin.auth().setCustomUserClaims(uid, {
            admin: true,
            role: 'admin'
        });

        // Atualizar documento
        await adminDoc.docs[0].ref.update({
            adminClaimSet: true,
            adminClaimSetAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Custom claim 'admin' definido para UID: ${uid}`);

        return {
            success: true,
            message: 'Custom claim admin definido com sucesso.'
        };
    } catch (error) {
        console.error('❌ Erro ao definir custom claim:', error);
        throw new functions.https.HttpsError(
            'internal',
            `Erro: ${error.message}`
        );
    }
});
