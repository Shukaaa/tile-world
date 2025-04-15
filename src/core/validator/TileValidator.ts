import {TWErrorHandler} from "../error/TWErrorHandler";
import {TWErrorCode} from "../error/TWErrorCode";

export class TileValidator {
	static validateTileFormat(tile: string, context: string): void {
		const trimmed = tile.trim();
		
		if (trimmed === '0') return;
		
		if (!/^[A-Za-z]+\d+$/.test(trimmed)) {
			TWErrorHandler.throw(
					TWErrorCode.INVALID_TILE_SYNTAX,
					`Invalid tile format: "${trimmed}". Expected like G0 or S1 or 0 for empty tiles.`,
					context,
					'TileValidator'
			);
		}
	}
}
