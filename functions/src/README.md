# 🚀 GUIA RÁPIDO: Deploy das 5 Funções Admin

## ✅ Status: Sistema Inicializado com Sucesso!

**Admin criado:**
- Nome: Italo Santos
- Email: pix@italosantos.com
- UID: jRWjOSHOFtQrBcrvCUF4tDmBONE2

---

## 📦 ARQUIVOS PRONTOS PARA DEPLOY

Todos os códigos estão em: `functions-deploy/`

1. ✅ `1-setAdminClaim.js` - Define custom claim
2. ✅ `2-isAdmin.js` - Verifica permissão
3. ✅ `3-getAllAdmins.js` - Lista admins
4. ✅ `4-onAdminCreated.js` - Trigger onCreate
5. ✅ `5-onAdminDeleted.js` - Trigger onDelete
6. ✅ `package.json` - Dependências

---

## 🌐 DEPLOY VIA CONSOLE (5 funções)

### **URL do Console:**
👉 https://console.cloud.google.com/functions/list?project=YOUR_FIREBASE_PROJECT_ID

---

## 📝 FUNÇÃO 1: setAdminClaim

### **Passo 1: Criar Função**
- Clique em **"CREATE FUNCTION"**

### **Passo 2: Configurar**
- **Environment:** `2nd gen` ✅
- **Function name:** `setAdminClaim`
- **Region:** `europe-west1`
- **Trigger type:** `HTTPS`
- **Authentication:** `Require authentication` ✅

### **Passo 3: Runtime**
Clique em **"RUNTIME, BUILD, CONNECTIONS AND SECURITY SETTINGS"**:
- **Runtime:** `Node.js 20`
- **Entry point:** `setAdminClaim`

### **Passo 4: Código**
Clique em **"NEXT"**

**package.json:**
```json
{
  "name": "admin-functions",
  "version": "1.0.0",
  "main": "index.js",
  "engines": {
    "node": "20"
  },
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^4.8.0"
  }
}
```

**index.js:**
Copie o conteúdo de: `functions-deploy/1-setAdminClaim.js`

### **Passo 5: Deploy**
- Clique em **"DEPLOY"**
- Aguarde 2-5 minutos ⏳

---

## 📝 FUNÇÃO 2: isAdmin

**Repetir processo acima com:**
- **Function name:** `isAdmin`
- **Entry point:** `isAdmin`
- **index.js:** Copie de `functions-deploy/2-isAdmin.js`

---

## 📝 FUNÇÃO 3: getAllAdmins

**Repetir processo acima com:**
- **Function name:** `getAllAdmins`
- **Entry point:** `getAllAdmins`
- **index.js:** Copie de `functions-deploy/3-getAllAdmins.js`

---

## 🔥 FUNÇÃO 4: onAdminCreated (TRIGGER)

### **Diferença:** Trigger Firestore!

**Configurar:**
- **Function name:** `onAdminCreated`
- **Trigger type:** `Cloud Firestore` ⚠️ (não HTTP!)
- **Event type:** `google.cloud.firestore.document.v1.created`
- **Document path:** `admins/{adminId}`
- **Entry point:** `onAdminCreated`

**index.js:** Copie de `functions-deploy/4-onAdminCreated.js`

---

## 🔥 FUNÇÃO 5: onAdminDeleted (TRIGGER)

**Configurar:**
- **Function name:** `onAdminDeleted`
- **Trigger type:** `Cloud Firestore`
- **Event type:** `google.cloud.firestore.document.v1.deleted`
- **Document path:** `admins/{adminId}`
- **Entry point:** `onAdminDeleted`

**index.js:** Copie de `functions-deploy/5-onAdminDeleted.js`

---

## ✅ CHECKLIST DE DEPLOY

Após cada deploy, marque:

- [ ] **setAdminClaim** - HTTP callable
- [ ] **isAdmin** - HTTP callable
- [ ] **getAllAdmins** - HTTP callable
- [ ] **onAdminCreated** - Firestore trigger
- [ ] **onAdminDeleted** - Firestore trigger

---

## 🧪 TESTAR APÓS DEPLOY

Quando todas estiverem deployadas, teste:

```bash
cd "/Users/italosanta/Downloads/italosantos.com original"
npm run dev
```

Acesse: http://localhost:3000/admin/login

**Login:**
- Email: pix@italosantos.com
- Senha: (a senha temporária que foi exibida no init)

---

## 📊 VERIFICAR STATUS

Console Functions:
👉 https://console.cloud.google.com/functions/list?project=YOUR_FIREBASE_PROJECT_ID

Você deve ver 6 funções:
1. ✅ sms-email-code (já existe)
2. ⏳ setAdminClaim
3. ⏳ isAdmin
4. ⏳ getAllAdmins
5. ⏳ onAdminCreated
6. ⏳ onAdminDeleted

---

## 🎯 RESUMO

**Tempo estimado:** 30-40 minutos total (5-8 min por função)

**Ordem recomendada:**
1. setAdminClaim (callable)
2. isAdmin (callable)
3. getAllAdmins (callable)
4. onAdminCreated (trigger)
5. onAdminDeleted (trigger)

**Todos os códigos estão prontos em:** `functions-deploy/`

---

## 🆘 SE DER ERRO

**Erro: "Missing dependencies"**
- Verifique se copiou o `package.json` correto

**Erro: "Entry point not found"**
- Verifique se o **Entry point** está correto (nome da função exportada)

**Erro: "Deployment failed"**
- Veja os logs em: https://console.cloud.google.com/logs/query?project=YOUR_FIREBASE_PROJECT_ID

**Dúvidas:**
- Consulte: `docs/DEPLOY_VIA_CONSOLE_WEB.md` (guia completo)

---

**Pronto para começar! Comece pela primeira função: setAdminClaim** 🚀
