import { readData, getOrCreateMember, writeData } from '../database/database.js';
import { logger } from '../utils/logger.js';

export function registerStartCommand(bot) {
	bot.start(async (ctx) => {
		const { id: userId, first_name: firstName, username } = ctx.from;
		logger.event('/start', `${firstName} (${userId})`);
		try {
			const data = await readData();
			getOrCreateMember(data, userId, firstName, username);
			data.lastUpdated = new Date().toISOString();
			await writeData(data);
			const displayName = firstName || 'usuário';
			const welcomeMessage = `
🤖 *Olá, ${escapeMarkdown(displayName)}\\! Bem\\-vindo ao Ranking Bot\\!*

Aqui você pode convidar pessoas para o grupo e acompanhar seu desempenho no ranking\\.

*📋 Comandos disponíveis:*

🔗 /mylink — Gera seu link exclusivo de convite
🏆 /ranking — Veja quem mais convidou pessoas
📊 /me — Suas estatísticas pessoais

*Como funciona?*
1\\. Use /mylink para obter seu link único
2\\. Compartilhe com quem quiser convidar
3\\. Cada pessoa que entrar via seu link conta um ponto
4\\. Suba no /ranking\\!

_Boa sorte\\! 🚀_
			`.trim();
			await ctx.replyWithMarkdownV2(welcomeMessage);
		} catch (err) {
			logger.error(`Erro no /start para ${userId}: ${err.message}`);
			await ctx.reply('❌ Ocorreu um erro. Tente novamente em instantes.');
		}
	});
}

export function escapeMarkdown(text) {
	if (!text) return '';
	return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}
