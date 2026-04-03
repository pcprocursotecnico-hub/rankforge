import { getRanking, getGlobalStats } from '../services/inviteService.js';
import { escapeMarkdown } from './start.js';
import { logger } from '../utils/logger.js';

const POSITION_EMOJIS = {
	1: '🥇',
	2: '🥈',
	3: '🥉',
};

export function registerRankingCommand(bot) {
	bot.command('ranking', async (ctx) => {
		const { id: userId, first_name: firstName } = ctx.from;
		logger.event('/ranking', `${firstName} (${userId})`);
		try {
			const [topMembers, stats] = await Promise.all([
				getRanking(10),
				getGlobalStats(),
			]);
			if (topMembers.length === 0) {
				await ctx.replyWithMarkdownV2(
					`🏆 *Ranking de Convites*\n\n` +
					`Nenhum convite registrado ainda\\!\n\n` +
					`_Use /mylink para gerar seu link exclusivo e começar a convidar\\. 🚀_`
				);
				return;
			}
			const lines = topMembers.map((member, index) => {
				const position      = index + 1;
				const posEmoji      = POSITION_EMOJIS[position] || `${position}\\.`;
				const displayName   = escapeMarkdown(member.firstName || 'Desconhecido');
				const usernameTag   = member.username ? ` \\(@${escapeMarkdown(member.username)}\\)` : '';
				const inviteWord    = member.inviteCount === 1 ? 'convite' : 'convites';
				return `${posEmoji} *${displayName}*${usernameTag} — ${member.inviteCount} ${inviteWord}`;
			});
			const lastUpdateDate = stats.lastUpdated
				? new Date(stats.lastUpdated).toLocaleDateString('pt-BR', {
						day:    '2-digit',
						month:  '2-digit',
						year:   'numeric',
						hour:   '2-digit',
						minute: '2-digit',
					})
				: 'N/A';
			const message = [
				`🏆 *Ranking de Convites — Top ${topMembers.length}*`,
				``,
				...lines,
				``,
				`📈 *Total de convites registrados:* ${stats.totalInvites}`,
				`👥 *Membros participantes:* ${stats.totalMembers}`,
				`🕐 *Atualizado em:* ${escapeMarkdown(lastUpdateDate)}`,
				``,
				`_Use /mylink para obter seu link e entrar no ranking\\!_`,
			].join('\n');
			await ctx.replyWithMarkdownV2(message);
		} catch (err) {
			logger.error(`Erro ao gerar ranking para ${userId}: ${err.message}`);
			await ctx.reply('❌ Erro ao carregar o ranking. Tente novamente em instantes.');
		}
	});
}
