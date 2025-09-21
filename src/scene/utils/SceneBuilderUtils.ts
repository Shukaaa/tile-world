import {TWMConfig, TWMLayer} from "../../config/interfaces/twm-config";
import {SceneBuilderSettings} from "../interfaces/SceneBuilderSettings";
import {TileValidator} from "../../core/validator/TileValidator";
import {TWErrorCode} from "../../core/error/TWErrorCode";
import {TWErrorHandler} from "../../core/error/TWErrorHandler";
import {SceneBuilder} from "../builder/SceneBuilder";

export class SceneBuilderUtils {
	
	static createEmpty2DArray(width: number, height: number): string[][] {
		return Array.from({length: height}, () =>
				Array.from({length: width}, () => "0")
		);
	}
	
	static createGridElement(
			layer: TWMLayer,
			config: TWMConfig,
			settings: SceneBuilderSettings,
			tileSize: number,
			originalTileSize: number,
			tilePromises: Promise<void>[],
			builder: SceneBuilder
	): HTMLDivElement {
		const grid = document.createElement('div');
		grid.className = `tw-layer tw-layer--${layer.name}`;
		grid.style.display = 'grid';
		grid.style.gridTemplateColumns = `repeat(${config.main.width}, ${tileSize}px)`;
		grid.style.gridTemplateRows = `repeat(${config.main.height}, ${tileSize}px)`;
		grid.style.width = `${config.main.width * tileSize}px`;
		grid.style.height = `${config.main.height * tileSize}px`;
		grid.style.position = 'absolute';
		grid.style.top = '0';
		grid.style.left = '0';
		grid.style.imageRendering = 'pixelated';
		
		for (let y = 0; y < layer.tiles.length; y++) {
			for (let x = 0; x < layer.tiles[y].length; x++) {
				const tileCode = layer.tiles[y][x];
				const tileEl = SceneBuilderUtils.createTileElement(
						tileCode, x, y, config, settings, tileSize, originalTileSize, tilePromises, builder
				);
				grid.appendChild(tileEl);
			}
		}
		
		return grid;
	}
	
	static createTileElement(
			tileCode: string,
			x: number,
			y: number,
			config: TWMConfig,
			settings: SceneBuilderSettings,
			tileSize: number,
			originalTileSize: number,
			tilePromises: Promise<void>[],
			builder: SceneBuilder,
			displayOnlyLayer: boolean = false
	): HTMLDivElement {
		const tileEl = document.createElement('div');
		tileEl.className = 'tw-tile';
		tileEl.style.width = `${tileSize}px`;
		tileEl.style.height = `${tileSize}px`;
		tileEl.style.boxSizing = 'border-box';
		
		if (!displayOnlyLayer) {
			tileEl.onmousedown = (event: MouseEvent) => {
				const eventSubscriber = builder.eventSubscriber;
				eventSubscriber.onTileClicked.forEach((cb) => {
					cb({x, y, originalMouseEvent: event})
				})
			}
			
			if (!settings.disableDataAttributesForTiles) {
				tileEl.dataset['x'] = x.toString();
				tileEl.dataset['y'] = y.toString();
			}
		}
		
		if (settings.showDebugGrid) {
			tileEl.style.border = '1px dashed rgba(0,0,0,0.2)';
		}
		
		if (tileCode === '0') {
			tileEl.classList.add("tw-tile--hidden");
			return tileEl;
		}
		
		TileValidator.validateTileFormat(tileCode, `Tile: ${tileCode}, Pos: (${x},${y})`);
		
		const match = tileCode.match(/^([A-Za-z]+)(\d+)$/);
		if (!match) {
			TWErrorHandler.throw(
					TWErrorCode.INVALID_TILE_CODE,
					`Invalid tile code: "${tileCode}"`,
					`Tile: ${tileCode}, Pos: (${x},${y})`,
					'SceneBuilderUtils'
			);
		}
		
		const [, short, indexStr] = match;
		const index = parseInt(indexStr);
		const tileset = config.tilesets.find(ts => ts.short === short);
		
		if (!tileset) {
			TWErrorHandler.throw(
					TWErrorCode.TILESET_NOT_FOUND,
					`Tileset short "${short}" not found.`,
					`TileCode: ${tileCode}, Short: ${short}`,
					'SceneBuilderUtils'
			);
		}
		
		const img = new Image();
		img.src = tileset.tileset;
		
		const promise = new Promise<void>((resolve, reject) => {
			img.onload = () => {
				const tilesPerRow = Math.floor(img.width / originalTileSize);
				const tileX = (index % tilesPerRow) * originalTileSize;
				const tileY = Math.floor(index / tilesPerRow) * originalTileSize;
				
				tileEl.style.backgroundImage = `url(${img.src})`;
				tileEl.style.backgroundPosition = `-${tileX * settings.upscale!}px -${tileY * settings.upscale!}px`;
				tileEl.style.backgroundSize = `${img.width * settings.upscale!}px auto`;
				tileEl.style.imageRendering = 'pixelated';
				
				resolve();
			};
			
			img.onerror = () => reject(
					TWErrorHandler.throw(
							TWErrorCode.FAILED_TO_LOAD_IMAGE,
							`Failed to load tileset image "${tileset.tileset}"`,
							`Tileset: ${tileset.id}`,
							'SceneBuilderUtils'
					)
			);
		});
		
		tilePromises.push(promise);
		
		return tileEl;
	}
}
