import { Telegraf } from 'telegraf';
import { message }  from 'telegraf/filters';

import { registerStartCommand }   from './commands/start.js';
import { registerMyLinkCommand }  from './commands/mylink.js';
import { registerRankingCommand } from './commands/ranking.js';
import { registerMeCommand }      from './commands/me.js';

import { registerClearCommand }   from './commands/clear.js';
import { registerNewMember }      from './services/inviteService.js';
import { logger }                 from './utils/logger.js';

export async function startBot() {
	const token   = process.env.BOT_TOKEN;
	const groupId = process.env.GROUP_ID;

	const bot = new Telegraf(token);

	bot.use(async (ctx, next) => {
		const type = ctx.updateType;
		const from = ctx.from
			? `${ctx.from.first_name} (${ctx.from.id})`
			: 'desconhecido';
		logger.debug(`Update recebido: ${type} | De: ${from}`);
		await next();
	});

	bot.catch((err, ctx) => {
		logger.error(`Erro não tratado no update ${ctx.updateType}: ${err.message}`);
	});

	registerStartCommand(bot);
	registerMyLinkCommand(bot, groupId);
	registerRankingCommand(bot);
	registerMeCommand(bot);
	registerClearCommand(bot, groupId);

	bot.on('chat_member', async (ctx) => {
		try {
			const update    = ctx.chatMemberUpdated || ctx.update.chat_member;
			const newMember = update?.new_chat_member;
			const oldMember = update?.old_chat_member;
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
			if (credited && ownerRecord) {
				try {
					const inviteWord = ownerRecord.inviteCount === 1 ? 'convite' : 'convites';
					await bot.telegram.sendMessage(
						ownerRecord.userId,
						`🎉 *${user.first_name}* entrou no grupo usando seu link\!\n\n` +
						`📨 Você agora tem *${ownerRecord.inviteCount} ${inviteWord}* \— ` +
						`use /ranking para ver sua posição\\.`,
						{ parse_mode: 'MarkdownV2' }
					);
				} catch {
					logger.debug(`Não foi possível notificar ${ownerRecord.userId} sobre novo convite.`);
				}
			}
		} catch (err) {
			logger.error(`Erro ao processar chat_member: ${err.message}`);
		}
	});

	bot.on(message('new_chat_members'), async (ctx) => {
		try {
			for (const user of ctx.message.new_chat_members) {
				logger.debug(
					`new_chat_members: ${user.first_name} (${user.id}) — sem link rastreável neste evento.`
				);
			}
		} catch (err) {
			logger.error(`Erro em new_chat_members: ${err.message}`);
		}
	});

	await bot.launch({
		allowedUpdates: ['message', 'chat_member', 'my_chat_member'],
		dropPendingUpdates: true,
	});

	const botInfo = await bot.telegram.getMe();
	logger.success(`Bot iniciado: @${botInfo.username} (ID: ${botInfo.id})`);
	logger.info(`Monitorando grupo: ${groupId}`);
	logger.info('Pressione Ctrl+C para encerrar.');

	process.once('SIGINT',  () => {
		logger.warn('Recebido SIGINT — encerrando bot...');
		bot.stop('SIGINT');
	});
	process.once('SIGTERM', () => {
		logger.warn('Recebido SIGTERM — encerrando bot...');
		bot.stop('SIGTERM');
	});
}
