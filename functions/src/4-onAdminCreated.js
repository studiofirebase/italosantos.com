// ============================================
// FUNÇÃO 4: onAdminCreated
// ============================================
// Copie este código para o index.js no Console

const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * TRIGGER: onAdminCreated
 * Executado quando um admin é criado na collection 'admins'
 */
exports.onAdminCreated = functions.firestore
    .document('admins/{adminId}')
    .onCreate(async (snap, context) => {
        const adminData = snap.data();
        const uid = adminData.uid;

        if (!uid) {
            console.error('❌ Admin criado sem UID:', snap.id);
            return null;
        }

        try {
            // Setar custom claim 'admin'
            await admin.auth().setCustomUserClaims(uid, {
                admin: true,
                role: 'admin'
            });

            // Atualizar documento
            await snap.ref.update({
                adminClaimSet: true,
                adminClaimSetAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`✅ Custom claim definido automaticamente para: ${uid}`);

            // Registrar no audit log
            await admin.firestore().collection('admin_audit_log').add({
                action: 'admin_created',
                adminId: snap.id,
                uid: uid,
                email: adminData.email,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                triggeredBy: 'onAdminCreated'
            });

            return { success: true };
        } catch (error) {
            console.error('❌ Erro ao definir custom claim:', error);

            // Marcar erro no documento
            await snap.ref.update({
                adminClaimSet: false,
                adminClaimError: error.message,
                adminClaimErrorAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return { success: false, error: error.message };
        }
    });
