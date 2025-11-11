// ============================================
// FUNÇÃO 5: onAdminDeleted
// ============================================
// Copie este código para o index.js no Console

const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * TRIGGER: onAdminDeleted
 * Executado quando um admin é removido da collection 'admins'
 */
exports.onAdminDeleted = functions.firestore
    .document('admins/{adminId}')
    .onDelete(async (snap, context) => {
        const adminData = snap.data();
        const uid = adminData.uid;

        if (!uid) {
            console.error('❌ Admin deletado sem UID:', snap.id);
            return null;
        }

        try {
            // Remover custom claim 'admin'
            await admin.auth().setCustomUserClaims(uid, {
                admin: false,
                role: null
            });

            console.log(`✅ Custom claim removido para: ${uid}`);

            // Registrar no audit log
            await admin.firestore().collection('admin_audit_log').add({
                action: 'admin_deleted',
                adminId: snap.id,
                uid: uid,
                email: adminData.email,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                triggeredBy: 'onAdminDeleted'
            });

            return { success: true };
        } catch (error) {
            console.error('❌ Erro ao remover custom claim:', error);
            return { success: false, error: error.message };
        }
    });
