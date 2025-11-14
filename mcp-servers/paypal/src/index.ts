#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import checkoutNodeJssdk from '@paypal/checkout-server-sdk';
import * as dotenv from 'dotenv';

dotenv.config();

// Validar credenciais PayPal
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox'; // sandbox ou live

if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
  console.error('❌ ASakpMuUjho6wHL5oxXVjwXl8d2RPXE3HT3DpW-inJaRtMnW5ns1qux3oC1qtlOsBGBIa1E9Wvdukyvl e PAYPAL_CLIENT_SECRET não configurados');
  process.exit(1);
}

// Configurar ambiente PayPal
function environment() {
  const clientId = PAYPAL_CLIENT_ID!;
  const clientSecret = PAYPAL_CLIENT_SECRET!;

  if (PAYPAL_MODE === 'live') {
    return new checkoutNodeJssdk.core.LiveEnvironment(clientId, clientSecret);
  }
  return new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);
}

const client = new checkoutNodeJssdk.core.PayPalHttpClient(environment());

// Definição das ferramentas disponíveis
const TOOLS: Tool[] = [
  {
    name: 'paypal_create_order',
    description: 'Cria uma nova order (pedido) no PayPal para captura de pagamento. Retorna order_id para aprovar e capturar o pagamento.',
    inputSchema: {
      type: 'object',
      properties: {
        amount: {
          type: 'string',
          description: 'Valor total do pedido (ex: "99.99")'
        },
        currency: {
          type: 'string',
          description: 'Código da moeda (USD, BRL, EUR, etc)',
          default: 'USD'
        },
        description: {
          type: 'string',
          description: 'Descrição do item/pedido',
          default: 'Pedido'
        },
        referenceId: {
          type: 'string',
          description: 'ID de referência do seu sistema (opcional)'
        }
      },
      required: ['amount']
    }
  },
  {
    name: 'paypal_capture_order',
    description: 'Captura (finaliza) um pagamento aprovado. Deve ser chamado após o cliente aprovar a order.',
    inputSchema: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'ID da order aprovada pelo cliente'
        }
      },
      required: ['orderId']
    }
  },
  {
    name: 'paypal_get_order',
    description: 'Busca detalhes completos de uma order pelo ID, incluindo status, valores e informações do pagador.',
    inputSchema: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'ID da order no PayPal'
        }
      },
      required: ['orderId']
    }
  },
  {
    name: 'paypal_refund_capture',
    description: 'Cria um reembolso total ou parcial para uma captura realizada.',
    inputSchema: {
      type: 'object',
      properties: {
        captureId: {
          type: 'string',
          description: 'ID da captura a ser reembolsada'
        },
        amount: {
          type: 'string',
          description: 'Valor a reembolsar (opcional, padrão é reembolso total)'
        },
        currency: {
          type: 'string',
          description: 'Moeda do reembolso',
          default: 'USD'
        },
        note: {
          type: 'string',
          description: 'Nota/motivo do reembolso (opcional)'
        }
      },
      required: ['captureId']
    }
  },
  {
    name: 'paypal_list_transactions',
    description: 'Lista transações recentes da conta PayPal com filtros de data.',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Data inicial no formato YYYY-MM-DD',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$'
        },
        endDate: {
          type: 'string',
          description: 'Data final no formato YYYY-MM-DD',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$'
        },
        pageSize: {
          type: 'number',
          description: 'Quantidade de resultados por página (max 500)',
          minimum: 1,
          maximum: 500,
          default: 100
        }
      },
      required: ['startDate', 'endDate']
    }
  },
  {
    name: 'paypal_verify_webhook',
    description: 'Verifica a autenticidade de um webhook recebido do PayPal.',
    inputSchema: {
      type: 'object',
      properties: {
        webhookId: {
          type: 'string',
          description: 'ID do webhook configurado no PayPal'
        },
        webhookEvent: {
          type: 'object',
          description: 'Objeto do evento webhook completo'
        },
        headers: {
          type: 'object',
          description: 'Headers da requisição webhook'
        }
      },
      required: ['webhookId', 'webhookEvent', 'headers']
    }
  }
];

