#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import * as dotenv from 'dotenv';

dotenv.config();

// Validar token de acesso
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
if (!MERCADOPAGO_ACCESS_TOKEN) {
  console.error('❌ MERCADOPAGO_ACCESS_TOKEN não configurado');
  process.exit(1);
}

// Inicializar cliente Mercado Pago
const client = new MercadoPagoConfig({ 
  accessToken: MERCADOPAGO_ACCESS_TOKEN,
  options: {
    timeout: 30000
  }
});

const paymentClient = new Payment(client);
const preferenceClient = new Preference(client);

// Definição das ferramentas disponíveis
const TOOLS: Tool[] = [
  {
    name: 'mercadopago_create_pix_payment',
    description: 'Cria um novo pagamento PIX no Mercado Pago. Retorna QR Code, código copia e cola, e ID do pagamento para rastreamento. Expira em 30 minutos.',
    inputSchema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Valor do pagamento em reais (BRL). Ex: 99.90',
          minimum: 0.01
        },
        email: {
          type: 'string',
          description: 'Email do pagador',
          format: 'email'
        },
        name: {
          type: 'string',
          description: 'Nome completo do pagador'
        },
        cpf: {
          type: 'string',
          description: 'CPF do pagador (apenas números ou com formatação)',
          pattern: '^[0-9]{11}$|^[0-9]{3}\\.[0-9]{3}\\.[0-9]{3}-[0-9]{2}$'
        },
        description: {
          type: 'string',
          description: 'Descrição do pagamento (opcional)',
          default: 'Pagamento via PIX'
        }
      },
      required: ['amount', 'email', 'name', 'cpf']
    }
  },
  {
    name: 'mercadopago_get_payment',
    description: 'Busca detalhes completos de um pagamento pelo ID. Retorna status, valor, dados do pagador e informações da transação.',
    inputSchema: {
      type: 'object',
      properties: {
        paymentId: {
          type: 'string',
          description: 'ID do pagamento no Mercado Pago'
        }
      },
      required: ['paymentId']
    }
  },
  {
    name: 'mercadopago_check_payment_status',
    description: 'Verifica apenas o status de um pagamento (approved, pending, rejected, cancelled). Útil para polling rápido.',
    inputSchema: {
      type: 'object',
      properties: {
        paymentId: {
          type: 'string',
          description: 'ID do pagamento no Mercado Pago'
        }
      },
      required: ['paymentId']
    }
  },
  {
    name: 'mercadopago_list_recent_payments',
    description: 'Lista pagamentos recentes com filtros opcionais. Retorna até 50 pagamentos mais recentes com possibilidade de filtrar por status e método.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Número máximo de pagamentos a retornar (1-50)',
          minimum: 1,
          maximum: 50,
          default: 10
        },
        status: {
          type: 'string',
          description: 'Filtrar por status do pagamento',
          enum: ['approved', 'pending', 'rejected', 'cancelled', 'refunded']
        },
        paymentMethodId: {
          type: 'string',
          description: 'Filtrar por método de pagamento (ex: pix, credit_card, debit_card)',
          enum: ['pix', 'credit_card', 'debit_card', 'bolbradesco']
        }
      }
    }
  },
  {
    name: 'mercadopago_create_preference',
    description: 'Cria uma preferência de pagamento para checkout do Mercado Pago. Retorna preference_id para usar no Checkout Pro ou link de pagamento direto.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Título/nome do produto ou serviço'
        },
        quantity: {
          type: 'number',
          description: 'Quantidade de itens',
          minimum: 1,
          default: 1
        },
        unitPrice: {
          type: 'number',
          description: 'Preço unitário em BRL',
          minimum: 0.01
        },
        payerEmail: {
          type: 'string',
          description: 'Email do pagador (opcional)',
          format: 'email'
        },
        payerName: {
          type: 'string',
          description: 'Nome do pagador (opcional)'
        },
        externalReference: {
          type: 'string',
          description: 'Referência externa para identificar o pagamento no seu sistema'
        }
      },
      required: ['title', 'unitPrice']
    }
  },
  {
    name: 'mercadopago_refund_payment',
    description: 'Solicita o reembolso total ou parcial de um pagamento aprovado. O dinheiro é devolvido ao pagador.',
    inputSchema: {
      type: 'object',
      properties: {
        paymentId: {
          type: 'string',
          description: 'ID do pagamento a ser reembolsado'
        },
        amount: {
          type: 'number',
          description: 'Valor a reembolsar (opcional, padrão é reembolso total)',
          minimum: 0.01
        }
      },
      required: ['paymentId']
    }
  }
];

