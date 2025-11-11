#!/bin/bash

##############################################################################
# Google Cloud Deploy Script - Studio Italo Santos
# 
# Este script realiza o deploy do projeto Next.js no Google Cloud Platform
# usando Cloud Build e App Engine
#
# Pré-requisitos:
# - gcloud CLI instalado e configurado
# - Projeto GCP criado (creatorsphere-srajp)
# - App Engine habilitado
# - Cloud Build API habilitada
# - Secret Manager configurado com as variáveis de ambiente
##############################################################################

set -e  # Parar o script se houver erro

echo "🚀 Google Cloud Deploy - Studio Italo Santos"
echo "=============================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
PROJECT_ID="facepass-afhid"
REGION="us-central1"
SERVICE_NAME="italosantos"

# Função para imprimir mensagens coloridas
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se gcloud está instalado
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI não encontrado!"
    echo "Instale em: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

print_success "gcloud CLI encontrado"

# Configurar projeto
print_info "Configurando projeto: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Verificar autenticação
print_info "Verificando autenticação..."
ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null)

if [ -z "$ACCOUNT" ]; then
    print_warning "Não autenticado. Fazendo login..."
    gcloud auth login
else
    print_success "Autenticado como: $ACCOUNT"
fi

# Verificar se as APIs necessárias estão habilitadas
print_info "Verificando APIs necessárias..."

APIS=(
    "cloudbuild.googleapis.com"
    "appengine.googleapis.com"
    "secretmanager.googleapis.com"
    "sqladmin.googleapis.com"
)

for api in "${APIS[@]}"; do
    if gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep -q "$api"; then
        print_success "$api habilitada"
    else
        print_warning "$api não habilitada. Habilitando..."
        gcloud services enable $api
    fi
done

# Menu de opções
echo ""
echo "Escolha o tipo de deploy:"
echo "1) Deploy com Cloud Build (Recomendado)"
echo "2) Deploy direto com App Engine"
echo "3) Deploy apenas do Cloud Build (sem App Engine)"
echo "4) Configurar Secrets no Secret Manager"
echo "5) Cancelar"
echo ""
read -p "Opção: " DEPLOY_OPTION

case $DEPLOY_OPTION in
    1)
        print_info "Iniciando deploy com Cloud Build..."
        
        # Verificar se .env.local existe
        if [ ! -f ".env.local" ]; then
            print_error ".env.local não encontrado!"
            print_info "Copie .env.example para .env.local e configure as variáveis"
            exit 1
        fi
        
        # Fazer build local primeiro (opcional)
        read -p "Fazer build local primeiro? (s/n): " BUILD_LOCAL
        if [[ $BUILD_LOCAL == "s" || $BUILD_LOCAL == "S" ]]; then
            print_info "Fazendo build local..."
            npm run build
            print_success "Build local concluído"
        fi
        
        # Submeter para Cloud Build
        print_info "Submetendo para Cloud Build..."
        gcloud builds submit --config=cloudbuild.yaml \
            --substitutions=_PROJECT_ID=$PROJECT_ID,_REGION=$REGION
        
        print_success "Deploy iniciado no Cloud Build!"
        print_info "Acompanhe em: https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID"
        ;;
        
    2)
        print_info "Deploy direto com App Engine..."
        
        # Build local
        print_info "Fazendo build do Next.js..."
        npm run build
        
        # Deploy para App Engine
        print_info "Fazendo deploy para App Engine..."
        gcloud app deploy app.yaml --quiet
        
        print_success "Deploy concluído!"
        
        # Obter URL do app
        APP_URL=$(gcloud app describe --format="value(defaultHostname)")
        print_success "App disponível em: https://$APP_URL"
        ;;
        
    3)
        print_info "Deploy apenas Cloud Build..."
        gcloud builds submit --config=cloudbuild.yaml
        print_success "Build concluído!"
        ;;
        
    4)
        print_info "Configurando Secrets no Secret Manager..."
        
        if [ ! -f ".env.local" ]; then
            print_error ".env.local não encontrado!"
            exit 1
        fi
        
        # Ler .env.local e criar secrets
        while IFS='=' read -r key value; do
            # Ignorar linhas vazias e comentários
            [[ -z "$key" || "$key" =~ ^#.* ]] && continue
            
            # Remover espaços e aspas
            key=$(echo "$key" | xargs)
            value=$(echo "$value" | xargs | sed 's/^["'"'"']//;s/["'"'"']$//')
            
            if [ ! -z "$key" ] && [ ! -z "$value" ]; then
                print_info "Criando secret: $key"
                echo -n "$value" | gcloud secrets create "$key" \
                    --data-file=- \
                    --replication-policy="automatic" 2>/dev/null || \
                echo -n "$value" | gcloud secrets versions add "$key" \
                    --data-file=-
                print_success "Secret $key configurado"
            fi
        done < .env.local
        
        print_success "Todos os secrets configurados!"
        ;;
        
    5)
        print_info "Deploy cancelado"
        exit 0
        ;;
        
    *)
        print_error "Opção inválida"
        exit 1
        ;;
esac

echo ""
echo "🎉 Script finalizado!"
echo ""
echo "📋 Comandos úteis:"
echo "   • Ver logs: gcloud app logs tail -s default"
echo "   • Ver builds: gcloud builds list"
echo "   • Abrir console: gcloud app browse"
echo "   • Ver secrets: gcloud secrets list"
echo ""