// Criar servidor MCP
const server = new Server(
  {
    name: 'mcp-paypal',
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
      case 'paypal_create_order': {
        const { amount, currency = 'USD', description = 'Pedido', referenceId } = args as any;

        const requestBody: any = {
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: currency,
                value: amount
              },
              description: description
            }
          ]
        };

        if (referenceId) {
          requestBody.purchase_units[0].reference_id = referenceId;
        }

        const orderRequest = new checkoutNodeJssdk.orders.OrdersCreateRequest();
        orderRequest.prefer('return=representation');
        orderRequest.requestBody(requestBody);

        const order = await client.execute(orderRequest);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                order: {
                  id: order.result.id,
                  status: order.result.status,
                  amount: amount,
                  currency: currency,
                  links: order.result.links,
                  approveUrl: order.result.links?.find((link: any) => link.rel === 'approve')?.href,
                  createTime: order.result.create_time
                }
              }, null, 2)
            }
          ]
        };
      }

      case 'paypal_capture_order': {
        const { orderId } = args as any;

        const captureRequest = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderId);
        captureRequest.requestBody({});

        const capture = await client.execute(captureRequest);
        const captureData = capture.result.purchase_units?.[0]?.payments?.captures?.[0];

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                capture: {
                  orderId: capture.result.id,
                  status: capture.result.status,
                  captureId: captureData?.id,
                  amount: captureData?.amount?.value,
                  currency: captureData?.amount?.currency_code,
                  payer: {
                    email: capture.result.payer?.email_address,
                    name: capture.result.payer?.name?.given_name + ' ' + capture.result.payer?.name?.surname,
                    payerId: capture.result.payer?.payer_id
                  },
                  createTime: captureData?.create_time,
                  updateTime: captureData?.update_time
                }
              }, null, 2)
            }
          ]
        };
      }

      case 'paypal_get_order': {
        const { orderId } = args as any;

        const getRequest = new checkoutNodeJssdk.orders.OrdersGetRequest(orderId);
        const order = await client.execute(getRequest);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                order: {
                  id: order.result.id,
                  status: order.result.status,
                  intent: order.result.intent,
                  purchaseUnits: order.result.purchase_units,
                  payer: order.result.payer,
                  createTime: order.result.create_time,
                  updateTime: order.result.update_time,
                  links: order.result.links
                }
              }, null, 2)
            }
          ]
        };
      }

      case 'paypal_refund_capture': {
        const { captureId, amount, currency = 'USD', note } = args as any;

        const refundRequest: any = {
          amount: amount ? { value: amount, currency_code: currency } : undefined,
          note_to_payer: note
        };

        // Criar requisição de reembolso usando fetch direto (SDK não tem RefundCaptureRequest)
        const accessToken = await getAccessToken();
        const response = await fetch(`https://api${PAYPAL_MODE === 'sandbox' ? '-m.sandbox' : ''}.paypal.com/v2/payments/captures/${captureId}/refund`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(refundRequest)
        });

        const refund = await response.json();

        if (!response.ok) {
          throw new Error(refund.message || 'Erro ao criar reembolso');
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                refund: {
                  id: refund.id,
                  status: refund.status,
                  amount: refund.amount?.value,
                  currency: refund.amount?.currency_code,
                  captureId: captureId,
                  createTime: refund.create_time,
                  updateTime: refund.update_time
                }
              }, null, 2)
            }
          ]
        };
      }

      case 'paypal_list_transactions': {
        const { startDate, endDate, pageSize = 100 } = args as any;

        const accessToken = await getAccessToken();
        const response = await fetch(
          `https://api${PAYPAL_MODE === 'sandbox' ? '-m.sandbox' : ''}.paypal.com/v1/reporting/transactions?start_date=${startDate}T00:00:00Z&end_date=${endDate}T23:59:59Z&page_size=${pageSize}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Erro ao listar transações');
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                transactions: data.transaction_details || [],
                totalItems: data.total_items,
                totalPages: data.total_pages
              }, null, 2)
            }
          ]
        };
      }

      case 'paypal_verify_webhook': {
        const { webhookId, webhookEvent, headers } = args as any;

        const verifyRequest = {
          auth_algo: headers['paypal-auth-algo'],
          cert_url: headers['paypal-cert-url'],
          transmission_id: headers['paypal-transmission-id'],
          transmission_sig: headers['paypal-transmission-sig'],
          transmission_time: headers['paypal-transmission-time'],
          webhook_id: webhookId,
          webhook_event: webhookEvent
        };

        const accessToken = await getAccessToken();
        const response = await fetch(
          `https://api${PAYPAL_MODE === 'sandbox' ? '-m.sandbox' : ''}.paypal.com/v1/notifications/verify-webhook-signature`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(verifyRequest)
          }
        );

        const verification = await response.json();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                verified: verification.verification_status === 'SUCCESS',
                verificationStatus: verification.verification_status
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
            details: error.details || error.stack
          }, null, 2)
        }
      ],
      isError: true
    };
  }
});

// Função auxiliar para obter access token
async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch(
    `https://api${PAYPAL_MODE === 'sandbox' ? '-m.sandbox' : ''}.paypal.com/v1/oauth2/token`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    }
  );

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error_description || 'Erro ao obter token');
  }

  return data.access_token;
}

// Iniciar servidor
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`🟢 Servidor MCP PayPal iniciado (${PAYPAL_MODE.toUpperCase()})`);
}

main().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