// Criar servidor MCP
const server = new Server(
  {
    name: 'mcp-mercadopago',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handler para listar ferramentas
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handler para executar ferramentas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'mercadopago_create_pix_payment': {
        const { amount, email, name: payerName, cpf, description } = args as any;
        
        // Limpar CPF
        const cleanCpf = cpf.replace(/\D/g, '');
        
        // Separar nome em primeiro e último nome
        const nameParts = payerName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || firstName;

        const paymentData = {
          transaction_amount: amount,
          description: description || 'Pagamento via PIX',
          payment_method_id: 'pix',
          payer: {
            email: email,
            first_name: firstName,
            last_name: lastName,
            identification: {
              type: 'CPF',
              number: cleanCpf
            }
          }
        };

        const response = await paymentClient.create({ body: paymentData });
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
                payment: {
                  id: response.id,
                  status: response.status,
                  amount: response.transaction_amount,
                  currency: 'BRL',
                  description: response.description,
                  pix: {
                    qrCode: pixData.qr_code,
                    qrCodeBase64: pixData.qr_code_base64,
                    copiaECola: pixData.qr_code,
                    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
                  },
                  payer: {
                    email: response.payer?.email,
                    firstName: response.payer?.first_name,
                    lastName: response.payer?.last_name,
                    cpf: cleanCpf
                  },
                  createdAt: response.date_created
                }
              }, null, 2)
            }
          ]
        };
      }

      case 'mercadopago_get_payment': {
        const { paymentId } = args as any;
        const payment = await paymentClient.get({ id: paymentId });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                payment: {
                  id: payment.id,
                  status: payment.status,
                  statusDetail: payment.status_detail,
                  amount: payment.transaction_amount,
                  currency: payment.currency_id,
                  description: payment.description,
                  paymentMethodId: payment.payment_method_id,
                  payer: {
                    email: payment.payer?.email,
                    firstName: payment.payer?.first_name,
                    lastName: payment.payer?.last_name,
                    identification: payment.payer?.identification
                  },
                  dateCreated: payment.date_created,
                  dateApproved: payment.date_approved,
                  dateLastUpdated: payment.date_last_updated
                }
              }, null, 2)
            }
          ]
        };
      }

      case 'mercadopago_check_payment_status': {
        const { paymentId } = args as any;
        const payment = await paymentClient.get({ id: paymentId });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                paymentId: payment.id,
                status: payment.status,
                statusDetail: payment.status_detail,
                approved: payment.status === 'approved',
                pending: payment.status === 'pending',
                rejected: payment.status === 'rejected'
              }, null, 2)
            }
          ]
        };
      }

      case 'mercadopago_list_recent_payments': {
        const { limit = 10, status, paymentMethodId } = args as any;
        
        const filters: any = {};
        if (status) filters.status = status;
        if (paymentMethodId) filters.payment_method_id = paymentMethodId;

        const response: any = await paymentClient.search({
          filters,
          limit: Math.min(limit, 50)
        });

        const payments = (response.results || []).map((p: any) => ({
          id: p.id,
          status: p.status,
          amount: p.transaction_amount,
          currency: p.currency_id,
          paymentMethodId: p.payment_method_id,
          description: p.description,
          payer: {
            email: p.payer?.email,
            firstName: p.payer?.first_name,
            lastName: p.payer?.last_name
          },
          dateCreated: p.date_created,
          dateApproved: p.date_approved
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                total: payments.length,
                payments
              }, null, 2)
            }
          ]
        };
      }

      case 'mercadopago_create_preference': {
        const { title, quantity = 1, unitPrice, payerEmail, payerName, externalReference } = args as any;

        const preferenceData: any = {
          items: [
            {
              title,
              quantity,
              unit_price: unitPrice,
              currency_id: 'BRL'
            }
          ],
          back_urls: {
            success: process.env.MERCADOPAGO_SUCCESS_URL || 'https://your-site.com/success',
            failure: process.env.MERCADOPAGO_FAILURE_URL || 'https://your-site.com/failure',
            pending: process.env.MERCADOPAGO_PENDING_URL || 'https://your-site.com/pending'
          },
          auto_return: 'approved'
        };

        if (payerEmail || payerName) {
          preferenceData.payer = {};
          if (payerEmail) preferenceData.payer.email = payerEmail;
          if (payerName) preferenceData.payer.name = payerName;
        }

        if (externalReference) {
          preferenceData.external_reference = externalReference;
        }

        const preference = await preferenceClient.create({ body: preferenceData });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                preference: {
                  id: preference.id,
                  initPoint: preference.init_point,
                  sandboxInitPoint: preference.sandbox_init_point,
                  checkoutUrl: preference.init_point,
                  externalReference: preference.external_reference,
                  dateCreated: preference.date_created
                }
              }, null, 2)
            }
          ]
        };
      }

      case 'mercadopago_refund_payment': {
        const { paymentId, amount } = args as any;

        // Buscar informações do pagamento primeiro
        const payment = await paymentClient.get({ id: paymentId });

        if (payment.status !== 'approved') {
          throw new Error(`Pagamento não pode ser reembolsado. Status atual: ${payment.status}`);
        }

        // Criar reembolso
        const refundData: any = {};
        if (amount) {
          refundData.amount = amount;
        }

        const refund = await paymentClient.refund({
          id: paymentId,
          body: refundData
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                refund: {
                  id: refund.id,
                  paymentId: refund.payment_id,
                  amount: refund.amount,
                  status: refund.status,
                  dateCreated: refund.date_created
                }
              }, null, 2)
            }
          ]
        };
      }

      default:
        throw new Error(`Ferramenta desconhecida: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message || 'Erro desconhecido',
            details: error.cause || error.stack
          }, null, 2)
        }
      ],
      isError: true
    };
  }
});

// Iniciar servidor
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🟢 Servidor MCP Mercado Pago iniciado');
}

main().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
