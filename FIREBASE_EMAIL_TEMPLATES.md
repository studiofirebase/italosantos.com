# Templates de E-mail do Firebase Authentication

Este documento contém os templates de e-mail para configurar no Firebase Console.

## Como Configurar

1. Acesse o Firebase Console: https://console.firebase.google.com
2. Selecione seu projeto
3. Vá em **Authentication** → **Templates**
4. Para cada tipo de e-mail abaixo, clique em **Editar** e cole o template correspondente

---

## 1. Verificação de Endereço de E-mail

**Assunto:** Verifique seu e-mail no %APP_NAME%

**Corpo do E-mail:**

```
Olá, %DISPLAY_NAME%

Obrigado por se cadastrar no %APP_NAME%!

Para completar seu cadastro, clique no link abaixo para verificar seu endereço de e-mail:

%LINK%

Se você não solicitou este cadastro, ignore este e-mail.

Obrigado,
Equipe do %APP_NAME%
```

**Link de Ação:**
```
https://italosantos.com/auth/action?mode=verifyEmail&oobCode=%OOBCODE%
```

---

## 2. Redefinição de Senha

**Assunto:** Redefinir senha - %APP_NAME%

**Corpo do E-mail:**

```
Olá,

Clique neste link para redefinir a senha de login no app %APP_NAME% com sua conta %EMAIL%.

%LINK%

Se você não solicitou a redefinição da sua senha, ignore este e-mail.

Obrigado,
Equipe do %APP_NAME%
```

**Link de Ação:**
```
https://italosantos.com/auth/action?mode=resetPassword&oobCode=%OOBCODE%
```

---

## 3. Alteração de Endereço de E-mail

**Assunto:** Seu e-mail foi alterado - %APP_NAME%

**Corpo do E-mail:**

```
Olá, %DISPLAY_NAME%

Seu e-mail para fazer login no app %APP_NAME% foi alterado para %NEW_EMAIL%.

Se você não solicitou a alteração do seu e-mail de login, clique neste link para redefini-lo:

%LINK%

Obrigado,
Equipe do %APP_NAME%
```

**Link de Ação:**
```
https://italosantos.com/auth/action?mode=recoverEmail&oobCode=%OOBCODE%
```

---

## 4. Notificação de Registro da Autenticação Multifator

**Assunto:** Autenticação em duas etapas ativada - %APP_NAME%

**Corpo do E-mail:**

```
Olá, %DISPLAY_NAME%

Sua conta no app %APP_NAME% foi atualizada com %SECOND_FACTOR% para a verificação em duas etapas.

Se você não adicionou essa verificação em duas etapas, clique no link abaixo para removê-la:

%LINK%

Obrigado,
Equipe do %APP_NAME%
```

**Link de Ação:**
```
https://italosantos.com/auth/action?mode=verifyAndChangeEmail&oobCode=%OOBCODE%
```

---

## Configuração da URL de Ação Personalizada

Para que todos os links apontem para `https://italosantos.com/auth/action`, você precisa:

1. No Firebase Console, vá em **Authentication** → **Settings** → **Authorized domains**
2. Adicione `italosantos.com` se ainda não estiver na lista
3. Em cada template de e-mail, use a **Action URL** customizada conforme indicado acima

### Variáveis Disponíveis

- `%DISPLAY_NAME%` - Nome de exibição do usuário
- `%EMAIL%` - E-mail do usuário
- `%NEW_EMAIL%` - Novo e-mail (apenas para alteração de e-mail)
- `%APP_NAME%` - Nome do aplicativo
- `%LINK%` - Link de ação completo
- `%OOBCODE%` - Código de ação único
- `%SECOND_FACTOR%` - Segundo fator de autenticação (SMS, app autenticador, etc.)

---

## Testando os Templates

Após configurar os templates, teste cada funcionalidade:

1. **Verificação de E-mail**: Cadastre um novo usuário
2. **Redefinição de Senha**: Use a opção "Esqueci minha senha"
3. **Alteração de E-mail**: Vá em Perfil e altere o e-mail
4. **MFA**: Ative a autenticação de dois fatores

Cada ação enviará um e-mail com o link para `https://italosantos.com/auth/action` que será processado pelos modais flutuantes da página criada.

---

## Página de Ação Criada

**Rota:** `/auth/action`

**Parâmetros da URL:**
- `mode`: Tipo de ação (`verifyEmail`, `resetPassword`, `recoverEmail`, `verifyAndChangeEmail`)
- `oobCode`: Código de ação único do Firebase

**Funcionalidades:**
- ✅ 4 Modais flutuantes responsivos
- ✅ Verificação automática do código
- ✅ Mensagens de erro para links inválidos/expirados
- ✅ Feedback visual de sucesso
- ✅ Redirecionamento automático após conclusão
- ✅ Design consistente com o tema do app
