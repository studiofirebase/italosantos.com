# Sistema de Tradução Google Translate

## 📋 Visão Geral

Este projeto agora conta com integração completa do Google Translate, permitindo que os usuários traduzam todo o conteúdo do site para mais de 10 idiomas diferentes.

## 🎯 Funcionalidades

### Ícone de Tradução
- **Localização**: Canto superior direito do header
- **Ícone**: 🌐 (Languages icon da biblioteca lucide-react)
- **Função**: Dropdown menu com seleção de idiomas

### Idiomas Disponíveis

1. 🇧🇷 **Português** (Original)
2. 🇺🇸 **English** (Inglês)
3. 🇪🇸 **Español** (Espanhol)
4. 🇫🇷 **Français** (Francês)
5. 🇩🇪 **Deutsch** (Alemão)
6. 🇮🇹 **Italiano** (Italiano)
7. 🇯🇵 **日本語** (Japonês)
8. 🇰🇷 **한국어** (Coreano)
9. 🇨🇳 **中文** (Chinês Simplificado)
10. 🇷🇺 **Русский** (Russo)
11. 🇸🇦 **العربية** (Árabe)

## 🔧 Implementação Técnica

### Arquivos Criados/Modificados

1. **`/src/components/common/GoogleTranslate.tsx`**
   - Componente principal de tradução
   - Gerencia o widget do Google Translate
   - Interface customizada com dropdown

2. **`/src/components/layout/header.tsx`**
   - Adicionado componente GoogleTranslate
   - Posicionado no canto superior direito

3. **`/src/app/layout.tsx`**
   - Script de inicialização do Google Translate
   - Configuração global do tradutor

4. **`/src/app/globals.css`**
   - Estilos customizados para ocultar elementos indesejados
   - Remove banner do Google Translate
   - Previne problemas de layout

### Como Funciona

1. **Carregamento**: O script do Google Translate é carregado via Next.js Script component
2. **Inicialização**: Função `googleTranslateElementInit` configura o widget
3. **Interação**: Usuário clica no ícone de idiomas e seleciona o idioma desejado
4. **Tradução**: O Google Translate traduz automaticamente todo o conteúdo da página

### Customizações

#### CSS Personalizado
```css
/* Ocultar banner do Google Translate */
.goog-te-banner-frame.skiptranslate {
  display: none !important;
}

/* Prevenir jump da página */
body {
  top: 0 !important;
}

/* Ocultar widget padrão */
#google_translate_element {
  display: none !important;
}
```

#### Configuração do Widget
```javascript
{
  pageLanguage: 'pt',
  includedLanguages: 'pt,en,es,fr,de,it,ja,ko,zh-CN,ru,ar',
  layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
  autoDisplay: false
}
```

## 🎨 Interface do Usuário

### Desktop
- Ícone de idiomas visível no header
- Dropdown menu com lista de idiomas
- Hover effect para melhor UX

### Mobile
- Mesmo comportamento do desktop
- Responsivo e otimizado para touch

## 🚀 Como Usar

### Para Usuários
1. Clique no ícone 🌐 no canto superior direito
2. Selecione o idioma desejado
3. A página será traduzida automaticamente
4. Para voltar ao original, selecione "Português (Original)"

### Para Desenvolvedores
```tsx
import GoogleTranslate from '@/components/common/GoogleTranslate';

// Usar no componente
<GoogleTranslate />
```

## 🔍 Detalhes Técnicos

### Dependências
- **Google Translate Element API**: Biblioteca oficial do Google
- **lucide-react**: Ícones (Languages icon)
- **Radix UI**: Dropdown menu components

### Performance
- Script carregado com `strategy="afterInteractive"`
- Não bloqueia renderização inicial
- Lazy loading do widget

### SEO
- Tradução do lado do cliente (não afeta crawlers)
- Conteúdo original preservado
- Não interfere com indexação

## 🐛 Troubleshooting

### Banner do Google Translate aparece
- Verificar se os estilos CSS estão sendo aplicados
- Limpar cache do navegador

### Tradução não funciona
- Verificar console para erros de script
- Confirmar que o script do Google está carregado
- Verificar conexão com servidores do Google

### Layout quebrado após tradução
- Verificar CSS: `body { top: 0 !important; }`
- Testar com diferentes idiomas
- Verificar z-index do header

## 📝 Notas

- O Google Translate é gratuito para uso em websites
- Limite de caracteres por dia: 500k (muito além do necessário)
- A tradução é feita em tempo real
- Cookies são usados para lembrar preferências de idioma

## 🔄 Atualizações Futuras

- [ ] Adicionar mais idiomas
- [ ] Salvar preferência de idioma no localStorage
- [ ] Adicionar indicador visual do idioma atual
- [ ] Melhorar animações do dropdown
- [ ] Adicionar shortcut de teclado para abrir menu

## 👨‍💻 Desenvolvedor

Sistema implementado e documentado para facilitar manutenção e expansão futura.

---

**Data de Implementação**: Novembro 2025  
**Versão**: 1.0.0
