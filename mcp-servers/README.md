# Servidores MCP de Pagamentos

Este diretório contém servidores MCP (Model Context Protocol) para integração com diferentes plataformas de pagamento.

## 📦 Servidores Disponíveis

### 🇧🇷 Mercado Pago MCP Server

Servidor para integração completa com Mercado Pago, incluindo PIX e outros métodos de pagamento.

**Localização:** `mcp-servers/mercadopago/`

#### Ferramentas Disponíveis

1. **mercadopago_create_pix_payment**
   - Cria um novo pagamento PIX
   - Retorna QR Code e código "Copia e Cola"
   - Parâmetros: amount, email, name, cpf, description (opcional)

2. **mercadopago_get_payment**
   - Busca informações detalhadas de um pagamento
   - Parâmetro: payment_id

3. **mercadopago_check_payment_status**
   - Verifica se um pagamento foi aprovado
   - Parâmetro: payment_id

4. **mercadopago_list_recent_payments**
   - Lista pagamentos PIX aprovados recentes
   - Parâmetro: limit (opcional, padrão: 10)

5. **mercadopago_list_all_payments**
   - Lista todos os pagamentos independente do status
   - Parâmetro: limit (opcional, padrão: 20)

6. **mercadopago_refund_payment**
   - Realiza reembolso total de um pagamento
   - Parâmetro: payment_id

#### Configuração

Defina no `.env.local`:
```env
MERCADOPAGO_ACCESS_TOKEN=your_access_token_here
```

---

### 💙 PayPal MCP Server

Servidor para integração com PayPal incluindo pagamentos únicos e assinaturas recorrentes.

**Localização:** `mcp-servers/paypal/`

#### Ferramentas Disponíveis

1. **paypal_create_order**
   - Cria uma nova ordem de pagamento
   - Parâmetros: amount, currency (opcional), description, return_url, cancel_url
   - Retorna: order_id, approval_url

2. **paypal_capture_order**
   - Captura (finaliza) uma ordem aprovada
   - Parâmetro: order_id
   - Retorna: capture_id, status, amount

3. **paypal_get_order**
   - Busca detalhes completos de uma ordem
   - Parâmetro: order_id

4. **paypal_list_payments**
   - Lista transações recentes
   - Parâmetros: start_date, end_date, page_size (opcional)

5. **paypal_create_subscription**
   - Cria uma nova assinatura recorrente
   - Parâmetros: plan_id, subscriber_email, subscriber_name
   - Retorna: subscription_id, approval_url

6. **paypal_get_subscription**
   - Busca detalhes de uma assinatura
   - Parâmetro: subscription_id

7. **paypal_cancel_subscription**
   - Cancela uma assinatura ativa
   - Parâmetros: subscription_id, reason (opcional)

8. **paypal_refund_capture**
   - Reembolsa total ou parcialmente um pagamento
   - Parâmetros: capture_id, amount (opcional), currency, note

#### Configuração

Defina no `.env.local`:
```env
PAYPAL_CLIENT_ID=your_client_id_here
PAYPAL_CLIENT_SECRET=your_client_secret_here
PAYPAL_MODE=sandbox # ou 'live' para produção
```

---

### 🍎 Apple Pay MCP Server

Servidor para integração com Apple Pay via Payment Request API.

**Localização:** `mcp-servers/applepay/`

#### Ferramentas Disponíveis

1. **applepay_validate_merchant**
   - Valida o merchant junto à Apple
   - Parâmetros: validation_url, merchant_id (opcional), display_name (opcional)
   - Retorna: merchant_session

2. **applepay_process_payment**
   - Processa um pagamento Apple Pay autorizado
   - Parâmetros: payment_token, amount, currency, description, order_id
   - Retorna: payment_id, status

3. **applepay_check_availability**
   - Verifica disponibilidade e configuração
   - Retorna: status dos certificados, merchant_id, environment

4. **applepay_get_merchant_info**
   - Retorna informações do merchant configurado
   - Retorna: merchant_id, supported_networks, merchant_capabilities

5. **applepay_create_payment_request**
   - Cria configuração de Payment Request
   - Parâmetros: amount, currency, label, country_code, request_shipping, request_billing
   - Retorna: payment_request_config

#### Configuração

Defina no `.env.local`:
```env
NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID=merchant.your-domain.com
APPLE_PAY_ENVIRONMENT=sandbox # ou 'production'
APPLE_PAY_MERCHANT_CERT_PATH=./certs/merchant_id.pem
APPLE_PAY_MERCHANT_KEY_PATH=./certs/merchant_id.key
```

**Nota:** Para produção, você precisa dos certificados Apple Pay. Em desenvolvimento, o servidor usa simulação.

---

### 🔴 Google Pay MCP Server

Servidor para integração com Google Pay e Google Wallet (passes, cartões de fidelidade).

**Localização:** `mcp-servers/googlepay/`

#### Ferramentas Disponíveis

1. **googlepay_create_payment_request**
   - Cria configuração de Payment Request para Google Pay
   - Parâmetros: amount, currency, description, order_id
   - Retorna: payment_request_config

