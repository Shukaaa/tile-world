export interface TWMMainConfig {
	tileSize: number;
	width: number;
	height: number;
}

export interface TWMLayer {
	name: string;
	tiles: string[][];
}

export interface TWMTileset {
	id: string;
	tileset: string;
	short: string;
}

export interface TWMPropsMap {
	tilesets: Record<string, Record<string, string>>;
	layers: Record<string, Record<string, string>>;
	tiles: Record<string, Record<string, string>>;
}

export interface TWMConfig {
	main: TWMMainConfig;
	layers: TWMLayer[];
	tilesets: TWMTileset[];
	props: TWMPropsMap
}
