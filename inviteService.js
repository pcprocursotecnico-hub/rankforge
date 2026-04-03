/**
 * =============================================================
 * inviteService.js — Lógica de negócio para convites
 * =============================================================
 * Responsabilidade: Gerar links únicos, rastrear entradas via
 * link e fornecer dados para o ranking.
 *
 * Esta camada NÃO interage com o Telegram diretamente —
 * recebe dados já extraídos dos handlers de comando.
 */

import { readData, writeData, getOrCreateMember } from '../database/database.js';
import { logger } from '../utils/logger.js';

// ── Geração de Links ──────────────────────────────────────────

/**
 * Obtém o link de convite existente de um usuário ou cria um novo
 * via API do Telegram e o persiste no banco.
 *
 * @param {import('telegraf').Telegraf} bot  - Instância do bot
 * @param {number} userId     - ID do usuário solicitante
 * @param {string} firstName  - Nome do usuário
 * @param {string} username   - @username (pode ser vazio)
 * @param {string} groupId    - ID do grupo alvo
 * @returns {Promise<{link: string, isNew: boolean}>}
 */
export async function getOrCreateInviteLink(bot, userId, firstName, username, groupId) {
  const data   = await readData();
  const member = getOrCreateMember(data, userId, firstName, username);

  // Retorna link existente se já tiver um
  if (member.inviteLink) {
    logger.debug(`Link existente retornado para ${firstName} (${userId})`);
    return { link: member.inviteLink, isNew: false };
  }

  // Cria um novo link de convite único via API do Telegram
  // createChatInviteLink permite rastrear qual link foi usado
  const inviteData = await bot.telegram.createChatInviteLink(groupId, {
    name:          `Convite de ${firstName}`,   // Nome visível no painel do grupo
    creates_join_request: false,                 // Aceita diretamente, sem aprovação
    // member_limit: 0 = sem limite de usos (padrão)
  });

  const link = inviteData.invite_link;

  // Persiste o link no banco
  member.inviteLink         = link;
  data.linkMap[link]        = userId;  // Índice reverso: link → userId
  data.lastUpdated          = new Date().toISOString();

  await writeData(data);

  logger.success(`Novo link criado para ${firstName} (${userId}): ${link}`);
  return { link, isNew: true };
}

// ── Rastreamento de Entradas ──────────────────────────────────

/**
 * Registra a entrada de um novo membro via link de convite.
 * Identifica o dono do link e incrementa seu contador.
 *
 * Chamada a partir do listener de chat_member/new_chat_members.
 *
 * @param {object} params
 * @param {number} params.newUserId     - ID de quem entrou
 * @param {string} params.newFirstName  - Nome de quem entrou
 * @param {string} params.newUsername   - @username de quem entrou
 * @param {string} params.inviteLink    - Link que foi usado (pode ser null)
 * @returns {Promise<{credited: boolean, ownerRecord: import('../database/database.js').MemberRecord|null}>}
 */
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

  // Evita contar a mesma pessoa duas vezes (ex: saiu e entrou de novo)
  const alreadyCounted = ownerRecord.invitedUsers.some((u) => u.userId === newUserId);
  if (alreadyCounted) {
    logger.debug(`${newFirstName} já foi contado para ${ownerRecord.firstName}. Ignorando.`);
    return { credited: false, ownerRecord };
  }

  // Incrementa o contador e registra o convidado
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

// ── Consultas ─────────────────────────────────────────────────

/**
 * Retorna o ranking dos membros com mais convites.
 * Ordenado de forma decrescente.
 *
 * @param {number} [limit=10] - Máximo de posições a retornar
 * @returns {Promise<import('../database/database.js').MemberRecord[]>}
 */
export async function getRanking(limit = 10) {
  const data = await readData();

  return Object.values(data.members)
    .filter((m) => m.inviteCount > 0)
    .sort((a, b) => b.inviteCount - a.inviteCount)
    .slice(0, limit);
}

/**
 * Retorna os dados de um membro específico.
 *
 * @param {number} userId
 * @returns {Promise<import('../database/database.js').MemberRecord|null>}
 */
export async function getMemberStats(userId) {
  const data   = await readData();
  const member = data.members[String(userId)];
  return member || null;
}

/**
 * Retorna estatísticas globais do sistema.
 *
 * @returns {Promise<{totalMembers: number, totalInvites: number, lastUpdated: string}>}
 */
export async function getGlobalStats() {
  const data = await readData();

  return {
    totalMembers: Object.keys(data.members).length,
    totalInvites: data.totalInvites || 0,
    lastUpdated:  data.lastUpdated,
  };
}
