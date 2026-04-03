import { getMemberStats, getRanking } from '../services/inviteService.js';
import { escapeMarkdown } from './start.js';
import { logger } from '../utils/logger.js';

const PODIUM = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function registerMeCommand(bot) {
	bot.command('me', async (ctx) => {
		const { id: userId, first_name: firstName, username } = ctx.from;
		logger.event('/me', `${firstName} (${userId})`);
		try {
			const [member, ranking] = await Promise.all([
				getMemberStats(userId),
				getRanking(100),
			]);
			const displayName = escapeMarkdown(firstName || 'você');
			if (!member) {
				await ctx.replyWithMarkdownV2(
					`📊 *Suas Estatísticas*\n\n` +
					`Olá, *${displayName}*\\!\n\n` +
					`Você ainda não está registrado\\.\n\n` +
					`_Use /mylink para gerar seu link exclusivo e começar a convidar\\! 🚀_`
				);
				return;
			}
			if (member.inviteCount === 0) {
				const hasLink = !!member.inviteLink;
				const linkStatus = hasLink
					? `✅ Você já tem um link\\! Use /mylink para vê\\-lo\\.`
					: `_Use /mylink para gerar seu link e começar\\!_`;
				await ctx.replyWithMarkdownV2(
					`📊 *Suas Estatísticas*\n\n` +
					`Olá, *${displayName}*\\!\n\n` +
					`Você ainda não tem convites registrados\\.\n\n` +
					`${linkStatus}`
				);
				return;
			}
			const position    = ranking.findIndex((m) => m.userId === userId) + 1;
			const posEmoji    = PODIUM[position] || `\\#${position}`;
			const inviteWord  = member.inviteCount === 1 ? 'convite' : 'convites';
			const firstInviteDate = member.createdAt
				? new Date(member.createdAt).toLocaleDateString('pt-BR')
				: 'N/A';
			const recentInvitees = (member.invitedUsers || [])
				.slice(-5)
				.reverse()
				.map((u) => {
					const name = escapeMarkdown(u.firstName || 'Desconhecido');
					const tag  = u.username ? ` \\(@${escapeMarkdown(u.username)}\\)` : '';
					return `  • ${name}${tag}`;
				})
				.join('\n');
			const usernameDisplay = username
				? ` \\(@${escapeMarkdown(username)}\\)`
				: '';
			const message = [
				`📊 *Suas Estatísticas*`,
				``,
				`👤 *${displayName}*${usernameDisplay}`,
				`🏅 *Posição no ranking:* ${posEmoji}`,
				`📨 *Total de convites:* ${member.inviteCount} ${inviteWord}`,
				`📅 *Membro desde:* ${escapeMarkdown(firstInviteDate)}`,
				member.inviteLink
					? `🔗 *Tem link:* ✅`
					: `🔗 *Tem link:* ❌ _Use /mylink_`,
				recentInvitees
					? `\n👥 *Últimos convidados:*\n${recentInvitees}`
					: '',
				``,
				`_Use /ranking para ver o placar completo\\._`,
			]
				.filter((line) => line !== '')
				.join('\n');
			await ctx.replyWithMarkdownV2(message);
		} catch (err) {
			logger.error(`Erro no /me para ${userId}: ${err.message}`);
			await ctx.reply('❌ Erro ao carregar suas estatísticas. Tente novamente.');
		}
	});
}
