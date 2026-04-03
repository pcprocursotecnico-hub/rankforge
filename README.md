# 🏆 Telegram Ranking Bot

Bot Telegram profissional que rastreia convites com **links únicos por usuário** — cada membro do grupo recebe um link exclusivo e ganha pontos por cada pessoa que entra através dele.

Construído com **Node.js** e **Telegraf** — o framework mais robusto e completo para bots Telegram.

---

## ✨ Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| 🔗 Links únicos | Cada usuário tem um link de convite exclusivo e rastreável |
| 📥 Rastreamento automático | Detecta entradas e credita o dono do link automaticamente |
| 🏆 Ranking Top 10 | Exibe quem mais convidou, formatado com pódio |
| 📊 Stats pessoais | Cada membro vê seus próprios convites e posição |
| 🔔 Notificações | O dono do link é notificado quando alguém usa seu link |
| 💾 Persistência | Dados salvos em JSON com backup automático e escrita atômica |
| 🎨 Logs coloridos | Console legível com níveis de log em cores |

---

## 📋 Pré-requisitos

- **Node.js** v18 ou superior
- **npm** v8 ou superior
- Um bot Telegram criado via [@BotFather](https://t.me/BotFather)
- O bot deve ser **administrador** do grupo com permissão para criar links

---

## 🚀 Instalação

### 1. Clone ou baixe o projeto

```bash
git clone https://github.com/seu-usuario/telegram-ranking-bot.git
cd telegram-ranking-bot
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Abra o `.env` e preencha:

```env
BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
GROUP_ID=-1001234567890
NODE_ENV=production
```

### 4. Inicie o bot

```bash
npm start
```

---

## 🤖 Criando o Bot no BotFather

1. Abra o Telegram e acesse [@BotFather](https://t.me/BotFather)
2. Envie `/newbot`
3. Escolha um **nome** para o bot (ex: `Meu Ranking Bot`)
4. Escolha um **username** (deve terminar em `bot`, ex: `meu_ranking_bot`)
5. Copie o **token** fornecido e cole no `.env`

### Configurar comandos no BotFather (opcional, mas recomendado)

Envie `/setcommands` para o BotFather e selecione seu bot, depois cole:

```
start - Boas-vindas e apresentação do bot
mylink - Gera seu link exclusivo de convite
ranking - Exibe o ranking de convites
me - Suas estatísticas pessoais
```

---

## 🔍 Obtendo o GROUP_ID

### Opção 1: Via logs do bot
1. Adicione o bot ao grupo
2. Inicie o bot (`npm start`)
3. Envie qualquer mensagem no grupo
4. O ID do grupo aparecerá nos logs do console

### Opção 2: Via @userinfobot
1. Adicione [@userinfobot](https://t.me/userinfobot) ao grupo temporariamente
2. O bot exibirá o ID do grupo
3. IDs de grupos sempre começam com `-100`

### Opção 3: Via API do Telegram
Acesse no navegador (substitua SEU_TOKEN):
```
https://api.telegram.org/botSEU_TOKEN/getUpdates
```
Depois de enviar uma mensagem no grupo, o `chat.id` aparecerá na resposta.

---

## 👑 Configurando o Bot como Admin

Para criar links de convite, o bot **precisa ser administrador** do grupo.

1. Abra as configurações do grupo no Telegram
2. Acesse **Administradores → Adicionar Administrador**
3. Pesquise pelo username do seu bot
4. Habilite as permissões:
   - ✅ **Convidar Usuários via Link** (obrigatória)
   - ✅ **Enviar Mensagens** (para notificações)

---

## 💬 Comandos

### `/start`
Mensagem de boas-vindas com lista de comandos disponíveis.
Registra automaticamente o usuário no sistema.

### `/mylink`
Gera (ou recupera) o link de convite exclusivo do usuário.
- Cada usuário tem **um único link** permanente
- O link é criado via API oficial do Telegram (`createChatInviteLink`)
- Compartilhe o link para ganhar pontos no ranking

**Exemplo de resposta:**
```
🔗 Seu link de convite:

https://t.me/+AbCdEfGhIjKlMnOp

📌 Como usar:
Compartilhe este link com quem você quer convidar...
```

### `/ranking`
Exibe o Top 10 de quem mais convidou pessoas para o grupo.

**Exemplo de resposta:**
```
🏆 Ranking de Convites — Top 3

🥇 João Silva (@joao) — 15 convites
🥈 Maria Santos — 8 convites
🥉 Pedro Costa (@pedro) — 5 convites

📈 Total de convites registrados: 28
```

### `/me`
Exibe as estatísticas pessoais do usuário.

**Exemplo de resposta:**
```
📊 Suas Estatísticas

👤 João Silva (@joao)
🏅 Posição no ranking: 🥇
📨 Total de convites: 15 convites
📅 Membro desde: 01/01/2025

👥 Últimos convidados:
  • Ana Lima (@ana)
  • Carlos Mendes
```

---

## 📁 Estrutura do Projeto

```
telegram-ranking-bot/
├── index.js                      # Ponto de entrada + validação de env
├── package.json
├── .env                          # Variáveis de ambiente (não commitar!)
├── .env.example                  # Template de configuração
├── .gitignore
├── README.md
└── src/
    ├── bot.js                    # Orquestração: cria bot, middlewares, listeners
    ├── commands/
    │   ├── start.js              # Handler /start
    │   ├── mylink.js             # Handler /mylink
    │   ├── ranking.js            # Handler /ranking
    │   └── me.js                 # Handler /me
    ├── services/
    │   └── inviteService.js      # Lógica de negócio: links, contagem, ranking
    ├── database/
    │   ├── database.js           # Persistência JSON com escrita atômica
    │   └── data.json             # Banco de dados local
    └── utils/
        └── logger.js             # Logger colorido com chalk
```

---

## 🗄️ Estrutura dos Dados

```json
{
  "version": "1.0.0",
  "totalInvites": 42,
  "members": {
    "123456789": {
      "userId": 123456789,
      "firstName": "João",
      "username": "joao",
      "inviteLink": "https://t.me/+AbCdEfGhIjKl",
      "inviteCount": 15,
      "invitedUsers": [
        {
          "userId": 987654321,
          "firstName": "Ana",
          "username": "ana",
          "joinedAt": "2025-01-01T14:30:00.000Z"
        }
      ],
      "createdAt": "2025-01-01T10:00:00.000Z",
      "lastInviteAt": "2025-01-15T18:22:00.000Z"
    }
  },
  "linkMap": {
    "https://t.me/+AbCdEfGhIjKl": 123456789
  }
}
```

O `linkMap` é um índice reverso `link → userId` para busca O(1) quando um novo membro entra.

---

## ⚙️ Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `BOT_TOKEN` | ✅ | Token do bot (obtido no BotFather) |
| `GROUP_ID` | ✅ | ID do grupo a ser monitorado |
| `NODE_ENV` | ❌ | `development` ativa logs de debug |

---

## 🔧 Solução de Problemas

### "not enough rights to create chat invite link"
O bot não é administrador ou não tem a permissão correta. Veja a seção **Configurando o Bot como Admin**.

### "chat not found"
O `GROUP_ID` no `.env` está incorreto. IDs de grupos sempre começam com `-100`.

### Bot não detecta entradas de novos membros
- Certifique-se de que o bot tem permissão de **administrador**
- O evento `chat_member` só funciona quando o bot é admin
- Verifique se `NODE_ENV=development` para ver logs detalhados

### Dados perdidos após reinicialização
- Os dados ficam em `src/database/data.json`
- Um backup automático é mantido em `data.json.bak`
- Para restaurar: `cp src/database/data.json.bak src/database/data.json`

---

## 🔮 Melhorias Futuras

- [ ] **Banco de dados real** (PostgreSQL/MongoDB) para escala e queries complexas
- [ ] **Dashboard web** com gráficos de crescimento em tempo real
- [ ] **Multi-grupo** — suporte a múltiplos grupos com bancos separados
- [ ] **Sistema de metas** — "convide X pessoas e ganhe uma badge"
- [ ] **Ranking semanal/mensal** — zeramento automático por período
- [ ] **Comando /admin** — painel de administração para resetar ranking
- [ ] **Webhooks** em vez de polling para produção em servidor
- [ ] **Exportação de relatório** em PDF ou planilha
- [ ] **Rate limiting** por usuário para evitar abuso
- [ ] **Testes automatizados** com Jest

---

## 📄 Licença

MIT — Livre para uso pessoal e comercial.
