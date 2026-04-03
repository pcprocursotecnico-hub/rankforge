import { getOrCreateInviteLink } from '../services/inviteService.js';
import { escapeMarkdown } from './start.js';
import { logger } from '../utils/logger.js';

export function registerMyLinkCommand(bot, groupId) {
	bot.command('mylink', async (ctx) => {
		const { id: userId, first_name: firstName, username } = ctx.from;
		logger.event('/mylink', `${firstName} (${userId})`);
		let loadingMsg;
		try {
			loadingMsg = await ctx.reply('⏳ Gerando seu link exclusivo...');
		} catch {}
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
			   if (loadingMsg) {
				   try {
					   await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
				   } catch {}
			   }
			   await ctx.replyWithMarkdownV2(message);
			   logger.success(`Link ${isNew ? 'criado' : 'consultado'} para ${firstName} (${userId})`);
		   } catch (err) {
			   logger.error(`Erro ao gerar link para ${userId}: ${err.message}`);
			   logger.error(`Stack: ${err.stack}`);
			   logger.error(`Contexto: groupId=${groupId}, userId=${userId}, firstName=${firstName}, username=${username}`);
			   if (loadingMsg) {
				   try {
					   await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
				   } catch { /* ignorado */ }
			   }
			   let extra = err.response?.description ? `\n\nDetalhe: ${err.response.description}` : '';
			   if (err.message?.includes('not enough rights')) {
				   await ctx.reply(
					   '❌ O bot não tem permissão para criar links de convite.\n\n' +
					   '🔑 Certifique-se de que o bot é *administrador* do grupo com a permissão ' +
					   '"Adicionar Membros" habilitada.' + extra,
					   { parse_mode: 'Markdown' }
				   );
			   } else if (err.message?.includes('chat not found')) {
				   await ctx.reply(
					   '❌ Grupo não encontrado.\n\n' +
					   '🔍 Verifique se o GROUP_ID no arquivo .env está correto.' + extra
				   );
			   } else {
				   await ctx.reply('❌ Erro ao gerar link. Tente novamente em instantes.' + extra);
			   }
		   }
	});
}
