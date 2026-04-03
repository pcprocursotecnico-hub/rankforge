/**
 * =============================================================
 * mylink.js — Handler do comando /mylink
 * =============================================================
 * Responsabilidade: Gerar (ou recuperar) o link de convite
 * único de cada usuário e enviá-lo via mensagem privada.
 *
 * O link é criado via createChatInviteLink da API do Telegram,
 * permitindo rastrear qual link cada pessoa usou para entrar.
 */

import { getOrCreateInviteLink } from '../services/inviteService.js';
import { escapeMarkdown } from './start.js';
import { logger } from '../utils/logger.js';

/**
 * Registra o handler de /mylink no bot.
 *
 * @param {import('telegraf').Telegraf} bot
 * @param {string} groupId - ID do grupo alvo
 */
export function registerMyLinkCommand(bot, groupId) {
  bot.command('mylink', async (ctx) => {
    const { id: userId, first_name: firstName, username } = ctx.from;

    logger.event('/mylink', `${firstName} (${userId})`);

    // Feedback imediato para o usuário (melhora UX em conexões lentas)
    let loadingMsg;
    try {
      loadingMsg = await ctx.reply('⏳ Gerando seu link exclusivo...');
    } catch {
      // Se não conseguir enviar o loading, continua mesmo assim
    }

    try {
      const { link, isNew } = await getOrCreateInviteLink(
        bot,
        userId,
        firstName,
        username || '',
        groupId
      );

      const escapedLink = escapeMarkdown(link);
      const statusLabel = isNew ? '✨ *Novo link criado\\!*' : '🔗 *Seu link de convite:*';

      const message = `
${statusLabel}

\`${escapedLink}\`

📌 *Como usar:*
Compartilhe este link com quem você quer convidar para o grupo\\.
Cada pessoa que entrar usando *este link* conta como um convite seu\\!

📊 Use /me para ver suas estatísticas\\.
🏆 Use /ranking para ver o placar geral\\.

_Este link é exclusivamente seu\\. Não perca\\!_ 🔐
      `.trim();

      // Apaga a mensagem de loading antes de enviar a resposta
      if (loadingMsg) {
        try {
          await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
        } catch {
          // Pode falhar se a mensagem já foi apagada
        }
      }

      await ctx.replyWithMarkdownV2(message);

      logger.success(`Link ${isNew ? 'criado' : 'consultado'} para ${firstName} (${userId})`);
    } catch (err) {
      logger.error(`Erro ao gerar link para ${userId}: ${err.message}`);

      // Limpa o loading antes de mostrar erro
      if (loadingMsg) {
        try {
          await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
        } catch { /* ignorado */ }
      }

      // Mensagem de erro amigável com diagnóstico
      if (err.message?.includes('not enough rights')) {
        await ctx.reply(
          '❌ O bot não tem permissão para criar links de convite.\n\n' +
          '🔑 Certifique-se de que o bot é *administrador* do grupo com a permissão ' +
          '"Adicionar Membros" habilitada.',
          { parse_mode: 'Markdown' }
        );
      } else if (err.message?.includes('chat not found')) {
        await ctx.reply(
          '❌ Grupo não encontrado.\n\n' +
          '🔍 Verifique se o GROUP_ID no arquivo .env está correto.'
        );
      } else {
        await ctx.reply('❌ Erro ao gerar link. Tente novamente em instantes.');
      }
    }
  });
}
