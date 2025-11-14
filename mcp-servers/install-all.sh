#!/bin/bash

echo "🚀 Instalando dependências dos servidores MCP de Pagamentos"
echo ""

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para instalar e compilar
install_and_build() {
  local server=$1
  local path=$2
  
  echo -e "${BLUE}📦 Instalando $server...${NC}"
  cd "$path"
  
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json não encontrado em $path${NC}"
    cd - > /dev/null
    return 1
  fi
  
  npm install
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ $server instalado com sucesso${NC}"
  else
    echo -e "${RED}❌ Erro ao instalar $server${NC}"
    cd - > /dev/null
    return 1
  fi
  
  echo -e "${BLUE}🔨 Compilando $server...${NC}"
  npm run build
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ $server compilado com sucesso${NC}"
  else
    echo -e "${RED}❌ Erro ao compilar $server${NC}"
  fi
  
  cd - > /dev/null
  echo ""
}

# Diretório base
BASE_DIR="/workspaces/studiofirebase/mcp-servers"

# Instalar Mercado Pago
install_and_build "Mercado Pago MCP" "$BASE_DIR/mercadopago"

# Instalar PayPal
install_and_build "PayPal MCP" "$BASE_DIR/paypal"

# Instalar Apple Pay
install_and_build "Apple Pay MCP" "$BASE_DIR/apple-pay"

echo -e "${GREEN}✨ Instalação completa!${NC}"
echo ""
echo "Para testar os servidores:"
echo "  • Mercado Pago: cd mcp-servers/mercadopago && npm start"
echo "  • PayPal:       cd mcp-servers/paypal && npm start"
echo "  • Apple Pay:    cd mcp-servers/apple-pay && npm start"
