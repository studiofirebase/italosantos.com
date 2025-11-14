# ⚠️ ERRO: Database not configured

## 🔴 Problema Atual

Você está vendo o erro:
```
Error: Environment variable not found: DATABASE_URL.
  -->  prisma/schema.prisma:3
```

Isso significa que o **PostgreSQL** não está configurado ainda.

---

## ✅ SOLUÇÃO RÁPIDA (3 minutos)

### Opção A: Script Automático (RECOMENDADO)

```bash
cd "/Users/italosanta/Downloads/italosantos.com original"
./setup-postgresql.sh
```

O script vai:
1. ✅ Detectar se você tem Docker ou PostgreSQL
2. ✅ Configurar automaticamente
3. ✅ Criar banco de dados `italosantos`
4. ✅ Rodar migrações do Prisma
5. ✅ Deixar tudo pronto para usar

---

### Opção B: Docker (1 comando)

```bash
# 1. Criar container PostgreSQL
docker run --name italosantos-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=italosantos \
  -p 5432:5432 \
  -d postgres:16-alpine

# 2. Aguardar 5 segundos
sleep 5

# 3. Rodar migração
npx prisma migrate dev --name add_multichat_support
npx prisma generate

# 4. Pronto!
npm run dev
```

---

### Opção C: PostgreSQL Local (Homebrew)

```bash
# 1. Instalar
brew install postgresql@16
brew services start postgresql@16

# 2. Criar banco
psql postgres -c "CREATE DATABASE italosantos;"

# 3. Rodar migração
npx prisma migrate dev --name add_multichat_support
npx prisma generate

# 4. Pronto!
npm run dev
```

---

## 📝 O que já foi feito

✅ **Adicionado no `.env.local`:**
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/italosantos
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=change_me_in_production_use_openssl_rand_base64_32
```

✅ **Scripts criados:**
- `setup-postgresql.sh` - Setup automático
- `docs/POSTGRESQL_SETUP.md` - Guia detalhado

✅ **Chat unificado implementado:**
- Histórico de mensagens de todos os canais
- Logos coloridos de identificação
- API completa para Firebase + Prisma

---

## 🚀 Depois de configurar PostgreSQL

```bash
# 1. Rodar aplicação
npm run dev

# 2. Acessar
open http://localhost:3000/admin/conversations

# 3. Ver dados no Prisma Studio
npx prisma studio
# Abre em http://localhost:5555
```

---

## ❓ Troubleshooting

### "docker: command not found"
**Solução:** Instale Docker Desktop: https://www.docker.com/products/docker-desktop

### "brew: command not found"
**Solução:** Instale Homebrew:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### "Permission denied: ./setup-postgresql.sh"
**Solução:**
```bash
chmod +x setup-postgresql.sh
./setup-postgresql.sh
```

### "Port 5432 is already in use"
**Solução:** Já tem PostgreSQL rodando! Só rode:
```bash
npx prisma migrate dev --name add_multichat_support
npx prisma generate
npm run dev
```

---

## 📚 Documentação Completa

- **`docs/POSTGRESQL_SETUP.md`** - Setup detalhado PostgreSQL
- **`docs/MULTICHAT_COMPLETE.md`** - Sistema de chat completo
- **`docs/QUICK_START_MULTICHAT.md`** - Guia rápido

---

## 🎯 Resumo

**Problema:** Falta configurar PostgreSQL  
**Solução:** Rodar `./setup-postgresql.sh` OU seguir um dos métodos acima  
**Tempo:** 3-5 minutos  
**Depois:** Chat unificado multi-canal funcionando 100%

---

**Escolha um método acima e execute!** 🚀
