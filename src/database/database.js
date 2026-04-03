// Função para validar e migrar o schema dos dados
function validateAndMigrate(raw) {
	// Garante que todos os campos essenciais existem
	const base = defaultData();
	const data = { ...base, ...raw };
	data.members = data.members || {};
	data.linkMap = data.linkMap || {};
	data.version = data.version || base.version;
	data.createdAt = data.createdAt || base.createdAt;
	data.lastUpdated = data.lastUpdated || base.lastUpdated;
	data.totalInvites = typeof data.totalInvites === 'number' ? data.totalInvites : 0;
	return data;
}

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const DATA_FILE   = path.join(__dirname, 'data.json');
const BACKUP_FILE = path.join(__dirname, 'data.json.bak');

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

let isWriting = false;
const writeQueue = [];

// Função para processar a fila de escritas no banco de dados
async function processWriteQueue() {
	if (writeQueue.length === 0) {
		isWriting = false;
		return;
	}
	isWriting = true;
	const { data, resolve, reject } = writeQueue.shift();
	try {
		// Escreve em arquivo temporário
		const tmpFile = DATA_FILE + '.tmp';
		await fs.writeFile(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
		// Faz backup do arquivo atual, se existir
		try {
			await fs.copyFile(DATA_FILE, BACKUP_FILE);
		} catch {}
		// Renomeia o temporário para o arquivo principal
		await fs.rename(tmpFile, DATA_FILE);
		resolve();
	} catch (err) {
		reject(err);
	}
	processWriteQueue();
}

export async function readData() {
	try {
		await fs.access(DATA_FILE);
		const raw    = await fs.readFile(DATA_FILE, 'utf-8');
		const parsed = JSON.parse(raw);
		return validateAndMigrate(parsed);
	} catch (primaryErr) {
		logger.warn(`Falha ao ler data.json: ${primaryErr.message}. Tentando backup...`);
	}
	try {
		await fs.access(BACKUP_FILE);
		const raw    = await fs.readFile(BACKUP_FILE, 'utf-8');
		const parsed = JSON.parse(raw);
		logger.success('Dados restaurados do arquivo de backup.');
		return validateAndMigrate(parsed);
	} catch {
		logger.info('Nenhum dado anterior encontrado. Iniciando banco vazio.');
		return defaultData();
	}
}

export async function writeData(data) {
	return new Promise((resolve, reject) => {
		writeQueue.push({ data, resolve, reject });
		if (!isWriting) processWriteQueue();
	});
}

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
		data.members[key].firstName = firstName;
		data.members[key].username  = username || data.members[key].username;
	}
	return data.members[key];
}
