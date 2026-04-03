/**
 * =============================================================
 * me.js — Handler do comando /me
 * =============================================================
 * Responsabilidade: Exibir as estatísticas pessoais do usuário
 * que enviou o comando — posição no ranking, contagem de
 * convites e lista dos últimos convidados.
 */

import { getMemberStats, getRanking } from '../services/inviteService.js';
import { escapeMarkdown } from './start.js';
import { logger } from '../utils/logger.js';

// Emojis para as 3 primeiras posições
const PODIUM = { 1: '🥇', 2: '🥈', 3: '🥉' };

/**
 * Registra o handler de /me no bot.
 *
 * @param {import('telegraf').Telegraf} bot
 */
export function registerMeCommand(bot) {
  bot.command('me', async (ctx) => {
    const { id: userId, first_name: firstName, username } = ctx.from;

    logger.event('/me', `${firstName} (${userId})`);

    try {
      const [member, ranking] = await Promise.all([
        getMemberStats(userId),
        getRanking(100), // Busca mais entradas para calcular a posição correta
      ]);

      const displayName = escapeMarkdown(firstName || 'você');

      // Usuário sem registro ainda
      if (!member) {
        await ctx.replyWithMarkdownV2(
          `📊 *Suas Estatísticas*\n\n` +
          `Olá, *${displayName}*\\!\n\n` +
          `Você ainda não está registrado\\.\n\n` +
          `_Use /mylink para gerar seu link exclusivo e começar a convidar\\! 🚀_`
        );
        return;
      }

      // Usuário registrado mas sem convites ainda
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

      // Calcula a posição no ranking
      const position    = ranking.findIndex((m) => m.userId === userId) + 1;
      const posEmoji    = PODIUM[position] || `\\#${position}`;
      const inviteWord  = member.inviteCount === 1 ? 'convite' : 'convites';

      // Formata a data do primeiro convite
      const firstInviteDate = member.createdAt
        ? new Date(member.createdAt).toLocaleDateString('pt-BR')
        : 'N/A';

      // Lista os últimos 5 convidados (mais recentes primeiro)
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
