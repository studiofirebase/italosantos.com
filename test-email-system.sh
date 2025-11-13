#!/bin/bash

# Script de Teste - Sistema de E-mails Firebase
# Execute: chmod +x test-email-system.sh && ./test-email-system.sh

echo "🔥 Testando Sistema de E-mails Firebase..."
echo ""

# Verifica se o servidor está rodando
echo "1️⃣ Verificando servidor..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Servidor rodando em http://localhost:3000"
else
    echo "❌ Servidor não está rodando!"
    echo "   Execute: npm run dev"
    exit 1
fi

echo ""
echo "2️⃣ Testando páginas..."

# Testa página de ações
echo "   - Testando /auth/action..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/auth/action?mode=verifyEmail&oobCode=test)
if [ "$STATUS" = "200" ]; then
    echo "   ✅ Página de ações funcionando"
else
    echo "   ⚠️ Página retornou status: $STATUS"
fi

# Testa página de testes
echo "   - Testando /auth/action/test..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/auth/action/test)
if [ "$STATUS" = "200" ]; then
    echo "   ✅ Página de testes funcionando"
else
    echo "   ⚠️ Página retornou status: $STATUS"
fi

echo ""
echo "3️⃣ URLs de teste disponíveis:"
echo ""
echo "   🔵 Verificação de E-mail:"
echo "   http://localhost:3000/auth/action?mode=verifyEmail&oobCode=test-verify"
echo ""
echo "   🔴 Redefinição de Senha:"
echo "   http://localhost:3000/auth/action?mode=resetPassword&oobCode=test-reset"
echo ""
echo "   🟠 Recuperar E-mail:"
echo "   http://localhost:3000/auth/action?mode=recoverEmail&oobCode=test-recover"
echo ""
echo "   🟢 Alterar E-mail:"
echo "   http://localhost:3000/auth/action?mode=verifyAndChangeEmail&oobCode=test-change"
echo ""
echo "   📋 Página de Testes Completa:"
echo "   http://localhost:3000/auth/action/test"
echo ""
echo "✅ Sistema pronto para testes!"
echo ""
echo "📝 Próximos passos:"
echo "   1. Abra http://localhost:3000/auth/action/test no navegador"
echo "   2. Clique em cada botão para testar os modais"
echo "   3. Configure as URLs no Firebase Console"
echo "   4. Faça deploy e teste com e-mails reais"
echo ""
