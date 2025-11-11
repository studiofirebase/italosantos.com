
import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

// Helper function to get the absolute path to the certs directory
function getCertsPath() {
  // Navigate up from the current file's directory (__dirname) to the project root
  // __dirname in this context will be something like: .next/server/app/api/payments/apple-pay/validate-merchant
  // We need to go up several levels to reach the project root.
  // This approach is more reliable than process.cwd() in some serverless environments.
  return path.join(process.cwd(), 'certs');
}

// Validar merchant com Apple Pay
export async function POST(request: NextRequest) {
  try {
    const { validationURL, merchantId } = await request.json();

    if (!validationURL || !merchantId) {
      return NextResponse.json({
        error: 'ValidationURL e merchantId são obrigatórios'
      }, { status: 400 });
    }

    console.log('🔐 Validando merchant Apple Pay:', { validationURL, merchantId });

    // Configurações do merchant
    const merchantIdentifier = process.env.APPLE_PAY_MERCHANT_ID || merchantId;
    const domainName = process.env.APPLE_PAY_DOMAIN_NAME || 'italosantos.com';
    const displayName = process.env.APPLE_PAY_DISPLAY_NAME || 'Italo Santos';

    // Caminho para os certificados
    const certsPath = getCertsPath();
    const certPath = path.join(certsPath, 'apple-pay-cert.pem');
    const keyPath = path.join(certsPath, 'apple-pay-key.pem');

    // Verificar se os arquivos de certificado existem
    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      console.error('❌ Arquivos de certificado Apple Pay não encontrados no diretório /certs');
      console.error('Cert path checked:', certPath);
      console.error('Key path checked:', keyPath);
      return NextResponse.json({
        error: 'Arquivos de certificado Apple Pay não configurados no servidor.'
      }, { status: 500 });
    }
    
    // Ler os certificados do sistema de arquivos
    const merchantCertificate = fs.readFileSync(certPath);
    const merchantKey = fs.readFileSync(keyPath);

    // Preparar dados para validação
    const validationData = {
      merchantIdentifier,
      domainName,
      displayName
    };

    // Fazer requisição para Apple Pay
    const merchantSession = await validateWithApple(validationURL, validationData, {
      cert: merchantCertificate,
      key: merchantKey
    });

    console.log('✅ Merchant validado com sucesso');

    return NextResponse.json(merchantSession);

  } catch (error: any) {
    console.error('❌ Erro na validação do merchant:', error);
    
    return NextResponse.json({
      error: 'Falha na validação do merchant',
      details: error.message
    }, { status: 500 });
  }
}

// Função para validar com Apple Pay servers
async function validateWithApple(
  validationURL: string, 
  data: any, 
  certificates: { cert: Buffer; key: Buffer }
): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const url = new URL(validationURL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      cert: certificates.cert,
      key: certificates.key,
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const merchantSession = JSON.parse(responseData);
            resolve(merchantSession);
          } else {
            console.error('Apple Pay server response:', responseData);
            reject(new Error(`Apple Pay validation failed with status: ${res.statusCode}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse Apple Pay response: ${error}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request to Apple Pay failed: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request to Apple Pay timed out'));
    });

    req.write(postData);
    req.end();
  });
}
