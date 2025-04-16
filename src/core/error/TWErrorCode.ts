export enum TWErrorCode {
	// Allgemein
	MISSING_KEY_VALUE = 'MISSING_KEY_VALUE',
	
	// Parser
	MISSING_SECTION = 'MISSING_SECTION',
	UNKNOWN_SECTION = 'UNKNOWN_SECTION',
	INVALID_TILE_SYNTAX = 'INVALID_TILE_SYNTAX',
	DUPLICATE_TILESET = 'DUPLICATE_TILESET',
	DUPLICATE_LAYER = 'DUPLICATE_LAYER',
	UNKNOWN_PROP_TYPE = 'UNKNOWN_PROP_TYPE',
	UNKNOWN_PROP_FORMAT = 'UNKNOWN_PROP_FORMAT',
	
	// Manager
	NO_CONFIG_PROVIDED = 'NO_CONFIG_PROVIDED',
	
	// SceneBuilder
	INVALID_QUERY = 'INVALID_QUERY',
	MISSING_OR_INVALID_CONFIG = 'MISSING_OR_INVALID_CONFIG',
	INVALID_TILE_CODE = 'INVALID_TILE_CODE',
	TILESET_NOT_FOUND = 'TILESET_NOT_FOUND',
	FAILED_TO_LOAD_IMAGE = 'FAILED_TO_LOAD_IMAGE',
	LAYER_ALREADY_EXISTS = 'LAYER_ALREADY_EXISTS',
	LAYER_NOT_FOUND = 'LAYER_NOT_FOUND',
	INVALID_TILE_POSITION = 'INVALID_TILE_POSITION'
}
