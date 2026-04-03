/**
 * =============================================================
 * database.js — Camada de persistência de dados
 * =============================================================
 * Responsabilidade: Leitura e escrita segura dos dados em JSON,
 * com escrita atômica, backup automático e migração de schema.
 *
 * Padrão usado: Write-through atômico
 *   1. Escreve em arquivo .tmp
 *   2. Cria backup .bak do arquivo atual
 *   3. Substitui atomicamente via rename()
 * Isso garante que o JSON nunca fique corrompido caso o processo
 * seja interrompido durante uma escrita.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const DATA_FILE   = path.join(__dirname, 'data.json');
const BACKUP_FILE = path.join(__dirname, 'data.json.bak');

// ── Estrutura padrão do banco ─────────────────────────────────
/**
 * @typedef {object} InvitedUser
 * @property {number} userId
 * @property {string} firstName
 * @property {string} username
 * @property {string} joinedAt  - ISO string
 */

/**
 * @typedef {object} MemberRecord
 * @property {number}       userId
 * @property {string}       firstName
 * @property {string}       username
 * @property {string|null}  inviteLink   - Link único gerado pelo bot
 * @property {number}       inviteCount  - Total de pessoas convidadas
 * @property {InvitedUser[]} invitedUsers
 * @property {string}       createdAt
 * @property {string|null}  lastInviteAt
 */

/**
 * @typedef {object} DatabaseSchema
 * @property {string}                  version
 * @property {string}                  createdAt
 * @property {string}                  lastUpdated
 * @property {number}                  totalInvites
 * @property {Record<string, MemberRecord>} members  - chave: userId como string
 * @property {Record<string, number>}  linkMap        - inviteLink → userId
 */

/** @returns {DatabaseSchema} */
function defaultData() {
  return {
    version:      '1.0.0',
    createdAt:    new Date().toISOString(),
    lastUpdated:  new Date().toISOString(),
    totalInvites: 0,
    members:      {},
    linkMap:      {},
  };
}

// ── Controle de concorrência (fila de escritas) ───────────────
let isWriting = false;
/** @type {Array<{data: DatabaseSchema, resolve: Function, reject: Function}>} */
const writeQueue = [];

// ── API Pública ───────────────────────────────────────────────

/**
 * Lê os dados do arquivo JSON.
 * Em caso de falha no arquivo principal, tenta o backup.
 * Se ambos falharem, retorna estrutura padrão vazia.
 *
 * @returns {Promise<DatabaseSchema>}
 */
export async function readData() {
  // Tenta arquivo principal
  try {
    await fs.access(DATA_FILE);
    const raw    = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return validateAndMigrate(parsed);
  } catch (primaryErr) {
    logger.warn(`Falha ao ler data.json: ${primaryErr.message}. Tentando backup...`);
  }

  // Tenta backup
  try {
    await fs.access(BACKUP_FILE);
    const raw    = await fs.readFile(BACKUP_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
  // Arquivo removido. Usar apenas src/database/database.js
    return validateAndMigrate(parsed);
  } catch {
    logger.info('Nenhum dado anterior encontrado. Iniciando banco vazio.');
    return defaultData();
  }
}

/**
 * Persiste os dados de forma atômica e enfileirada.
 * Garante que escritas simultâneas não corrompam o arquivo.
 *
 * @param {DatabaseSchema} data
 * @returns {Promise<void>}
 */
export async function writeData(data) {
  return new Promise((resolve, reject) => {
    writeQueue.push({ data, resolve, reject });
    if (!isWriting) processWriteQueue();
  });
}

/**
 * Retorna o registro de um membro, criando-o se não existir.
 * Padrão "upsert" para simplificar o código dos serviços.
 *
 * @param {DatabaseSchema} data
 * @param {number} userId
 * @param {string} firstName
 * @param {string} [username]
 * @returns {MemberRecord}
 */
export function getOrCreateMember(data, userId, firstName, username = '') {
  const key = String(userId);

  if (!data.members[key]) {
    data.members[key] = {
      userId,
      firstName,
      username:     username || '',
      inviteLink:   null,
      inviteCount:  0,
      invitedUsers: [],
      createdAt:    new Date().toISOString(),
      lastInviteAt: null,
    };
    logger.debug(`Novo membro registrado: ${firstName} (${userId})`);
  } else {
    // Atualiza nome/username caso tenham mudado
    data.members[key].firstName = firstName;
    data.members[key].username  = username || data.members[key].username;
  }

  return data.members[key];
}

// ── Internos ──────────────────────────────────────────────────

/** Processa a fila de escritas sequencialmente. */
async function processWriteQueue() {
  if (writeQueue.length === 0) {
    isWriting = false;
    return;
  }

  isWriting = true;
  const { data, resolve, reject } = writeQueue.shift();

  try {
    const json     = JSON.stringify(data, null, 2);
    const tempFile = DATA_FILE + '.tmp';

    await fs.writeFile(tempFile, json, 'utf-8');

    // Cria backup do arquivo atual (se existir)
    try {
      await fs.access(DATA_FILE);
      await fs.copyFile(DATA_FILE, BACKUP_FILE);
    } catch {
      // Arquivo principal ainda não existe — tudo bem
    }

    // Substitui atomicamente
    await fs.rename(tempFile, DATA_FILE);
    resolve();
  } catch (err) {
    logger.error(`Falha ao persistir dados: ${err.message}`);
    reject(err);
  } finally {
    processWriteQueue();
  }
}

/**
 * Garante que os dados carregados têm todos os campos esperados.
 * Funciona como migração automática de schema entre versões.
 *
 * @param {any} raw
 * @returns {DatabaseSchema}
 */
function validateAndMigrate(raw) {
  const base = defaultData();

  const validated = {
    ...base,
    ...raw,
    members: raw.members || {},
    linkMap: raw.linkMap  || {},
  };

  // Migra cada membro para garantir campos obrigatórios
  for (const [key, member] of Object.entries(validated.members)) {
    if (typeof member !== 'object' || member === null) {
      delete validated.members[key];
      continue;
    }

    validated.members[key] = {
      userId:       member.userId       ?? Number(key),
      firstName:    member.firstName    ?? 'Desconhecido',
      username:     member.username     ?? '',
      inviteLink:   member.inviteLink   ?? null,
      inviteCount:  member.inviteCount  ?? 0,
      invitedUsers: Array.isArray(member.invitedUsers) ? member.invitedUsers : [],
      createdAt:    member.createdAt    ?? new Date().toISOString(),
      lastInviteAt: member.lastInviteAt ?? null,
    };
  }

  return validated;
}
