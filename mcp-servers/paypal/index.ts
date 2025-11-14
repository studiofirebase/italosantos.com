#!/usr/bin/env node
/**
 * MCP Server para PayPal
 * Expõe ferramentas para integração completa com pagamentos via PayPal
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

interface CreateOrderData {
  amount: string;
  currency?: string;
  description?: string;
  return_url?: string;
  cancel_url?: string;
}

interface CaptureOrderData {
  order_id: string;
}

interface CreateSubscriptionData {
  plan_id: string;
  subscriber_email: string;
  subscriber_name: string;
}

class PayPalMCPServer {
  private server: Server;
  private clientId: string;
  private clientSecret: string;
  private mode: 'sandbox' | 'live';
  private baseUrl: string;

  constructor() {
    this.clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || '';
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
    this.mode = (process.env.NEXT_PUBLIC_PAYPAL_MODE || process.env.PAYPAL_MODE || 'sandbox') as 'sandbox' | 'live';
    this.baseUrl = this.mode === 'live' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';

    if (!this.clientId || !this.clientSecret) {
      console.error('⚠️  Credenciais do PayPal não configuradas');
    }

    this.server = new Server(
      {
        name: 'paypal-mcp-server',
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

  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error('Falha ao obter access token do PayPal');
    }

    const data = await response.json();
    return data.access_token;
  }

  private setupHandlers() {
    // Listar ferramentas disponíveis
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'paypal_create_order',
          description: 'Cria uma nova ordem de pagamento no PayPal',
          inputSchema: {
            type: 'object',
            properties: {
              amount: {
                type: 'string',
                description: 'Valor do pagamento (ex: "99.00")',
              },
              currency: {
                type: 'string',
                description: 'Código da moeda (padrão: USD)',
                default: 'USD',
              },
              description: {
                type: 'string',
                description: 'Descrição do pagamento',
              },
              return_url: {
                type: 'string',
                description: 'URL de retorno após pagamento bem-sucedido',
              },
              cancel_url: {
                type: 'string',
                description: 'URL de retorno se o pagamento for cancelado',
              },
            },
            required: ['amount'],
          },
        },
        {
          name: 'paypal_capture_order',
          description: 'Captura (finaliza) uma ordem de pagamento aprovada',
          inputSchema: {
            type: 'object',
            properties: {
              order_id: {
                type: 'string',
                description: 'ID da ordem a ser capturada',
              },
            },
            required: ['order_id'],
          },
        },
        {
          name: 'paypal_get_order',
          description: 'Busca detalhes de uma ordem específica',
          inputSchema: {
            type: 'object',
            properties: {
              order_id: {
                type: 'string',
                description: 'ID da ordem',
              },
            },
            required: ['order_id'],
          },
        },
        {
          name: 'paypal_list_payments',
          description: 'Lista transações/pagamentos recentes',
          inputSchema: {
            type: 'object',
            properties: {
              start_date: {
                type: 'string',
                description: 'Data inicial (ISO 8601 format, ex: 2024-01-01T00:00:00Z)',
              },
              end_date: {
                type: 'string',
                description: 'Data final (ISO 8601 format)',
              },
              page_size: {
                type: 'number',
                description: 'Quantidade de resultados por página (padrão: 10)',
                minimum: 1,
                maximum: 500,
              },
            },
          },
        },
        {
          name: 'paypal_create_subscription',
          description: 'Cria uma nova assinatura recorrente',
          inputSchema: {
            type: 'object',
            properties: {
              plan_id: {
                type: 'string',
                description: 'ID do plano de assinatura',
              },
              subscriber_email: {
                type: 'string',
                description: 'Email do assinante',
                format: 'email',
              },
              subscriber_name: {
                type: 'string',
                description: 'Nome do assinante',
              },
            },
            required: ['plan_id', 'subscriber_email'],
          },
        },
        {
          name: 'paypal_get_subscription',
          description: 'Busca detalhes de uma assinatura',
          inputSchema: {
            type: 'object',
            properties: {
              subscription_id: {
                type: 'string',
                description: 'ID da assinatura',
              },
            },
            required: ['subscription_id'],
          },
        },
        {
          name: 'paypal_cancel_subscription',
          description: 'Cancela uma assinatura ativa',
          inputSchema: {
            type: 'object',
            properties: {
              subscription_id: {
                type: 'string',
                description: 'ID da assinatura a ser cancelada',
              },
              reason: {
                type: 'string',
                description: 'Motivo do cancelamento',
              },
            },
            required: ['subscription_id'],
          },
        },
        {
          name: 'paypal_refund_capture',
          description: 'Reembolsa total ou parcialmente um pagamento capturado',
          inputSchema: {
            type: 'object',
            properties: {
              capture_id: {
                type: 'string',
                description: 'ID da captura a ser reembolsada',
              },
              amount: {
                type: 'string',
                description: 'Valor do reembolso (opcional, vazio = reembolso total)',
              },
              currency: {
                type: 'string',
                description: 'Código da moeda',
              },
              note: {
                type: 'string',
                description: 'Nota/motivo do reembolso',
              },
            },
            required: ['capture_id'],
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
          case 'paypal_create_order':
            return await this.createOrder(args as CreateOrderData);

          case 'paypal_capture_order':
            return await this.captureOrder(args as CaptureOrderData);

          case 'paypal_get_order':
            return await this.getOrder(args.order_id as string);

          case 'paypal_list_payments':
            return await this.listPayments(args);

          case 'paypal_create_subscription':
            return await this.createSubscription(args as CreateSubscriptionData);

          case 'paypal_get_subscription':
            return await this.getSubscription(args.subscription_id as string);

          case 'paypal_cancel_subscription':
            return await this.cancelSubscription(args.subscription_id as string, args.reason as string);

          case 'paypal_refund_capture':
            return await this.refundCapture(args);

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

  private async createOrder(data: CreateOrderData) {
    const accessToken = await this.getAccessToken();

    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: data.currency || 'USD',
            value: data.amount,
          },
          description: data.description || 'Pagamento Studio VIP',
        },
      ],
      application_context: {
        return_url: data.return_url || `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success`,
        cancel_url: data.cancel_url || `${process.env.NEXT_PUBLIC_BASE_URL}/payment/cancel`,
        brand_name: 'Studio VIP',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
      },
    };

    const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro ao criar ordem: ${JSON.stringify(error)}`);
    }

    const order = await response.json();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            order_id: order.id,
            status: order.status,
            approval_url: order.links?.find((link: any) => link.rel === 'approve')?.href,
            created_at: order.create_time,
          }, null, 2),
        },
      ],
    };
  }

  private async captureOrder(data: CaptureOrderData) {
    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `${this.baseUrl}/v2/checkout/orders/${data.order_id}/capture`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro ao capturar ordem: ${JSON.stringify(error)}`);
    }

    const capture = await response.json();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            order_id: capture.id,
            status: capture.status,
            capture_id: capture.purchase_units?.[0]?.payments?.captures?.[0]?.id,
            amount: capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount,
            payer: capture.payer,
          }, null, 2),
        },
      ],
    };
  }

  private async getOrder(orderId: string) {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro ao buscar ordem: ${JSON.stringify(error)}`);
    }

    const order = await response.json();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(order, null, 2),
        },
      ],
    };
  }

  private async listPayments(params: any) {
    const accessToken = await this.getAccessToken();

    const startDate = params.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = params.end_date || new Date().toISOString();
    const pageSize = params.page_size || 10;

    const queryParams = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      page_size: pageSize.toString(),
    });

    const response = await fetch(
      `${this.baseUrl}/v1/reporting/transactions?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro ao listar pagamentos: ${JSON.stringify(error)}`);
    }

    const transactions = await response.json();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(transactions, null, 2),
        },
      ],
    };
  }

  private async createSubscription(data: CreateSubscriptionData) {
    const accessToken = await this.getAccessToken();

    const subscriptionData = {
      plan_id: data.plan_id,
      subscriber: {
        email_address: data.subscriber_email,
        name: data.subscriber_name ? {
          given_name: data.subscriber_name.split(' ')[0],
          surname: data.subscriber_name.split(' ').slice(1).join(' ') || data.subscriber_name,
        } : undefined,
      },
      application_context: {
        brand_name: 'Studio VIP',
        user_action: 'SUBSCRIBE_NOW',
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscription/success`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscription/cancel`,
      },
    };

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(subscriptionData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro ao criar assinatura: ${JSON.stringify(error)}`);
    }

    const subscription = await response.json();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            subscription_id: subscription.id,
            status: subscription.status,
            approval_url: subscription.links?.find((link: any) => link.rel === 'approve')?.href,
          }, null, 2),
        },
      ],
    };
  }

  private async getSubscription(subscriptionId: string) {
    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro ao buscar assinatura: ${JSON.stringify(error)}`);
    }

    const subscription = await response.json();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(subscription, null, 2),
        },
      ],
    };
  }

  private async cancelSubscription(subscriptionId: string, reason?: string) {
    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          reason: reason || 'Cancelado pelo usuário',
        }),
      }
    );

    if (!response.ok && response.status !== 204) {
      const error = await response.json();
      throw new Error(`Erro ao cancelar assinatura: ${JSON.stringify(error)}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            subscription_id: subscriptionId,
            message: 'Assinatura cancelada com sucesso',
          }, null, 2),
        },
      ],
    };
  }

  private async refundCapture(params: any) {
    const accessToken = await this.getAccessToken();

    const refundData: any = {};
    
    if (params.amount && params.currency) {
      refundData.amount = {
        value: params.amount,
        currency_code: params.currency,
      };
    }

    if (params.note) {
      refundData.note_to_payer = params.note;
    }

    const response = await fetch(
      `${this.baseUrl}/v2/payments/captures/${params.capture_id}/refund`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(refundData),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro ao reembolsar: ${JSON.stringify(error)}`);
    }

    const refund = await response.json();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            refund_id: refund.id,
            status: refund.status,
            amount: refund.amount,
          }, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🚀 PayPal MCP Server rodando...');
  }
}

// Inicializar servidor
const server = new PayPalMCPServer();
server.run().catch(console.error);
