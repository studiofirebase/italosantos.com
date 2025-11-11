#!/usr/bin/env node

/**
 * Script de Teste - Recuperação de Senha Firebase
 * Envia email de recuperação para: italo16rj@gmail.com
 * 
 * Como usar:
 * 1. Certifique-se de ter Node.js instalado
 * 2. Instale as dependências: npm install firebase
 * 3. Execute: node test-send-password-reset.js
 */

// Importar Firebase SDK
const { initializeApp } = require('firebase/app');
const { getAuth, sendPasswordResetEmail } = require('firebase/auth');

// Configuração do Firebase (projeto facepass-afhid)
const firebaseConfig = {
  apiKey: "AIzaSyAgQVYgZ62v1RIKmcxHQcYjNVcj2Bv0hh8",
  authDomain: "facepass-afhid.firebaseapp.com",
  databaseURL: "https://facepass-afhid-default-rtdb.firebaseio.com",
  projectId: "facepass-afhid",
  storageBucket: "facepass-afhid.firebasestorage.app",
  messagingSenderId: "423019559653",
  appId: "1:423019559653:web:dc278b16cac06e0dfaf20c",
  measurementId: "G-VBFV45J460"
};

// Email de teste
const TEST_EMAIL = 'italo16rj@gmail.com';

// Cores para output no terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader() {
  console.log('\n' + '='.repeat(70));
  log('🔐 TESTE DE RECUPERAÇÃO DE SENHA - FIREBASE', 'bright');
  console.log('='.repeat(70));
  log(`📧 Email de Teste: ${TEST_EMAIL}`, 'cyan');
  log(`🔥 Projeto Firebase: ${firebaseConfig.projectId}`, 'cyan');
  console.log('='.repeat(70) + '\n');
}

function printStep(step, message) {
  log(`\n[${step}] ${message}`, 'blue');
}

function printSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function printError(message) {
  log(`❌ ${message}`, 'red');
}

function printWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function printInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

async function testPasswordReset() {
  try {
    printHeader();

    // Passo 1: Inicializar Firebase
    printStep('1', 'Inicializando Firebase...');
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    printSuccess('Firebase inicializado com sucesso');

    // Passo 2: Validar email
    printStep('2', 'Validando formato do email...');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(TEST_EMAIL)) {
      throw new Error('Email inválido');
    }
    printSuccess(`Email válido: ${TEST_EMAIL}`);

    // Passo 3: Enviar email de recuperação
    printStep('3', 'Enviando email de recuperação de senha...');
    printInfo('Aguarde... Isso pode levar alguns segundos.');

    await sendPasswordResetEmail(auth, TEST_EMAIL);

    printSuccess('Email de recuperação enviado com sucesso!');

    // Passo 4: Instruções
    printStep('4', 'Próximos passos:');
    console.log('');
    printInfo('1. Acesse a caixa de entrada do Gmail: https://mail.google.com/');
    printInfo('   Login: italo16rj@gmail.com');
    printInfo('');
    printInfo('2. Procure por email do Firebase (geralmente chega em 10-60 segundos)');
    printInfo('   Assunto: "Reset your password" ou similar');
    printInfo('   ⚠️  VERIFIQUE TAMBÉM A PASTA SPAM/LIXO ELETRÔNICO');
    printInfo('');
    printInfo('3. Clique no link no email para redefinir sua senha');
    printInfo('');
    printInfo('4. Na página do Firebase, defina uma nova senha');
    printInfo('');
    printInfo('5. Após redefinir, faça login no admin com a nova senha');
    printInfo('   URL: http://localhost:3000/admin');

    // Resumo
    console.log('\n' + '='.repeat(70));
    log('📊 RESUMO DO TESTE', 'bright');
    console.log('='.repeat(70));
    console.log(`Status:        ${colors.green}✅ SUCESSO${colors.reset}`);
    console.log(`Email enviado: ${TEST_EMAIL}`);
    console.log(`Projeto:       ${firebaseConfig.projectId}`);
    console.log(`Data/Hora:     ${new Date().toLocaleString('pt-BR')}`);
    console.log('='.repeat(70) + '\n');

    printSuccess('Teste concluído com sucesso!');
    printWarning('Aguarde o email chegar e siga as instruções acima.');

  } catch (error) {
    console.log('\n' + '='.repeat(70));
    printError('ERRO AO ENVIAR EMAIL');
    console.log('='.repeat(70));

    console.log(`\nCódigo do erro: ${colors.red}${error.code}${colors.reset}`);
    console.log(`Mensagem: ${error.message}\n`);

    // Mensagens de erro específicas
    switch (error.code) {
      case 'auth/user-not-found':
        printError('Usuário não encontrado no Firebase Authentication');
        console.log('\n📝 Solução:');
        printInfo('1. Acesse: https://console.firebase.google.com/');
        printInfo(`2. Selecione o projeto: ${firebaseConfig.projectId}`);
        printInfo('3. Vá em Authentication > Users');
        printInfo('4. Clique em "Add user"');
        printInfo(`5. Adicione o email: ${TEST_EMAIL}`);
        printInfo('6. Execute este script novamente');
        break;

      case 'auth/invalid-email':
        printError('Formato de email inválido');
        printInfo(`Verifique se o email está correto: ${TEST_EMAIL}`);
        break;

      case 'auth/too-many-requests':
        printError('Muitas tentativas de envio de email');
        printInfo('Aguarde alguns minutos antes de tentar novamente');
        break;

      case 'auth/network-request-failed':
        printError('Erro de conexão com Firebase');
        printInfo('Verifique sua conexão com a internet');
        break;

      case 'auth/invalid-api-key':
        printError('API Key do Firebase inválida');
        printInfo('Verifique as credenciais no arquivo .env.local');
        break;

      default:
        printError('Erro desconhecido');
        printInfo('Verifique os logs acima para mais detalhes');
    }

    console.log('\n' + '='.repeat(70) + '\n');
    process.exit(1);
  }
}

// Executar teste
if (require.main === module) {
  printInfo('Iniciando teste em 2 segundos...\n');
  setTimeout(() => {
    testPasswordReset().catch(error => {
      printError('Erro fatal ao executar teste');
      console.error(error);
      process.exit(1);
    });
  }, 2000);
}

module.exports = { testPasswordReset };
