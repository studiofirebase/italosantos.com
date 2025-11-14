#!/usr/bin/env node
/**
 * MCP Server para Google Pay
 * Expõe ferramentas para integração completa com Google Pay e Google Wallet
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '../../.env.local' });

interface CreatePaymentData {
  amount: string;
  currency: string;
  description?: string;
  order_id?: string;
}

interface ProcessPaymentData {
  payment_token: any;
  amount: string;
  currency: string;
  order_id?: string;
}

interface CreatePassData {
  card_holder_name: string;
  card_number: string;
  expiry_date: string;
  barcode?: string;
  logo_url?: string;
}

class GooglePayMCPServer {
  private server: Server;
  private merchantId: string;
  private merchantName: string;
  private walletIssuerId: string;
  private environment: 'TEST' | 'PRODUCTION';

  constructor() {
    this.merchantId = process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID || process.env.GOOGLE_PAY_MERCHANT_ID || '';
    this.merchantName = process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_NAME || process.env.GOOGLE_PAY_MERCHANT_NAME || 'Studio VIP';
    this.walletIssuerId = process.env.NEXT_PUBLIC_GOOGLE_WALLET_ISSUER_ID || process.env.GOOGLE_WALLET_ISSUER_ID || '';
    this.environment = (process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'TEST') as 'TEST' | 'PRODUCTION';

    if (!this.merchantId) {
      console.error('⚠️  GOOGLE_PAY_MERCHANT_ID não configurado');
    }

    this.server = new Server(
      {
        name: 'googlepay-mcp-server',
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
          name: 'googlepay_create_payment_request',
          description: 'Cria uma configuração de Payment Request para Google Pay',
          inputSchema: {
            type: 'object',
            properties: {
              amount: {
                type: 'string',
                description: 'Valor do pagamento',
              },
              currency: {
                type: 'string',
                description: 'Código da moeda (ex: USD, BRL)',
                default: 'USD',
              },
              description: {
                type: 'string',
                description: 'Descrição do pagamento',
              },
              order_id: {
                type: 'string',
                description: 'ID do pedido',
              },
            },
            required: ['amount', 'currency'],
          },
        },
        {
          name: 'googlepay_process_payment',
          description: 'Processa um pagamento Google Pay após autorização',
          inputSchema: {
            type: 'object',
            properties: {
              payment_token: {
                type: 'object',
                description: 'Token de pagamento retornado pelo Google Pay',
              },
              amount: {
                type: 'string',
                description: 'Valor do pagamento',
              },
              currency: {
                type: 'string',
                description: 'Código da moeda',
              },
              order_id: {
                type: 'string',
                description: 'ID do pedido',
              },
            },
            required: ['payment_token', 'amount', 'currency'],
          },
        },
        {
          name: 'googlepay_check_availability',
          description: 'Verifica se Google Pay está disponível e configurado',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'googlepay_get_merchant_info',
          description: 'Retorna informações sobre o merchant configurado',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'googlewallet_create_pass',
          description: 'Cria um passe para Google Wallet (cartão de fidelidade, ingresso, etc)',
          inputSchema: {
            type: 'object',
            properties: {
              card_holder_name: {
                type: 'string',
                description: 'Nome do titular do cartão/passe',
              },
              card_number: {
                type: 'string',
                description: 'Número do cartão/passe',
              },
              expiry_date: {
                type: 'string',
                description: 'Data de validade (formato: MM/YYYY)',
              },
              barcode: {
                type: 'string',
                description: 'Código de barras (opcional)',
              },
              logo_url: {
                type: 'string',
                description: 'URL do logo (opcional)',
              },
            },
            required: ['card_holder_name', 'card_number', 'expiry_date'],
          },
        },
        {
          name: 'googlewallet_get_pass',
          description: 'Busca detalhes de um passe no Google Wallet',
          inputSchema: {
            type: 'object',
            properties: {
              pass_id: {
                type: 'string',
                description: 'ID do passe',
              },
            },
            required: ['pass_id'],
          },
        },
        {
          name: 'googlepay_get_supported_methods',
          description: 'Retorna os métodos de pagamento suportados pelo Google Pay',
          inputSchema: {
            type: 'object',
            properties: {
              country_code: {
                type: 'string',
                description: 'Código do país (2 letras)',
                default: 'US',
              },
            },
          },
        },
        {
          name: 'googlepay_validate_payment_data',
          description: 'Valida os dados de pagamento antes de processar',
          inputSchema: {
            type: 'object',
            properties: {
              payment_data: {
                type: 'object',
                description: 'Dados de pagamento a serem validados',
              },
            },
            required: ['payment_data'],
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
          case 'googlepay_create_payment_request':
            return await this.createPaymentRequest(args as CreatePaymentData);

          case 'googlepay_process_payment':
            return await this.processPayment(args as ProcessPaymentData);

          case 'googlepay_check_availability':
            return await this.checkAvailability();

          case 'googlepay_get_merchant_info':
            return await this.getMerchantInfo();

          case 'googlewallet_create_pass':
            return await this.createWalletPass(args as CreatePassData);

          case 'googlewallet_get_pass':
            return await this.getWalletPass(args.pass_id as string);

          case 'googlepay_get_supported_methods':
            return await this.getSupportedMethods(args.country_code as string);

          case 'googlepay_validate_payment_data':
            return await this.validatePaymentData(args.payment_data);

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

  private async createPaymentRequest(data: CreatePaymentData) {
    const config = {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [
        {
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA'],
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: {
              gateway: 'example', // Substitua pelo seu gateway
              gatewayMerchantId: this.merchantId,
            },
          },
        },
      ],
      merchantInfo: {
        merchantId: this.merchantId,
        merchantName: this.merchantName,
      },
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPriceLabel: 'Total',
        totalPrice: data.amount,
        currencyCode: data.currency,
        countryCode: 'US',
      },
      callbackIntents: ['PAYMENT_AUTHORIZATION'],
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            payment_request_config: config,
            environment: this.environment,
            merchant_id: this.merchantId,
            order_id: data.order_id,
            usage: 'Use esta configuração para inicializar o Google Pay no navegador',
          }, null, 2),
        },
      ],
    };
  }

  private async processPayment(data: ProcessPaymentData) {
    // Simular processamento do pagamento
    const paymentId = `googlepay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Em produção, você decodificaria o payment_token e enviaria para o processador
    // Este é um exemplo simplificado

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
            order_id: data.order_id,
            processed_at: new Date().toISOString(),
            payment_method: 'google_pay',
            message: 'Pagamento processado com sucesso',
            transaction_id: `txn_${Date.now()}`,
          }, null, 2),
        },
      ],
    };
  }

  private async checkAvailability() {
    const hasMerchantId = !!this.merchantId;
    const hasWalletId = !!this.walletIssuerId;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            available: true,
            merchant_id: hasMerchantId ? this.merchantId : null,
            merchant_name: this.merchantName,
            merchant_id_configured: hasMerchantId,
            wallet_issuer_id_configured: hasWalletId,
            environment: this.environment,
            ready_for_production: hasMerchantId && this.environment === 'PRODUCTION',
            warnings: !hasMerchantId ? ['Merchant ID não configurado'] : [],
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
            merchant_name: this.merchantName,
            wallet_issuer_id: this.walletIssuerId,
            environment: this.environment,
            supported_networks: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA'],
            supported_auth_methods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            base_url: process.env.NEXT_PUBLIC_BASE_URL,
          }, null, 2),
        },
      ],
    };
  }

  private async createWalletPass(data: CreatePassData) {
    const passId = `${this.walletIssuerId}.${Date.now()}`;
    
    const passData = {
      id: passId,
      classId: `${this.walletIssuerId}.loyalty_class`,
      state: 'ACTIVE',
      cardholderName: data.card_holder_name,
      accountId: data.card_number,
      accountName: this.merchantName,
      barcode: data.barcode ? {
        type: 'QR_CODE',
        value: data.barcode,
        alternateText: data.card_number,
      } : undefined,
      textModulesData: [
        {
          header: 'Número do Cartão',
          body: data.card_number,
        },
        {
          header: 'Validade',
          body: data.expiry_date,
        },
      ],
      logo: data.logo_url ? {
        sourceUri: {
          uri: data.logo_url,
        },
      } : undefined,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            pass_id: passId,
            pass_data: passData,
            save_url: `https://pay.google.com/gp/v/save/${passId}`,
            message: 'Passe criado com sucesso',
          }, null, 2),
        },
      ],
    };
  }

  private async getWalletPass(passId: string) {
    // Em produção, você faria uma chamada à API do Google Wallet
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            pass_id: passId,
            status: 'active',
            issuer_id: this.walletIssuerId,
            message: 'Use a Google Wallet API para buscar detalhes reais do passe',
          }, null, 2),
        },
      ],
    };
  }

  private async getSupportedMethods(countryCode: string = 'US') {
    const methods = {
      countryCode: countryCode,
      supportedPaymentMethods: [
        {
          type: 'CARD',
          networks: ['AMEX', 'DISCOVER', 'MASTERCARD', 'VISA'],
          authMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
        },
      ],
      additionalPaymentMethods: countryCode === 'BR' ? ['PIX', 'BOLETO'] : [],
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(methods, null, 2),
        },
      ],
    };
  }

  private async validatePaymentData(paymentData: any) {
    const validation = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
    };

    // Validações básicas
    if (!paymentData.paymentMethodData) {
      validation.valid = false;
      validation.errors.push('paymentMethodData ausente');
    }

    if (!paymentData.paymentMethodData?.tokenizationData) {
      validation.valid = false;
      validation.errors.push('tokenizationData ausente');
    }

    if (!paymentData.paymentMethodData?.info) {
      validation.warnings.push('info do método de pagamento ausente');
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            validation,
            payment_data_summary: {
              has_token: !!paymentData.paymentMethodData?.tokenizationData?.token,
              card_network: paymentData.paymentMethodData?.info?.cardNetwork,
              card_details: paymentData.paymentMethodData?.info?.cardDetails,
            },
          }, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🚀 Google Pay MCP Server rodando...');
  }
}

// Inicializar servidor
const server = new GooglePayMCPServer();
server.run().catch(console.error);
