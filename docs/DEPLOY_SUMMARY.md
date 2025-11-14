# 🎯 RESUMO: Deploy de Cloud Functions via gcloud

## ✅ O QUE JÁ FOI FEITO

1. ✅ **Código pronto:** Todas as funções admin estão implementadas em `functions/src/admin-functions.ts`
2. ✅ **Node.js 20 configurado:** Runtime atualizado no `package.json` e `firebase.json`
3. ✅ **Firebase.json limpo:** Removidas configurações de codebases inexistentes
4. ✅ **Função sms-email-code deployada:** Via gcloud console
   - Região: europe-west1
   - URL: https://sms-email-code-479719049222.europe-west1.run.app

## ❌ PROBLEMA IDENTIFICADO

**Erro 403: Write access denied**
- O Firebase CLI não tem permissões para fazer deploy
- Billing está configurado (você conseguiu criar função manual no gcloud)
- Solução: Deploy manual via gcloud CLI

## 🚀 PRÓXIMOS PASSOS

### **Opção 1: Deploy Automático (RECOMENDADO)**

Execute o script que criei:

```bash
cd /Users/italosanta/Downloads/italosantos.com\ original
./scripts/deploy-admin-functions.sh
```

Este script fará deploy de todas as 5 funções admin:
1. `setAdminClaim` - Define custom claim admin
2. `isAdmin` - Verifica se usuário é admin
3. `getAllAdmins` - Lista todos admins
4. `onAdminCreated` - Trigger quando admin é criado
5. `onAdminDeleted` - Trigger quando admin é removido

### **Opção 2: Deploy Manual (Função por Função)**

Se preferir fazer um por vez, use os comandos na documentação:
- Ver: `docs/FUNCTIONS_MANUAL_DEPLOY.md`

### **Opção 3: Deploy via Console (Interface Gráfica)**

Acesse: https://console.cloud.google.com/functions/list?project=YOUR_FIREBASE_PROJECT_ID
- Clique em "Create Function"
- Configure cada função manualmente

## 📋 CHECKLIST DE DEPLOY

- [x] Código das funções pronto
- [x] Runtime Node.js 20 configurado
- [x] Script de deploy criado
- [ ] **EXECUTAR:** `./scripts/deploy-admin-functions.sh`
- [ ] Verificar funções no console
- [ ] Testar com `node scripts/init-admin-system.js`

## 🔧 SE DER ERRO NO SCRIPT

### Erro: "gcloud not found"
Instale o gcloud CLI:
```bash
# macOS
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

### Erro: "Not authenticated"
```bash
gcloud auth login
gcloud config set project YOUR_FIREBASE_PROJECT_ID
```

### Erro: "Permission denied"
Adicione roles IAM para sua conta:
1. Acesse: https://console.cloud.google.com/iam-admin/iam?project=YOUR_FIREBASE_PROJECT_ID
2. Adicione roles:
   - Cloud Functions Admin
   - Cloud Build Service Account
   - Service Account User

## 📊 VERIFICAR DEPLOY

Após executar o script, verifique:

```bash
# Listar todas as funções
gcloud functions list --project=YOUR_FIREBASE_PROJECT_ID --gen2

# Ver detalhes de uma função específica
gcloud functions describe setAdminClaim \
  --gen2 \
  --region=europe-west1 \
  --project=YOUR_FIREBASE_PROJECT_ID
```

## 🧪 TESTAR AS FUNÇÕES

Após deploy, inicialize o sistema:

```bash
cd /Users/italosanta/Downloads/italosantos.com\ original
node scripts/init-admin-system.js
```

Este script irá:
1. Criar collection `admins` no Firestore
2. Criar collection `admin-registrations`
3. Criar primeiro admin
4. Testar custom claims

## 📞 SUPORTE

Se encontrar problemas:
- **Logs das funções:** https://console.cloud.google.com/logs/query?project=YOUR_FIREBASE_PROJECT_ID
- **Status das funções:** https://console.cloud.google.com/functions/list?project=YOUR_FIREBASE_PROJECT_ID
- **Documentação:** `docs/FUNCTIONS_MANUAL_DEPLOY.md`

---

**Comando Rápido para Deploy:**
```bash
cd "/Users/italosanta/Downloads/italosantos.com original" && ./scripts/deploy-admin-functions.sh
```

**Status Atual:** ⏳ Aguardando execução do script de deploy
