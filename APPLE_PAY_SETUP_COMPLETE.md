# ✅ APPLE PAY + BRAINTREE - CONFIGURAÇÃO CONCLUÍDA

**Data:** 12 de novembro de 2025  
**Status:** ✅ Credenciais e certificados configurados em modo Sandbox

---

## 📁 ESTRUTURA DE CERTIFICADOS

```
/certs/
├── apple-pay-cert.pem (2167 bytes) ✅ Certificado válido
├── apple-pay-key.pem (61 bytes) ⚠️ Placeholder - PRECISA DA CHAVE REAL
└── merchant_id.cer (1559 bytes) ✅ Certificado original Apple
```

---

## 🔐 CREDENCIAIS CONFIGURADAS

### Braintree Sandbox
```bash
✅ BRAINTREE_ENV=sandbox
✅ BRAINTREE_MERCHANT_ID=75tzy2qyrkv9hfwj
✅ BRAINTREE_PUBLIC_KEY=vkvp26rxfb4wd4qx
✅ BRAINTREE_PRIVATE_KEY=7eefa5f69c77f009e83281a9491a6c4d
```

### Apple Pay
```bash
✅ APPLE_PAY_ENVIRONMENT=sandbox
✅ APPLE_PAY_DEBUG=true
✅ APPLE_PAY_MERCHANT_ID=merchant.italosantos.com
✅ APPLE_PAY_DOMAIN_NAME=italosantos.com
✅ APPLE_PAY_DISPLAY_NAME=Italo Santos
✅ NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID=merchant.italosantos.com
```

---

## ⚠️ AÇÃO NECESSÁRIA - CHAVE PRIVADA

O arquivo `apple-pay-key.pem` atual é apenas um placeholder. Você precisa:

### Opção 1: Se você tem o arquivo .p12 original
```bash
# Extrair chave privada do arquivo .p12
openssl pkcs12 -in merchant_id.p12 -nocerts -out apple-pay-key.pem -nodes
```

### Opção 2: Se você tem acesso ao Keychain (Mac)
```bash
# 1. Abrir Keychain Access
# 2. Encontrar o certificado "Merchant ID: merchant.italosantos.com"
# 3. Expandir e exportar a chave privada como .p12
# 4. Converter para .pem:
openssl pkcs12 -in exported-key.p12 -nocerts -out apple-pay-key.pem -nodes
```

### Opção 3: Gerar novo par de certificado/chave
```bash
# 1. Gerar nova CSR no Apple Developer Portal
# 2. Baixar novo certificado
# 3. Converter para .pem com a chave privada gerada localmente
```

**Localização:** `/Users/italosanta/Documents/download (3) 2/certs/apple-pay-key.pem`

---

## 🛡️ SEGURANÇA - .gitignore

Arquivos protegidos contra commit:
```
✅ certs/ (diretório inteiro)
✅ *.pem (todos os certificados)
✅ *.cer (certificados originais)
✅ *.key (chaves privadas)
```

---

## 📋 PRÓXIMOS PASSOS

### 1. ⚠️ CRÍTICO: Adicionar chave privada real
```bash
# Substituir conteúdo de certs/apple-pay-key.pem
# com a chave privada RSA real do certificado
```

### 2. Implementar botão Apple Pay na loja
```tsx
// Arquivo: src/app/loja/page.tsx
import ApplePayButton from '@/components/payments/ApplePayButton';

// Dentro do CardFooter de cada produto:
<div className="space-y-2">
  {/* PayPal existente */}
  <PayPalButtons ... />
  
  {/* Novo: Apple Pay */}
  <ApplePayButton
    amount={product.price.toFixed(2)}
    currency="BRL"
    countryCode="BR"
    merchantId={process.env.NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID || ''}
    onPaymentSuccess={async (response) => {
      await handlePurchaseSuccess(product.id, {
        paymentMethod: 'apple_pay',
        transactionId: response.transactionIdentifier
      });
    }}
    onPaymentError={(error) => {
      toast({
        variant: "destructive",
        title: "Erro Apple Pay",
        description: error.message
      });
    }}
    buttonStyle="black"
    buttonType="buy"
    className="w-full"
  />
</div>
```

