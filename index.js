/**
 * =============================================================
 * Telegram Ranking Bot — Ponto de entrada
 * =============================================================
 * Responsabilidade: Carregar variáveis de ambiente, validar
 * configuração e iniciar o bot.
 */

import 'dotenv/config';
import { startBot } from './src/bot.js';
import { logger } from './src/utils/logger.js';

// ── Validação de variáveis de ambiente obrigatórias ──────────
const REQUIRED_ENV = ['BOT_TOKEN', 'GROUP_ID'];

const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  logger.error(`Variáveis de ambiente ausentes: ${missing.join(', ')}`);
  logger.error('Crie o arquivo .env com base no .env.example e preencha os valores.');
  process.exit(1);
}

// ── Captura global de erros para evitar quedas silenciosas ────
process.on('unhandledRejection', (reason) => {
  logger.error(`Rejeição não tratada: ${reason}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`Exceção não capturada: ${err.message}`);
  process.exit(1);
});

// ── Inicia o bot ──────────────────────────────────────────────
(async () => {
  try {
    logger.info('🚀 Iniciando Telegram Ranking Bot...');
    await startBot();
  } catch (err) {
    logger.error(`Falha crítica ao iniciar: ${err.message}`);
    process.exit(1);
  }
})();
