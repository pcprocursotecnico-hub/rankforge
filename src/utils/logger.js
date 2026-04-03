import chalk from 'chalk';

function timestamp() {
	return chalk.gray(`[${new Date().toLocaleTimeString('pt-BR')}]`);
}
export const logger = {
	info(msg) {
		console.log(`${timestamp()} ${chalk.cyan('ℹ INFO ')}  ${chalk.white(msg)}`);
	},
	success(msg) {
		console.log(`${timestamp()} ${chalk.green('✔ OK   ')}  ${chalk.green(msg)}`);
	},
	warn(msg) {
		console.log(`${timestamp()} ${chalk.yellow('⚠ WARN ')}  ${chalk.yellow(msg)}`);
	},
	error(msg) {
		console.error(`${timestamp()} ${chalk.red('✖ ERR  ')}  ${chalk.red(msg)}`);
	},
	debug(msg) {
		if (process.env.NODE_ENV === 'development') {
			console.log(`${timestamp()} ${chalk.magenta('⚙ DBG  ')}  ${chalk.magenta(msg)}`);
		}
	},
	event(event, detail) {
		console.log(
			`${timestamp()} ${chalk.blue('◈ EVT  ')}  ${chalk.blue(event)} ${chalk.gray('→')} ${chalk.white(detail)}`
		);
	},
};
