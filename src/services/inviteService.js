import { readData, writeData, getOrCreateMember } from '../database/database.js';
import { logger } from '../utils/logger.js';

export async function getOrCreateInviteLink(bot, userId, firstName, username, groupId) {
	const data   = await readData();
	const member = getOrCreateMember(data, userId, firstName, username);
	if (member.inviteLink) {
		logger.debug(`Link existente retornado para ${firstName} (${userId})`);
		return { link: member.inviteLink, isNew: false };
	}
	const inviteData = await bot.telegram.createChatInviteLink(groupId, {
		name:          `Convite de ${firstName}`,
		creates_join_request: false,
	});
	const link = inviteData.invite_link;
	member.inviteLink         = link;
	data.linkMap[link]        = userId;
	data.lastUpdated          = new Date().toISOString();
	await writeData(data);
	logger.success(`Novo link criado para ${firstName} (${userId}): ${link}`);
	return { link, isNew: true };
}

export async function registerNewMember({ newUserId, newFirstName, newUsername, inviteLink }) {
	if (!inviteLink) {
		logger.debug(`${newFirstName} entrou sem link rastreável (link direto ou busca).`);
		return { credited: false, ownerRecord: null };
	}
	const data    = await readData();
	const ownerId = data.linkMap[inviteLink];
	if (!ownerId) {
		logger.warn(`Link ${inviteLink} não encontrado no banco. Pode ser um link externo.`);
		return { credited: false, ownerRecord: null };
	}
	const ownerKey    = String(ownerId);
	const ownerRecord = data.members[ownerKey];
	if (!ownerRecord) {
		logger.warn(`Dono do link (userId: ${ownerId}) não encontrado nos membros.`);
		return { credited: false, ownerRecord: null };
	}
	const alreadyCounted = ownerRecord.invitedUsers.some((u) => u.userId === newUserId);
	if (alreadyCounted) {
		logger.debug(`${newFirstName} já foi contado para ${ownerRecord.firstName}. Ignorando.`);
		return { credited: false, ownerRecord };
	}
	ownerRecord.inviteCount  += 1;
	ownerRecord.lastInviteAt  = new Date().toISOString();
	ownerRecord.invitedUsers.push({
		userId:    newUserId,
		firstName: newFirstName,
		username:  newUsername || '',
		joinedAt:  new Date().toISOString(),
	});
	data.totalInvites = (data.totalInvites || 0) + 1;
	data.lastUpdated  = new Date().toISOString();
	await writeData(data);
	logger.success(
		`✅ Convite registrado: ${newFirstName} entrou via link de ${ownerRecord.firstName} ` +
		`(total: ${ownerRecord.inviteCount})`
	);
	return { credited: true, ownerRecord };
}

export async function getRanking(limit = 10) {
	const data = await readData();
	return Object.values(data.members)
		.filter((m) => m.inviteCount > 0)
		.sort((a, b) => b.inviteCount - a.inviteCount)
		.slice(0, limit);
}

export async function getMemberStats(userId) {
	const data   = await readData();
	const member = data.members[String(userId)];
	return member || null;
}

export async function getGlobalStats() {
	const data = await readData();
	return {
		totalMembers: Object.keys(data.members).length,
		totalInvites: data.totalInvites || 0,
		lastUpdated:  data.lastUpdated,
	};
}
