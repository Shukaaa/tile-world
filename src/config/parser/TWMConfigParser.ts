import type {TWMConfig, TWMLayer, TWMMainConfig, TWMTileset} from '../interfaces/twm-config';
import {TWErrorHandler} from '../../core/error/TWErrorHandler';
import {TWErrorCode} from '../../core/error/TWErrorCode';
import {TileValidator} from "../../core/validator/TileValidator";

interface ParserState {
	currentSection: string;
	currentLayer: Partial<TWMLayer>;
	tempTileset: Partial<TWMTileset>;
	config: Partial<TWMConfig>;
}

export class TWMConfigParser {
	static async parseConfig(url: string): Promise<TWMConfig> {
		const response = await fetch(url);
		const raw = await response.text();
		const lines = raw.split('\n');
		
		const state: ParserState = {
			currentSection: '',
			currentLayer: {},
			tempTileset: {},
			config: {
				layers: [],
				tilesets: [],
				props: {
					tilesets: {},
					layers: {},
					tiles: {}
				}
			},
		};
		
		for (let rawLine of lines) {
			const line = rawLine.trim();
			if (!line || line.startsWith('#')) continue;
			
			if (line.startsWith('[')) {
				this.handleSectionHeader(line, state);
				continue;
			}
			
			const [keyRaw, valueRaw] = line.split('=');
			if (valueRaw === undefined) {
				TWErrorHandler.throw(TWErrorCode.MISSING_KEY_VALUE, `Expected key=value format`, line, 'Parser');
			}
			
			const key = keyRaw.trim();
			const value = valueRaw.trim();
			
			this.handleKeyValue(key, value, state);
		}
		
		// Push last layer
		if (state.currentLayer.name) {
			(state.config.layers as TWMLayer[]).push(state.currentLayer as TWMLayer);
		}
		
		if (!state.config.main) {
			TWErrorHandler.throw(TWErrorCode.MISSING_SECTION, `Missing [main] section`, undefined, 'Parser');
		}
		
		return state.config as TWMConfig;
	}
	
	private static handleSectionHeader(line: string, state: ParserState): void {
		const section = line.slice(1, -1);
		if (section === 'main') {
			state.currentSection = 'main';
		} else if (section.startsWith('tileset:')) {
			state.currentSection = 'tileset';
			state.tempTileset = { id: section.split(':')[1] };
		} else if (section.startsWith('layer:')) {
			if (state.currentLayer.name) {
				(state.config.layers as TWMLayer[]).push(state.currentLayer as TWMLayer);
			}
			state.currentSection = 'layer';
			state.currentLayer = {
				name: section.split(':')[1],
				tiles: [],
			};
		} else if (section === 'props') {
			state.currentSection = 'props';
		} else {
			TWErrorHandler.throw(TWErrorCode.UNKNOWN_SECTION, `Unknown section header: [${section}]`, line, 'Parser');
		}
	}
	
	private static handleKeyValue(key: string, value: string, state: ParserState): void {
		switch (state.currentSection) {
			case 'main':
				this.handleMain(key, value, state.config);
				break;
			case 'tileset':
				this.handleTileset(key, value, state);
				break;
			case 'layer':
				this.handleLayer(key, value, state);
				break;
			case 'props':
				this.handleProps(key, value, state);
				break;
			default:
				TWErrorHandler.throw(TWErrorCode.UNKNOWN_SECTION, `Unhandled section "${state.currentSection}"`, key, 'Parser');
		}
	}
	
	private static handleMain(key: string, value: string, config: Partial<TWMConfig>): void {
		if (!config.main) config.main = {} as TWMMainConfig;
		if (!['tileSize', 'width', 'height'].includes(key)) {
			TWErrorHandler.throw(TWErrorCode.MISSING_KEY_VALUE, `Unknown main property "${key}"`, key, 'Parser');
		}
		(config.main as any)[key] = Number(value);
	}
	
	private static handleTileset(key: string, value: string, state: ParserState): void {
		if (key === 'tileset') state.tempTileset.tileset = value;
		else if (key === 'short') state.tempTileset.short = value;
		
		if (state.tempTileset.id && state.tempTileset.tileset && state.tempTileset.short) {
			const existsWithShort = state.config.tilesets?.find(ts => ts.short === state.tempTileset.short);
			if (existsWithShort) {
				TWErrorHandler.throw(TWErrorCode.DUPLICATE_TILESET, `Duplicate tileset short "${state.tempTileset.short}"`, value, 'Parser');
			}
			
			const existWithId = state.config.tilesets?.find(ts => ts.id === state.tempTileset.id);
			if (existWithId) {
				TWErrorHandler.throw(TWErrorCode.DUPLICATE_TILESET, `Duplicate tileset id "${state.tempTileset.id}"`, value, 'Parser');
			}
			
			(state.config.tilesets as TWMTileset[]).push(state.tempTileset as TWMTileset);
			state.tempTileset = {};
		}
	}
	
	private static handleLayer(key: string, value: string, state: ParserState): void {
		if (!state.currentLayer.tiles) {
			state.currentLayer.tiles = [];
		}
		
		if (key === 'tiles') {
			const tileExists = state.config.layers?.find(t => t.name === state.currentLayer.name)
			if (tileExists) {
				TWErrorHandler.throw(TWErrorCode.DUPLICATE_LAYER, `Duplicate layer name "${state.currentLayer.name}"`, value, 'Parser');
			}
			
			const rows = value.split(';').map(r => r.trim()).filter(Boolean);
			state.currentLayer.tiles = rows.map(row =>
					row.split(',').map(cell => {
						const trimmed = cell.trim();
						TileValidator.validateTileFormat(trimmed, row);
						return trimmed;
					})
			);
		}
	}
	
	private static handleProps(key: string, value: string, state: ParserState): void {
		const parts = key.split('.');
		if (parts.length < 3) {
			TWErrorHandler.throw(TWErrorCode.UNKNOWN_PROP_FORMAT, `Invalid props key format`, key, 'Parser');
		}
		
		const [type, identifier, propKey] = parts;
		
		switch (type) {
			case 'tileset':
				state.config.props!.tilesets[identifier] ??= {};
				state.config.props!.tilesets[identifier][propKey] = value;
				break;
			
			case 'layer':
				state.config.props!.layers[identifier] ??= {};
				state.config.props!.layers[identifier][propKey] = value;
				break;
			
			case 'tile':
				state.config.props!.tiles[identifier] ??= {};
				state.config.props!.tiles[identifier][propKey] = value;
				break;
			
			default:
				TWErrorHandler.throw(TWErrorCode.UNKNOWN_PROP_TYPE, `Unknown props type "${type}"`, key, 'Parser');
		}
	}
}
