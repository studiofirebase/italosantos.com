#!/bin/bash

echo "🚀 Deploy Firebase - Studio Italo Santos"
echo "========================================"

# Verificar se Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI não está instalado"
    echo "Instale com: npm install -g firebase-tools"
    exit 1
fi

# Verificar se está logado
if ! firebase projects:list &> /dev/null; then
    echo "❌ Não está logado no Firebase"
    echo "Faça login com: firebase login"
    exit 1
fi

echo "📦 Instalando dependências..."
npm install

echo "🔧 Configurando variáveis de ambiente..."
npm run firebase-env

echo "🔨 Fazendo build..."
npm run firebase-build

if [ $? -eq 0 ]; then
    echo "✅ Build concluído com sucesso!"
else
    echo "❌ Erro no build"
    exit 1
fi

echo "📤 Fazendo deploy..."
firebase deploy

if [ $? -eq 0 ]; then
    echo "✅ Deploy concluído com sucesso!"
    echo "🌐 URL: https://facepass-afhid.web.app"
else
    echo "❌ Erro no deploy"
    exit 1
fi
