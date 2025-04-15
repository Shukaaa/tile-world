export class TWError extends Error {
	code: string;
	context?: string;
	component?: string;
	
	constructor(code: string, message: string, context?: string, component?: string) {
		super(`[${code}] ${message}`);
		this.name = 'TWError';
		this.code = code;
		this.context = context;
		this.component = component;
	}
}
