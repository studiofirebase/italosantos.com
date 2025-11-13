#!/bin/bash

# Script para obter o token de admin do navegador
# Execute este script e siga as instruções

echo "🔑 Obtendo Token de Admin para Atualização Automática do Cache"
echo ""
echo "📋 Siga estas etapas:"
echo ""
echo "1. Abra o site no navegador"
echo "2. Faça login como administrador"
echo "3. Abra o Console do Desenvolvedor (F12)"
echo "4. Vá para a aba 'Console'"
echo "5. Cole este comando:"
echo ""
echo "   localStorage.getItem('firebase_token')"
echo ""
echo "6. Copie o token (entre aspas)"
echo "7. Cole abaixo quando solicitado"
echo ""
echo "══════════════════════════════════════════════════════════"
echo ""

# Ler token do usuário
read -p "Cole o token aqui: " TOKEN

if [ -z "$TOKEN" ]; then
    echo ""
    echo "❌ Token vazio! Tente novamente."
    exit 1
fi

# Remover aspas se houver
TOKEN=$(echo "$TOKEN" | tr -d '"' | tr -d "'")

echo ""
echo "✅ Token capturado!"
echo ""
echo "📝 Adicione esta linha ao seu arquivo .env:"
echo ""
echo "ADMIN_REFRESH_TOKEN=$TOKEN"
echo ""
echo "══════════════════════════════════════════════════════════"
echo ""

# Perguntar se deseja adicionar automaticamente
read -p "Deseja adicionar automaticamente ao .env? (s/n): " ADD_TO_ENV

if [ "$ADD_TO_ENV" = "s" ] || [ "$ADD_TO_ENV" = "S" ]; then
    # Verificar se .env existe
    if [ ! -f .env ]; then
        echo ""
        echo "❌ Arquivo .env não encontrado!"
        echo "   Crie o arquivo .env primeiro."
        exit 1
    fi

    # Verificar se já existe
    if grep -q "^ADMIN_REFRESH_TOKEN=" .env; then
        echo ""
        echo "⚠️  ADMIN_REFRESH_TOKEN já existe no .env"
        read -p "Deseja substituir? (s/n): " REPLACE
        
        if [ "$REPLACE" = "s" ] || [ "$REPLACE" = "S" ]; then
            # Substituir linha existente
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' "s|^ADMIN_REFRESH_TOKEN=.*|ADMIN_REFRESH_TOKEN=$TOKEN|" .env
            else
                # Linux
                sed -i "s|^ADMIN_REFRESH_TOKEN=.*|ADMIN_REFRESH_TOKEN=$TOKEN|" .env
            fi
            echo ""
            echo "✅ Token atualizado no .env!"
        else
            echo ""
            echo "ℹ️  Mantendo token existente."
        fi
    else
        # Adicionar nova linha
        echo "" >> .env
        echo "# Token de Admin para refresh automático do cache" >> .env
        echo "ADMIN_REFRESH_TOKEN=$TOKEN" >> .env
        echo ""
        echo "✅ Token adicionado ao .env!"
    fi
fi

echo ""
echo "🎯 Próximos passos:"
echo ""
echo "1. Testar manualmente:"
echo "   npm run refresh-twitter-cache"
echo ""
echo "2. Configurar cron job (opcional):"
echo "   crontab -e"
echo "   Adicionar: */30 * * * * cd $(pwd) && /usr/bin/node refresh-twitter-cache.js"
echo ""
echo "3. Ou usar Firebase Functions (recomendado para produção)"
echo ""
echo "══════════════════════════════════════════════════════════"
echo ""
echo "✅ Configuração completa!"
echo ""
