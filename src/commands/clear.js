// Comando /clear para limpar o chat do grupo
import { logger } from '../utils/logger.js';

export function registerClearCommand(bot, groupId) {
	bot.command('clear', async (ctx) => {
		if (ctx.chat.id !== Number(groupId)) {
			await ctx.reply('❌ Este comando só pode ser usado no grupo.');
			return;
		}
		const fromId = ctx.from.id;
		const member = await ctx.getChatMember(fromId);
		if (member.status !== 'administrator' && member.status !== 'creator') {
			await ctx.reply('❌ Apenas administradores podem limpar o chat.');
			return;
		}
		try {
			// Deleta as últimas 100 mensagens a partir do comando
			const baseId = ctx.message.message_id;
			let deleted = 0;
			for (let i = 0; i < 100; i++) {
				const msgId = baseId - i;
				if (msgId <= 0) break;
				try {
					await ctx.telegram.deleteMessage(ctx.chat.id, msgId);
					deleted++;
				} catch {}
			}
			await ctx.reply(`🧹 Chat limpo! (${deleted} mensagens)`);
			logger.event('/clear', `Chat limpo por ${ctx.from.first_name} (${fromId})`);
		} catch (err) {
			logger.error(`Erro ao limpar chat: ${err.message}`);
			await ctx.reply('❌ Erro ao limpar o chat.');
		}
	});
}
