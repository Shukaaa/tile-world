import { TWError } from './TWError';
import { TWErrorCode } from './TWErrorCode';

export class TWErrorHandler {
	static throw(
			code: TWErrorCode,
			message: string,
			context?: string,
			component?: string
	): never {
		const error = new TWError(code, message, context, component);
		this.log(error);
		throw error;
	}
	
	static log(error: TWError) {
		console.group(`%c❌ TW Error`, 'color: red; font-weight: bold;');
		console.error(`%cCode: %s`, 'font-weight: bold;', error.code);
		console.error(`%cMessage: %s`, 'font-weight: bold;', error.message);
		if (error.component) {
			console.error(`%cComponent: %s`, 'font-weight: bold;', error.component);
		}
		if (error.context) {
			console.error(`%cContext: %s`, 'font-weight: bold;', error.context);
		}
		console.groupEnd();
	}
}
