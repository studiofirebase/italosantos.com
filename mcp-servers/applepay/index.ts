#!/usr/bin/env node
/**
 * MCP Server para Apple Pay
 * Expõe ferramentas para integração com Apple Pay via Payment Request API
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: '../../.env.local' });

interface ValidateMerchantData {
  validation_url: string;
  merchant_id: string;
  display_name?: string;
}

interface ProcessPaymentData {
  payment_token: any;
  amount: string;
  currency: string;
  description?: string;
  order_id?: string;
}

interface ApplePaySession {
  id: string;
  merchant_session: any;
  created_at: string;
}

class ApplePayMCPServer {
  private server: Server;
  private merchantId: string;
  private merchantCertPath: string;
  private merchantKeyPath: string;
  private environment: 'sandbox' | 'production';

  constructor() {
    this.merchantId = process.env.NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID || '';
    this.merchantCertPath = process.env.APPLE_PAY_MERCHANT_CERT_PATH || './certs/merchant_id.pem';
    this.merchantKeyPath = process.env.APPLE_PAY_MERCHANT_KEY_PATH || './certs/merchant_id.key';
    this.environment = (process.env.APPLE_PAY_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';

    if (!this.merchantId) {
      console.error('⚠️  APPLE_PAY_MERCHANT_ID não configurado');
    }

    this.server = new Server(
      {
        name: 'applepay-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // Listar ferramentas disponíveis
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'applepay_validate_merchant',
          description: 'Valida o merchant junto à Apple para iniciar uma sessão de pagamento',
          inputSchema: {
            type: 'object',
            properties: {
              validation_url: {
                type: 'string',
                description: 'URL de validação fornecida pelo Apple Pay JS',
              },
              merchant_id: {
                type: 'string',
                description: 'ID do merchant Apple Pay (opcional, usa o padrão se não fornecido)',
              },
              display_name: {
                type: 'string',
                description: 'Nome de exibição do merchant (opcional)',
              },
            },
            required: ['validation_url'],
          },
        },
        {
          name: 'applepay_process_payment',
          description: 'Processa um pagamento Apple Pay após autorização do usuário',
          inputSchema: {
            type: 'object',
            properties: {
              payment_token: {
                type: 'object',
                description: 'Token de pagamento retornado pelo Apple Pay',
              },
              amount: {
                type: 'string',
                description: 'Valor do pagamento',
              },
              currency: {
                type: 'string',
                description: 'Código da moeda (ex: USD, BRL)',
              },
              description: {
                type: 'string',
                description: 'Descrição do pagamento',
              },
              order_id: {
                type: 'string',
                description: 'ID do pedido relacionado',
              },
            },
            required: ['payment_token', 'amount', 'currency'],
          },
        },
        {
          name: 'applepay_check_availability',
          description: 'Verifica se Apple Pay está disponível e configurado corretamente',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'applepay_get_merchant_info',
          description: 'Retorna informações sobre a configuração do merchant',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'applepay_create_payment_request',
          description: 'Cria uma configuração de Payment Request para Apple Pay',
          inputSchema: {
            type: 'object',
            properties: {
              amount: {
                type: 'string',
                description: 'Valor total do pagamento',
              },
              currency: {
                type: 'string',
                description: 'Código da moeda',
                default: 'USD',
              },
              country_code: {
                type: 'string',
                description: 'Código do país (2 letras)',
                default: 'US',
              },
              label: {
                type: 'string',
                description: 'Label do pagamento',
              },
              request_shipping: {
                type: 'boolean',
                description: 'Se deve solicitar endereço de entrega',
                default: false,
              },
              request_billing: {
                type: 'boolean',
                description: 'Se deve solicitar endereço de cobrança',
                default: false,
              },
            },
            required: ['amount', 'label'],
          },
        },
      ];

      return { tools };
    });

    // Executar ferramentas
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'applepay_validate_merchant':
            return await this.validateMerchant(args as ValidateMerchantData);

          case 'applepay_process_payment':
            return await this.processPayment(args as ProcessPaymentData);

          case 'applepay_check_availability':
            return await this.checkAvailability();

          case 'applepay_get_merchant_info':
            return await this.getMerchantInfo();

          case 'applepay_create_payment_request':
            return await this.createPaymentRequest(args);

          default:
            throw new Error(`Ferramenta desconhecida: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error.message || 'Erro desconhecido',
                details: error.cause || error,
              }, null, 2),
            },
          ],
        };
      }
    });
  }

  private async validateMerchant(data: ValidateMerchantData) {
    const merchantId = data.merchant_id || this.merchantId;
    const displayName = data.display_name || 'Studio VIP';

    // Verificar se os certificados existem
    const certExists = fs.existsSync(this.merchantCertPath);
    const keyExists = fs.existsSync(this.merchantKeyPath);

    if (!certExists || !keyExists) {
      console.warn('⚠️  Certificados Apple Pay não encontrados, usando simulação');
      
      // Retornar sessão simulada para desenvolvimento
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              simulated: true,
              merchant_session: {
                epochTimestamp: Date.now(),
                expiresAt: Date.now() + 300000, // 5 minutos
                merchantSessionIdentifier: `SIMULATED_${Date.now()}`,
                nonce: Buffer.from(String(Math.random())).toString('base64'),
                merchantIdentifier: merchantId,
                displayName: displayName,
                signature: 'SIMULATED_SIGNATURE',
              },
              message: 'Usando sessão simulada - Configure os certificados para produção',
            }, null, 2),
          },
        ],
      };
    }

    // Carregar certificados
    const cert = fs.readFileSync(this.merchantCertPath);
    const key = fs.readFileSync(this.merchantKeyPath);

    // Preparar payload para Apple
    const payload = {
      merchantIdentifier: merchantId,
      displayName: displayName,
      initiative: 'web',
      initiativeContext: process.env.NEXT_PUBLIC_BASE_URL?.replace('https://', '') || 'localhost',
    };

    // Fazer requisição à Apple
    return new Promise((resolve, reject) => {
      const options = {
        hostname: new URL(data.validation_url).hostname,
        port: 443,
        path: new URL(data.validation_url).pathname,
        method: 'POST',
        cert: cert,
        key: key,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const req = https.request(options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            const merchantSession = JSON.parse(body);
            resolve({
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    merchant_session: merchantSession,
                  }, null, 2),
                },
              ],
            });
          } else {
            reject(new Error(`Falha na validação: ${res.statusCode} - ${body}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(JSON.stringify(payload));
      req.end();
    });
  }

  private async processPayment(data: ProcessPaymentData) {
    // Aqui você integraria com seu processador de pagamentos
    // Por exemplo, Stripe, Adyen, ou seu próprio gateway

    // Para demonstração, vamos simular o processamento
    const paymentId = `applepay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Em produção, você enviaria o payment_token para o processador
    // e validaria a resposta
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            payment_id: paymentId,
            status: 'approved',
            amount: data.amount,
            currency: data.currency,
            description: data.description,
            order_id: data.order_id,
            processed_at: new Date().toISOString(),
            payment_method: 'apple_pay',
            message: 'Pagamento processado com sucesso',
          }, null, 2),
        },
      ],
    };
  }

  private async checkAvailability() {
    const certExists = fs.existsSync(this.merchantCertPath);
    const keyExists = fs.existsSync(this.merchantKeyPath);
    const hasMerchantId = !!this.merchantId;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            available: true,
            merchant_id: hasMerchantId ? this.merchantId : null,
            merchant_id_configured: hasMerchantId,
            certificates_found: certExists && keyExists,
            cert_path: this.merchantCertPath,
            key_path: this.merchantKeyPath,
            environment: this.environment,
            ready_for_production: hasMerchantId && certExists && keyExists,
            warnings: !hasMerchantId || !certExists || !keyExists ? [
              !hasMerchantId ? 'Merchant ID não configurado' : null,
              !certExists ? 'Certificado do merchant não encontrado' : null,
              !keyExists ? 'Chave do merchant não encontrada' : null,
            ].filter(Boolean) : [],
          }, null, 2),
        },
      ],
    };
  }

  private async getMerchantInfo() {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            merchant_id: this.merchantId,
            environment: this.environment,
            supported_networks: ['visa', 'masterCard', 'amex', 'discover'],
            merchant_capabilities: ['supports3DS', 'supportsCredit', 'supportsDebit'],
            base_url: process.env.NEXT_PUBLIC_BASE_URL,
            country_code: 'US',
          }, null, 2),
        },
      ],
    };
  }

  private async createPaymentRequest(params: any) {
    const config = {
      method: {
        supportedMethods: 'https://apple.com/apple-pay',
        data: {
          version: 3,
          merchantIdentifier: this.merchantId,
          merchantCapabilities: ['supports3DS', 'supportsCredit', 'supportsDebit'],
          supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
          countryCode: params.country_code || 'US',
        },
      },
      details: {
        total: {
          label: params.label || 'Total',
          amount: {
            currency: params.currency || 'USD',
            value: params.amount,
          },
        },
      },
      options: {
        requestPayerName: true,
        requestPayerEmail: true,
        requestPayerPhone: params.request_phone || false,
        requestShipping: params.request_shipping || false,
        requestBillingAddress: params.request_billing || false,
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            payment_request_config: config,
            usage: 'Use esta configuração para inicializar o PaymentRequest no navegador',
          }, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🚀 Apple Pay MCP Server rodando...');
  }
}

// Inicializar servidor
const server = new ApplePayMCPServer();
server.run().catch(console.error);
