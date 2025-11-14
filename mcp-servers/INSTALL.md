# 🚀 Guia de Instalação Rápida - Servidores MCP

## Instalação Manual

Execute os seguintes comandos no terminal:

### 1️⃣ Mercado Pago MCP

```bash
cd /workspaces/studiofirebase/mcp-servers/mercadopago
npm install
npm run build
```

### 2️⃣ PayPal MCP

```bash
cd /workspaces/studiofirebase/mcp-servers/paypal
npm install
npm run build
```

### 3️⃣ Apple Pay MCP

```bash
cd /workspaces/studiofirebase/mcp-servers/apple-pay
npm install
npm run build
```

## Ou use o script automatizado:

```bash
chmod +x /workspaces/studiofirebase/mcp-servers/install-all.sh
/workspaces/studiofirebase/mcp-servers/install-all.sh
```

---

## ✅ Verificar Instalação

Após instalar, teste cada servidor:

### Mercado Pago
```bash
cd mcp-servers/mercadopago
npm start
```

### PayPal
```bash
cd mcp-servers/paypal
npm start
```

### Apple Pay
```bash
cd mcp-servers/apple-pay
npm start
```

---

## 🔧 Configuração de Variáveis

Adicione no seu arquivo `.env`:

```bash
# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-seu-token-aqui

# PayPal
PAYPAL_CLIENT_ID=seu-client-id
PAYPAL_CLIENT_SECRET=seu-client-secret
PAYPAL_MODE=sandbox

# Apple Pay
APPLE_PAY_MERCHANT_ID=merchant.com.seudominio
APPLE_PAY_MERCHANT_DOMAIN=seudominio.com
```

---

## 📝 Ferramentas Disponíveis

### 🟦 Mercado Pago (6 ferramentas)
- ✅ `mercadopago_create_pix_payment` - Criar pagamento PIX
- ✅ `mercadopago_get_payment` - Buscar pagamento
- ✅ `mercadopago_check_payment_status` - Verificar status
- ✅ `mercadopago_list_recent_payments` - Listar pagamentos
- ✅ `mercadopago_create_preference` - Criar preferência
- ✅ `mercadopago_refund_payment` - Reembolsar pagamento

### 💙 PayPal (6 ferramentas)
- ✅ `paypal_create_order` - Criar order
- ✅ `paypal_capture_order` - Capturar pagamento
- ✅ `paypal_get_order` - Buscar order
- ✅ `paypal_refund_capture` - Reembolsar
- ✅ `paypal_list_transactions` - Listar transações
- ✅ `paypal_verify_webhook` - Verificar webhook

### 🍎 Apple Pay (5 ferramentas)
- ✅ `applepay_validate_merchant` - Validar merchant
- ✅ `applepay_process_payment` - Processar pagamento
- ✅ `applepay_verify_domain` - Verificar domínio
- ✅ `applepay_create_payment_request` - Criar request
- ✅ `applepay_check_availability` - Verificar disponibilidade

---

## 🎯 Uso no VS Code/IDX

Os servidores já estão configurados no `.idx/mcp.json` e serão carregados automaticamente após a instalação.

Para usar:
1. Pressione `Ctrl/Cmd + Shift + P`
2. Digite "MCP" para ver as ferramentas
3. Selecione a ferramenta desejada

---

## 📚 Documentação Completa

Consulte `mcp-servers/README.md` para exemplos detalhados de uso de cada ferramenta.
