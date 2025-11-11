#!/bin/bash

##############################################################################
# Google Cloud Run Deploy Script - Studio Italo Santos
# 
# Este script realiza o deploy do projeto Next.js no Google Cloud Run
#
# Pré-requisitos:
# - gcloud CLI instalado e configurado
# - Docker instalado (opcional, Cloud Build faz o build)
# - Projeto GCP criado
# - Cloud Run API habilitada
# - Cloud Build API habilitada
##############################################################################

set -e  # Parar o script se houver erro

echo "🚀 Google Cloud Run Deploy - Studio Italo Santos"
echo "================================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações - EDITE AQUI
PROJECT_ID="facepass-afhid"
REGION="us-central1"
SERVICE_NAME="italosantos"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

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

# Habilitar APIs necessárias
print_info "Habilitando APIs necessárias..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable artifactregistry.googleapis.com

print_success "APIs habilitadas"

# Verificar se .dockerignore existe
if [ ! -f .dockerignore ]; then
    print_warning ".dockerignore não encontrado. Criando..."
    cat > .dockerignore << 'EOF'
.git
.gitignore
node_modules
npm-debug.log
README.md
.next
.env*.local
.DS_Store
*.log
.vscode
.idea
coverage
dist
build
.cache
*.md
docs
tests
__tests__
*.test.*
*.spec.*
.github
EOF
    print_success ".dockerignore criado"
fi

# Menu de opções
echo ""
echo "Escolha o método de deploy:"
echo "1) Deploy rápido (Cloud Build + Cloud Run)"
echo "2) Build local e deploy"
echo "3) Apenas build (sem deploy)"
echo "4) Configurar variáveis de ambiente"
echo "5) Ver logs do serviço"
echo "6) Sair"
echo ""
read -p "Escolha uma opção (1-6): " choice

case $choice in
    1)
        print_info "Iniciando deploy com Cloud Build..."
        echo ""
        
        # Build da imagem usando Cloud Build
        print_info "Building Docker image com Cloud Build..."
        
        # Obter número do projeto para service account
        PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')
        SERVICE_ACCOUNT="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
        
        print_info "Usando service account: ${SERVICE_ACCOUNT}"
        
        gcloud builds submit \
            --tag ${IMAGE_NAME}:latest \
            --project ${PROJECT_ID} \
            --timeout=20m \
            --service-account "projects/${PROJECT_ID}/serviceAccounts/${SERVICE_ACCOUNT}"
        
        print_success "Build concluído!"
        echo ""
        
        # Deploy no Cloud Run
        print_info "Fazendo deploy no Cloud Run..."
        gcloud run deploy ${SERVICE_NAME} \
            --image ${IMAGE_NAME}:latest \
            --platform managed \
            --region ${REGION} \
            --allow-unauthenticated \
            --port 8080 \
            --memory 512Mi \
            --cpu 1 \
            --min-instances 0 \
            --max-instances 10 \
            --timeout 300 \
            --project ${PROJECT_ID}
        
        print_success "Deploy concluído!"
        
        # Obter URL do serviço
        SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
            --platform managed \
            --region ${REGION} \
            --format 'value(status.url)' \
            --project ${PROJECT_ID})
        
        echo ""
        print_success "Aplicação disponível em:"
        echo -e "${GREEN}${SERVICE_URL}${NC}"
        ;;
        
    2)
        print_info "Build local e deploy..."
        
        # Verificar se Docker está instalado
        if ! command -v docker &> /dev/null; then
            print_error "Docker não encontrado! Instale o Docker primeiro."
            exit 1
        fi
        
        print_info "Building Docker image localmente..."
        docker build -t ${IMAGE_NAME}:latest .
        
        print_info "Fazendo push da imagem..."
        docker push ${IMAGE_NAME}:latest
        
        print_info "Fazendo deploy no Cloud Run..."
        gcloud run deploy ${SERVICE_NAME} \
            --image ${IMAGE_NAME}:latest \
            --platform managed \
            --region ${REGION} \
            --allow-unauthenticated \
            --port 8080 \
            --memory 512Mi \
            --cpu 1 \
            --min-instances 0 \
            --max-instances 10 \
            --timeout 300 \
            --project ${PROJECT_ID}
        
        SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
            --platform managed \
            --region ${REGION} \
            --format 'value(status.url)' \
            --project ${PROJECT_ID})
        
        echo ""
        print_success "Deploy concluído!"
        echo -e "${GREEN}${SERVICE_URL}${NC}"
        ;;
        
    3)
        print_info "Apenas build (sem deploy)..."
        
        # Obter número do projeto para service account
        PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')
        SERVICE_ACCOUNT="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
        
        gcloud builds submit \
            --tag ${IMAGE_NAME}:latest \
            --project ${PROJECT_ID} \
            --timeout=20m \
            --service-account "projects/${PROJECT_ID}/serviceAccounts/${SERVICE_ACCOUNT}"
        
        print_success "Build concluído! Imagem: ${IMAGE_NAME}:latest"
        ;;
        
    4)
        print_info "Configurar variáveis de ambiente..."
        echo ""
        echo "Para adicionar variáveis de ambiente, use:"
        echo ""
        echo "gcloud run services update ${SERVICE_NAME} \\"
        echo "  --set-env-vars KEY1=value1,KEY2=value2 \\"
        echo "  --region ${REGION}"
        echo ""
        echo "Ou para usar Secret Manager:"
        echo ""
        echo "gcloud run services update ${SERVICE_NAME} \\"
        echo "  --set-secrets KEY1=secret-name:latest \\"
        echo "  --region ${REGION}"
        ;;
        
    5)
        print_info "Visualizando logs..."
        gcloud run services logs read ${SERVICE_NAME} \
            --region ${REGION} \
            --project ${PROJECT_ID} \
            --limit 50
        ;;
        
    6)
        print_info "Saindo..."
        exit 0
        ;;
        
    *)
        print_error "Opção inválida!"
        exit 1
        ;;
esac

echo ""
print_info "Comandos úteis:"
echo "- Ver logs: gcloud run services logs tail ${SERVICE_NAME} --region ${REGION}"
echo "- Atualizar: ./deploy-cloud-run.sh"
echo "- Deletar: gcloud run services delete ${SERVICE_NAME} --region ${REGION}"
echo "- Ver status: gcloud run services describe ${SERVICE_NAME} --region ${REGION}"
echo ""
print_success "🎉 Processo concluído!"
