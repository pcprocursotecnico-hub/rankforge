/**
 * =============================================================
 * bot.js — Configuração central do bot
 * =============================================================
 * Responsabilidade:
 *  - Criar a instância do bot com Telegraf
 *  - Registrar middlewares globais (logging, error handling)
 *  - Registrar todos os comandos
 *  - Registrar listeners de eventos de grupo
 *  - Iniciar o polling
 */

import { Telegraf } from 'telegraf';
import { message }  from 'telegraf/filters';

import { registerStartCommand }   from './commands/start.js';
import { registerMyLinkCommand }  from './commands/mylink.js';
import { registerRankingCommand } from './commands/ranking.js';
import { registerMeCommand }      from './commands/me.js';
import { registerNewMember }      from './services/inviteService.js';
import { logger }                 from './utils/logger.js';

/**
 * Cria, configura e inicia o bot Telegram.
 * Esta função é o único ponto de orquestração — cada módulo
 * cuida de sua própria lógica interna.
 */
export async function startBot() {
  const token   = process.env.BOT_TOKEN;
  const groupId = process.env.GROUP_ID;

  // ── Instância do bot ────────────────────────────────────────
  const bot = new Telegraf(token);

  // ── Middleware: logging de todas as atualizações ────────────
  bot.use(async (ctx, next) => {
    const type = ctx.updateType;
    const from = ctx.from
      ? `${ctx.from.first_name} (${ctx.from.id})`
      : 'desconhecido';

    logger.debug(`Update recebido: ${type} | De: ${from}`);
    await next();
  });

  // ── Middleware: tratamento global de erros ──────────────────
  bot.catch((err, ctx) => {
    logger.error(`Erro não tratado no update ${ctx.updateType}: ${err.message}`);
    // Não derruba o bot — apenas loga o erro
  });

  // ── Registro de comandos ────────────────────────────────────
  registerStartCommand(bot);
  registerMyLinkCommand(bot, groupId);
  registerRankingCommand(bot);
  registerMeCommand(bot);

  // ── Listener: novos membros no grupo ───────────────────────
  // O evento chat_member captura entradas com metadados de convite
  // (incluindo qual invite_link foi usado).
  bot.on('chat_member', async (ctx) => {
    try {
      const update    = ctx.chatMemberUpdated || ctx.update.chat_member;
      const newMember = update?.new_chat_member;
      const oldMember = update?.old_chat_member;

      // Só processa quando o status muda para membro (entrada)
      if (!newMember || !oldMember) return;

      const enteredGroup =
        (oldMember.status === 'left' || oldMember.status === 'kicked') &&
        (newMember.status === 'member' || newMember.status === 'administrator');

      if (!enteredGroup) return;

      const user       = newMember.user;
      const inviteLink = update.invite_link?.invite_link || null;

      logger.event(
        'chat_member',
        `${user.first_name} (${user.id}) entrou | Link: ${inviteLink || 'nenhum'}`
      );

      const { credited, ownerRecord } = await registerNewMember({
        newUserId:    user.id,
        newFirstName: user.first_name || 'Desconhecido',
        newUsername:  user.username   || '',
        inviteLink,
      });

      // Notifica o dono do link sobre o novo convite (opcional, boa UX)
      if (credited && ownerRecord) {
        try {
          const inviteWord = ownerRecord.inviteCount === 1 ? 'convite' : 'convites';
          await bot.telegram.sendMessage(
            ownerRecord.userId,
            `🎉 *${user.first_name}* entrou no grupo usando seu link\\!\n\n` +
            `📨 Você agora tem *${ownerRecord.inviteCount} ${inviteWord}* \\— ` +
            `use /ranking para ver sua posição\\.`,
            { parse_mode: 'MarkdownV2' }
          );
        } catch {
          // Usuário pode ter bloqueado o bot — ignora silenciosamente
          logger.debug(`Não foi possível notificar ${ownerRecord.userId} sobre novo convite.`);
        }
      }
    } catch (err) {
      logger.error(`Erro ao processar chat_member: ${err.message}`);
    }
  });

  // ── Fallback: new_chat_members (compatibilidade) ────────────
  // Alguns clientes antigos não enviam chat_member.
  // Este listener captura os casos não cobertos pelo anterior.
  bot.on(message('new_chat_members'), async (ctx) => {
    try {
      for (const user of ctx.message.new_chat_members) {
        // O evento new_chat_members NÃO inclui o invite_link usado.
        // Só logamos para diagnóstico — o rastreamento real via chat_member.
        logger.debug(
          `new_chat_members: ${user.first_name} (${user.id}) — sem link rastreável neste evento.`
        );
      }
    } catch (err) {
      logger.error(`Erro em new_chat_members: ${err.message}`);
    }
  });

  // ── Inicia o bot ────────────────────────────────────────────
  await bot.launch({
    // Allowed updates inclui chat_member para rastrear entradas
    allowedUpdates: ['message', 'chat_member', 'my_chat_member'],
    dropPendingUpdates: true, // Ignora updates acumulados antes de iniciar
  });

  // Informações de diagnóstico ao iniciar
  const botInfo = await bot.telegram.getMe();
  logger.success(`Bot iniciado: @${botInfo.username} (ID: ${botInfo.id})`);
  logger.info(`Monitorando grupo: ${groupId}`);
  logger.info('Pressione Ctrl+C para encerrar.');

  // ── Encerramento gracioso ───────────────────────────────────
  // Garante que o bot finalize corretamente ao receber SIGINT/SIGTERM
  process.once('SIGINT',  () => {
    logger.warn('Recebido SIGINT — encerrando bot...');
    bot.stop('SIGINT');
  });
  process.once('SIGTERM', () => {
    logger.warn('Recebido SIGTERM — encerrando bot...');
    bot.stop('SIGTERM');
  });
}