### 3. Testar em Safari
- Abrir https://italosantos.com/loja em Safari (Mac/iPhone)
- Verificar se botão Apple Pay aparece
- Testar fluxo de pagamento completo

### 4. Verificar APIs funcionando
```bash
# Testar geração de token
curl -X POST https://italosantos.com/api/braintree/token \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"

# Testar validação de merchant
curl -X POST https://italosantos.com/api/payments/apple-pay/validate-merchant \
  -H "Content-Type: application/json" \
  -d '{"validationURL":"https://apple-pay-gateway.apple.com/...", "merchantId":"merchant.italosantos.com"}'
```

---

## 🔄 MIGRAÇÃO PARA PRODUÇÃO

Quando estiver tudo testado em sandbox:

### 1. Obter credenciais de produção
```bash
# Braintree: https://www.braintreegateway.com/
# Mudar de Sandbox para Production Account
BRAINTREE_ENV=production
BRAINTREE_MERCHANT_ID=seu_merchant_id_producao
BRAINTREE_PUBLIC_KEY=sua_public_key_producao
BRAINTREE_PRIVATE_KEY=sua_private_key_producao
```

### 2. Configurar Apple Pay para produção
```bash
APPLE_PAY_ENVIRONMENT=production
APPLE_PAY_DEBUG=false
```

### 3. Certificado de produção
- Gerar novo certificado no Apple Developer Portal
- Marcar como "Production" ao criar
- Substituir arquivos em /certs/

---

## 📊 CHECKLIST DE VALIDAÇÃO

### Configuração Básica
- [x] Credenciais Braintree adicionadas ao .env.private
- [x] Certificado Apple Pay em /certs/apple-pay-cert.pem
- [ ] Chave privada Apple Pay em /certs/apple-pay-key.pem (⚠️ PENDENTE)
- [x] Variáveis APPLE_PAY_* configuradas
- [x] .gitignore protegendo certificados

### Implementação
- [ ] ApplePayButton adicionado em /src/app/loja/page.tsx
- [ ] Handler handlePurchaseSuccess atualizado
- [ ] Toast de erro configurado

### Testes
- [ ] Botão Apple Pay visível em Safari
- [ ] Validação de merchant funcionando
- [ ] Pagamento processado com sucesso
- [ ] Transação salva no Firestore
- [ ] Status do usuário atualizado

### Produção
- [ ] Credenciais Braintree de produção
- [ ] Certificado Apple Pay de produção
- [ ] APPLE_PAY_ENVIRONMENT=production
- [ ] BRAINTREE_ENV=production
- [ ] Testes em ambiente real

---

## 🆘 TROUBLESHOOTING

### Erro: "Bad sha1 file" ao fazer commit
✅ **Resolvido:** Certificados estão no .gitignore

### Erro: "Merchant validation failed"
⚠️ **Causa provável:** Chave privada inválida ou ausente
🔧 **Solução:** Adicionar chave privada real ao apple-pay-key.pem

### Erro: "Braintree credentials not configured"
✅ **Resolvido:** Credenciais já adicionadas ao .env.private

### Botão Apple Pay não aparece
Verificar:
1. Navegador é Safari/Chrome em dispositivo Apple
2. HTTPS habilitado
3. NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID está definido
4. ApplePayButton importado e usado corretamente

---

## 📞 SUPORTE

### Braintree
- Dashboard: https://sandbox.braintreegateway.com/
- Docs: https://developer.paypal.com/braintree/docs
- Suporte: https://www.braintreegateway.com/support

### Apple Pay
- Developer Portal: https://developer.apple.com/
- Docs: https://developer.apple.com/apple-pay/
- Suporte: https://developer.apple.com/support/

---

**Configuração realizada por:** GitHub Copilot  
**Última atualização:** 12/11/2025 11:18
