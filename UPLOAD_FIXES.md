# Correções de Upload - Firebase Storage

## ✅ Correções Implementadas

### 1. Firebase Admin SDK - Storage Bucket
**Problema**: O Firebase Admin não estava inicializando com o `storageBucket` configurado.

**Solução**: Adicionado `storageBucket` em todas as inicializações do Firebase Admin:
- `/src/lib/firebase-admin.ts`:
  - Inicialização com `service_account.json`
  - Inicialização com variáveis de ambiente
  - Inicialização com Application Default Credentials (GCP)
  - Bucket configurado: `facepass-afhid.firebasestorage.app`

### 2. Storage Rules - Segurança e Permissões
**Problema**: Regras muito abertas (`allow read, write: if true` para tudo).

**Solução**: Implementadas regras específicas por pasta em `/storage.rules`:
```
/uploads/**              - Leitura pública, escrita autenticada
/twitter-photos/**       - Leitura pública, escrita autenticada
/user-photos/{userId}/** - Leitura pública, escrita apenas pelo próprio usuário
/chat-files/**           - Leitura e escrita apenas autenticados
/general-uploads/**      - Leitura pública, escrita autenticada
/italosantos.com/**      - Leitura pública, escrita autenticada
```

**Deploy**: Regras publicadas com sucesso via `firebase deploy --only storage`

### 3. Componente ImageUpload - Upload Real
**Problema**: O componente `/src/components/admin/image-upload.tsx` fazia upload "fake" (apenas preview local).

**Solução**: 
- Importado `storage` do Firebase
- Implementado upload real usando `uploadBytes()`
- Obtenção de URL pública com `getDownloadURL()`
- Metadados adicionados: `uploadedAt`, `originalName`
- Tratamento de erros melhorado

### 4. Página de Teste
**Criado**: `/src/app/test-upload/page.tsx`
**Componente**: `/src/components/test-upload.tsx`

**Recursos**:
- Upload de imagens e vídeos
- Preview do arquivo selecionado
- Logs detalhados no console
- Exibição da URL pública após upload
- Preview da imagem após upload bem-sucedido
- Tratamento de erros com mensagens claras

## 🧪 Como Testar

### Teste 1: Página de Teste Dedicada
1. Acesse: `http://localhost:3000/test-upload`
2. Selecione uma imagem ou vídeo
3. Clique em "Fazer Upload"
4. Verifique os logs no console do navegador
5. Se sucesso, URL pública será exibida

### Teste 2: Admin Uploads
1. Acesse: `http://localhost:3000/admin/uploads`
2. Use "Upload via API" ou "Upload Direto"
3. Arquivo será enviado para `/uploads/` no Storage

### Teste 3: Image Upload Component
1. Qualquer página que use `<ImageUpload />`
2. Faça upload via drag & drop ou seleção
3. Arquivo será enviado para `/uploads/` no Storage

## 📦 Estrutura de Pastas no Storage

```
facepass-afhid.firebasestorage.app/
├── uploads/
│   ├── test/                    (testes)
│   ├── exclusive-content/
│   │   ├── images/
│   │   └── videos/
│   ├── photos/
│   │   └── images/
│   └── videos/
│       └── videos/
├── twitter-photos/              (cache do Twitter)
├── user-photos/{userId}/        (fotos de usuários)
├── chat-files/                  (mensagens secretas)
├── general-uploads/             (uploads gerais)
└── italosantos.com/            (domínio específico)
```

## 🔍 Debug e Logs

Os logs agora incluem:
- `📤 Iniciando upload para: {path}`
- `📦 Bucket: {bucketName}`
- `📄 Arquivo: {name} {type} {size}`
- `✅ Upload completo: {result}`
- `🔗 URL pública: {url}`

## ⚠️ Notas Importantes

1. **Autenticação Necessária**: Para uploads, o usuário precisa estar autenticado (exceto via API server-side)
2. **Limite de Tamanho**: 
   - Imagens: até 10MB
   - Vídeos: até 2GB via API
3. **CORS**: Storage configurado para permitir CORS da aplicação
4. **Bucket Name**: `facepass-afhid.firebasestorage.app`

## 📝 Próximos Passos (Opcional)

1. Implementar progress bar para uploads grandes
2. Adicionar compressão de imagens antes do upload
3. Gerar thumbnails automáticos para vídeos
4. Implementar limpeza de arquivos antigos não utilizados