2. **googlepay_process_payment**
   - Processa um pagamento Google Pay autorizado
   - Parâmetros: payment_token, amount, currency, order_id
   - Retorna: payment_id, status, transaction_id

3. **googlepay_check_availability**
   - Verifica disponibilidade e configuração
   - Retorna: merchant_id, environment, ready_for_production

4. **googlepay_get_merchant_info**
   - Retorna informações do merchant
   - Retorna: merchant_id, merchant_name, supported_networks

5. **googlewallet_create_pass**
   - Cria um passe para Google Wallet
   - Parâmetros: card_holder_name, card_number, expiry_date, barcode, logo_url
   - Retorna: pass_id, save_url

6. **googlewallet_get_pass**
   - Busca detalhes de um passe
   - Parâmetro: pass_id

7. **googlepay_get_supported_methods**
   - Lista métodos de pagamento suportados por país
   - Parâmetro: country_code (opcional)

8. **googlepay_validate_payment_data**
   - Valida dados de pagamento antes de processar
   - Parâmetro: payment_data

#### Configuração

Defina no `.env.local`:
```env
NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID=your_merchant_id
NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_NAME="Your Business Name"
NEXT_PUBLIC_GOOGLE_WALLET_ISSUER_ID=your_issuer_id
```

---

## 🚀 Instalação

### 1. Instalar Dependências

Cada servidor tem suas próprias dependências. Instale-as navegando até o diretório de cada servidor:

```bash
# Mercado Pago
cd mcp-servers/mercadopago
npm install

# PayPal
cd ../paypal
npm install

# Apple Pay
cd ../applepay
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie e configure as variáveis necessárias no arquivo `.env.local` na raiz do projeto.

### 3. Testar os Servidores

Você pode testar cada servidor individualmente:

```bash
# Mercado Pago
cd mcp-servers/mercadopago
npm start

# PayPal
cd ../paypal
npm start

# Apple Pay
cd ../applepay
npm start
```

---

## 📝 Uso no VS Code / IDX

Os servidores MCP estão configurados no arquivo `.idx/mcp.json` e serão carregados automaticamente pelo VS Code ou IDX.

### Como Usar as Ferramentas

1. Abra o painel de comandos (Ctrl/Cmd + Shift + P)
2. Digite "MCP" para ver as ferramentas disponíveis
3. Selecione a ferramenta desejada
4. Preencha os parâmetros solicitados

### Exemplos de Uso

#### Criar Pagamento PIX (Mercado Pago)
```json
{
  "amount": 99.00,
  "email": "cliente@example.com",
  "name": "João Silva",
  "cpf": "12345678900",
  "description": "Assinatura Premium"
}
```

#### Criar Ordem PayPal
```json
{
  "amount": "99.00",
  "currency": "USD",
  "description": "Premium Subscription"
}
```

#### Validar Merchant Apple Pay
```json
{
  "validation_url": "https://apple-pay-gateway.apple.com/...",
  "merchant_id": "merchant.italosantos.com"
}
```

---

## 🔧 Desenvolvimento

### Estrutura dos Servidores

Cada servidor segue a mesma estrutura:

```
mcp-servers/[nome]/
├── index.ts          # Código principal do servidor
├── package.json      # Dependências e scripts
├── tsconfig.json     # Configuração TypeScript
└── README.md         # Documentação específica (opcional)
```

### Adicionar Novas Ferramentas

Para adicionar uma nova ferramenta a um servidor:

1. Defina a ferramenta no método `setupHandlers()` dentro de `ListToolsRequestSchema`
2. Implemente a lógica no switch case dentro de `CallToolRequestSchema`
3. Crie um método privado para a funcionalidade
4. Documente a ferramenta neste README

### Hot Reload

Use o modo de desenvolvimento para hot reload:

```bash
npm run dev
```

---

## 🐛 Troubleshooting

### Mercado Pago

- **Erro de autenticação**: Verifique se `MERCADOPAGO_ACCESS_TOKEN` está corretamente configurado
- **QR Code não gerado**: Certifique-se que o CPF está válido e no formato correto

### PayPal

- **Erro 401**: Verifique `PAYPAL_CLIENT_ID` e `PAYPAL_CLIENT_SECRET`
- **Modo sandbox**: Use contas de teste do PayPal Developer

### Apple Pay

- **Certificados não encontrados**: Configure os caminhos corretos ou use o modo simulado
- **Validação falha**: Verifique se o merchant_id está correto e registrado na Apple

---

## 📚 Recursos Adicionais

- [Model Context Protocol Docs](https://modelcontextprotocol.io/)
- [Mercado Pago API Docs](https://www.mercadopago.com.br/developers)
- [PayPal API Docs](https://developer.paypal.com/docs/api/)
- [Apple Pay JS API](https://developer.apple.com/documentation/apple_pay_on_the_web)

---

## 📄 Licença

Este projeto está sob a mesma licença do projeto principal.

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

---

**Desenvolvido com ❤️ para Studio VIP**
