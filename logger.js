// Arquivo movido para src/utils/logger.js

// O código abaixo foi removido da raiz.

/**
 * =============================================================
 * logger.js — Sistema de logging colorido
 * =============================================================
 * Responsabilidade: Prover logs formatados e coloridos para
 * facilitar o monitoramento do bot em produção.
 */

import chalk from 'chalk';

/**
 * Retorna o timestamp atual formatado para exibição.
 * @returns {string} Ex: [14:32:07]
 */
function timestamp() {
  return chalk.gray(`[${new Date().toLocaleTimeString('pt-BR')}]`);
}

/**
 * Logger com quatro níveis: info, success, warn, error e debug.
 * debug só aparece quando NODE_ENV=development.
 */
export const logger = {
  /**
   * Informações gerais sobre o estado do sistema.
   * @param {string} msg
   */
  info(msg) {
    console.log(`${timestamp()} ${chalk.cyan('ℹ INFO ')}  ${chalk.white(msg)}`);
  },

  /**
   * Operação concluída com sucesso.
   * @param {string} msg
   */
  success(msg) {
    console.log(`${timestamp()} ${chalk.green('✔ OK   ')}  ${chalk.green(msg)}`);
  },

  /**
   * Situação que merece atenção mas não é um erro.
   * @param {string} msg
   */
  warn(msg) {
    console.log(`${timestamp()} ${chalk.yellow('⚠ WARN ')}  ${chalk.yellow(msg)}`);
  },

  /**
   * Erros e falhas que precisam de ação.
   * @param {string} msg
   */
  error(msg) {
    console.error(`${timestamp()} ${chalk.red('✖ ERR  ')}  ${chalk.red(msg)}`);
  },

  /**
   * Informações detalhadas para desenvolvimento.
   * Só exibe quando NODE_ENV=development.
   * @param {string} msg
   */
  debug(msg) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${timestamp()} ${chalk.magenta('⚙ DBG  ')}  ${chalk.magenta(msg)}`);
    }
  },

  /**
   * Log de evento do Telegram (comandos, mensagens, etc.)
   * @param {string} event - Nome do evento
   * @param {string} detail - Detalhes adicionais
   */
  event(event, detail) {
    console.log(
      `${timestamp()} ${chalk.blue('◈ EVT  ')}  ${chalk.blue(event)} ${chalk.gray('→')} ${chalk.white(detail)}`
    );
  },
};
