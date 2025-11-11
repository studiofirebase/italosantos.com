// ============================================
// FUNÇÃO 3: getAllAdmins
// ============================================
// Copie este código para o index.js no Console

const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * FUNÇÃO: getAllAdmins
 * Lista todos os administradores registrados
 */
exports.getAllAdmins = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Usuário não autenticado.'
        );
    }

    try {
        // Verificar se é admin
        const user = await admin.auth().getUser(context.auth.uid);
        const customClaims = user.customClaims || {};

        if (customClaims.admin !== true) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'Apenas administradores podem listar admins.'
            );
        }

        // Buscar todos admins
        const adminsSnapshot = await admin.firestore()
            .collection('admins')
            .get();

        const admins = adminsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                uid: data.uid,
                email: data.email,
                name: data.name,
                createdAt: data.createdAt,
                adminClaimSet: data.adminClaimSet || false
            };
        });

        console.log(`✅ Listando ${admins.length} administradores`);

        return {
            success: true,
            count: admins.length,
            admins
        };
    } catch (error) {
        console.error('❌ Erro ao listar admins:', error);
        throw new functions.https.HttpsError(
            'internal',
            `Erro: ${error.message}`
        );
    }
});
