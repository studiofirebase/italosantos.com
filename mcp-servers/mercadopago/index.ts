#!/usr/bin/env node
/**
 * MCP Server para Mercado Pago
 * Expõe ferramentas para integração completa com pagamentos via Mercado Pago
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '../../.env.local' });

interface PixPaymentData {
  amount: number;
  email: string;
  name: string;
  cpf: string;
  description?: string;
}

interface PaymentStatus {
  id: string;
  status: string;
  transaction_amount: number;
  payment_method_id: string;
  date_created: string;
  date_approved?: string;
}

class MercadoPagoMCPServer {
  private server: Server;
  private accessToken: string;

  constructor() {
    this.accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
    
    if (!this.accessToken) {
      console.error('⚠️  MERCADOPAGO_ACCESS_TOKEN não configurado');
    }

    this.server = new Server(
      {
        name: 'mercadopago-mcp-server',
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

  private getPaymentClient(): Payment {
    if (!this.accessToken) {
      throw new Error('Token do Mercado Pago não configurado. Defina MERCADOPAGO_ACCESS_TOKEN no .env.local');
    }
    const client = new MercadoPagoConfig({ accessToken: this.accessToken });
    return new Payment(client);
  }

  private setupHandlers() {
    // Listar ferramentas disponíveis
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'mercadopago_create_pix_payment',
          description: 'Cria um novo pagamento PIX no Mercado Pago e retorna o QR Code',
          inputSchema: {
            type: 'object',
            properties: {
              amount: {
                type: 'number',
                description: 'Valor do pagamento em reais (ex: 99.00)',
                minimum: 0.01,
              },
              email: {
                type: 'string',
                description: 'Email do pagador',
                format: 'email',
              },
              name: {
                type: 'string',
                description: 'Nome completo do pagador',
              },
              cpf: {
                type: 'string',
                description: 'CPF do pagador (apenas números ou formatado)',
                pattern: '^[0-9]{11}$|^[0-9]{3}\\.[0-9]{3}\\.[0-9]{3}-[0-9]{2}$',
              },
              description: {
                type: 'string',
                description: 'Descrição do pagamento (opcional)',
              },
            },
            required: ['amount', 'email', 'name', 'cpf'],
          },
        },
        {
          name: 'mercadopago_get_payment',
          description: 'Busca informações detalhadas de um pagamento específico',
          inputSchema: {
            type: 'object',
            properties: {
              payment_id: {
                type: 'string',
                description: 'ID do pagamento no Mercado Pago',
              },
            },
            required: ['payment_id'],
          },
        },
        {
          name: 'mercadopago_check_payment_status',
          description: 'Verifica se um pagamento foi aprovado',
          inputSchema: {
            type: 'object',
            properties: {
              payment_id: {
                type: 'string',
                description: 'ID do pagamento no Mercado Pago',
              },
            },
            required: ['payment_id'],
          },
        },
        {
          name: 'mercadopago_list_recent_payments',
          description: 'Lista os pagamentos PIX recentes aprovados',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Quantidade máxima de pagamentos a retornar (padrão: 10)',
                minimum: 1,
                maximum: 100,
              },
            },
          },
        },
        {
          name: 'mercadopago_list_all_payments',
          description: 'Lista todos os pagamentos recentes independente do status',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Quantidade máxima de pagamentos a retornar (padrão: 20)',
                minimum: 1,
                maximum: 100,
              },
            },
          },
        },
        {
          name: 'mercadopago_refund_payment',
          description: 'Realiza o reembolso total de um pagamento',
          inputSchema: {
            type: 'object',
            properties: {
              payment_id: {
                type: 'string',
                description: 'ID do pagamento a ser reembolsado',
              },
            },
            required: ['payment_id'],
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
          case 'mercadopago_create_pix_payment':
            return await this.createPixPayment(args as PixPaymentData);

          case 'mercadopago_get_payment':
            return await this.getPayment(args.payment_id as string);

          case 'mercadopago_check_payment_status':
            return await this.checkPaymentStatus(args.payment_id as string);

          case 'mercadopago_list_recent_payments':
            return await this.listRecentPayments(args.limit as number);

          case 'mercadopago_list_all_payments':
            return await this.listAllPayments(args.limit as number);

          case 'mercadopago_refund_payment':
            return await this.refundPayment(args.payment_id as string);

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

  private async createPixPayment(data: PixPaymentData) {
    const payment = this.getPaymentClient();

    const paymentData: any = {
      transaction_amount: data.amount,
      description: data.description || 'Assinatura VIP Studio',
      payment_method_id: 'pix',
      payer: {
        email: data.email,
        first_name: data.name.split(' ')[0] || data.name,
        last_name: data.name.split(' ').slice(1).join(' ') || '',
        identification: {
          type: 'CPF',
          number: data.cpf.replace(/\D/g, ''),
        },
      },
    };

    const response = await payment.create({ body: paymentData });
    const pixData = response.point_of_interaction?.transaction_data;

    if (!pixData?.qr_code) {
      throw new Error('QR Code não encontrado na resposta');
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            payment_id: response.id,
            status: response.status,
            amount: response.transaction_amount,
            qr_code: pixData.qr_code,
            qr_code_base64: pixData.qr_code_base64,
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            description: response.description,
          }, null, 2),
        },
      ],
    };
  }

  private async getPayment(paymentId: string) {
    const payment = this.getPaymentClient();
    const response = await payment.get({ id: paymentId });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            id: response.id,
            status: response.status,
            status_detail: response.status_detail,
            transaction_amount: response.transaction_amount,
            payment_method_id: response.payment_method_id,
            date_created: response.date_created,
            date_approved: response.date_approved,
            date_last_updated: response.date_last_updated,
            payer: {
              email: response.payer?.email,
              identification: response.payer?.identification,
            },
            description: response.description,
          }, null, 2),
        },
      ],
    };
  }

  private async checkPaymentStatus(paymentId: string) {
    const payment = this.getPaymentClient();
    const response = await payment.get({ id: paymentId });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            payment_id: paymentId,
            status: response.status,
            is_approved: response.status === 'approved',
            status_detail: response.status_detail,
            amount: response.transaction_amount,
          }, null, 2),
        },
      ],
    };
  }

  private async listRecentPayments(limit: number = 10) {
    const payment = this.getPaymentClient();
    const response: any = await payment.search({
      filters: {
        status: 'approved',
        payment_method_id: 'pix',
      },
      limit,
    } as any);

    const payments = (response.results || []).map((p: any) => ({
      id: p.id,
      status: p.status,
      amount: p.transaction_amount,
      payer_email: p.payer?.email,
      date_created: p.date_created,
      date_approved: p.date_approved,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            total: payments.length,
            payments,
          }, null, 2),
        },
      ],
    };
  }

  private async listAllPayments(limit: number = 20) {
    const payment = this.getPaymentClient();
    const response: any = await payment.search({
      filters: {},
      limit,
    } as any);

    const payments = (response.results || []).map((p: any) => ({
      id: p.id,
      status: p.status,
      amount: p.transaction_amount,
      payment_method: p.payment_method_id,
      payer_email: p.payer?.email,
      date_created: p.date_created,
      date_approved: p.date_approved,
      description: p.description,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            total: payments.length,
            payments,
          }, null, 2),
        },
      ],
    };
  }

  private async refundPayment(paymentId: string) {
    const payment = this.getPaymentClient();
    
    // Mercado Pago SDK não tem método direto de refund no Payment
    // Precisamos usar a API REST diretamente
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}/refunds`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro ao reembolsar: ${JSON.stringify(error)}`);
    }

    const refundData = await response.json();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            refund_id: refundData.id,
            payment_id: paymentId,
            amount: refundData.amount,
            status: refundData.status,
            date_created: refundData.date_created,
          }, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🚀 Mercado Pago MCP Server rodando...');
  }
}

// Inicializar servidor
const server = new MercadoPagoMCPServer();
server.run().catch(console.error);
