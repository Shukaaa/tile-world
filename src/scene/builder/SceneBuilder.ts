import { TWMConfig, TWMLayer } from "../../config/interfaces/twm-config";
import { SceneBuilderSettings } from "../interfaces/SceneBuilderSettings";
import { TWErrorHandler } from "../../core/error/TWErrorHandler";
import { TWErrorCode } from "../../core/error/TWErrorCode";
import { TileValidator } from "../../core/validator/TileValidator";
import { SceneBuilderUtils } from "../utils/SceneBuilderUtils";
import {
	OnTileClickedCallbackFn,
	OnTileHoverCallbackFn,
	OnTileHoverEndCallbackFn,
	SceneEventSubscriber
} from "../interfaces/SceneBuilderEvent";
import {TileMetadata} from "../interfaces/TileMetadata";
import {TileConfig} from "../interfaces/TileConfig";

const emptyEventSubscriber: SceneEventSubscriber = {
	onTileClicked: [],
	onTileHover: [],
	onTileHoverEnd: []
};

/**
 * SceneBuilder is responsible for constructing and managing a tile-based scene.
 * It handles layers, tiles, settings, and user interactions within a specified container.
 *
 * @class SceneBuilder
 */
export class SceneBuilder {
	private container: HTMLElement;
	private readonly config: TWMConfig;
	private settings: SceneBuilderSettings;
	
	private hiddenLayers: string[] = [];
	private runtimeLayers: TWMLayer[] = [];
	eventSubscriber: SceneEventSubscriber = emptyEventSubscriber
	
	/**
	 * Creates an instance of SceneBuilder.
	 *
	 * @constructor
	 * @param {string} selector - CSS selector for the container element.
	 * @param {TWMConfig} config - Configuration object for the scene.
	 * @param {SceneBuilderSettings} settings - Settings for scene behavior and appearance.
	 * @throws {TWErrorCode.INVALID_QUERY} If the selector does not match any element.
	 * @throws {TWErrorCode.MISSING_OR_INVALID_CONFIG} If the configuration is invalid or incomplete.
	 */
	constructor(selector: string, config: TWMConfig, settings: SceneBuilderSettings) {
		const el = document.querySelector(selector);
		if (!el) {
			TWErrorHandler.throw(
					TWErrorCode.INVALID_QUERY,
					`Invalid query with selector: "${selector}". No element found.`,
					`selector: ${selector}`,
					'SceneBuilder'
			);
		}
		
		if (!config || !config.layers || !config.main || !config.tilesets) {
			TWErrorHandler.throw(
					TWErrorCode.MISSING_OR_INVALID_CONFIG,
					'Invalid or missing configuration. Configuration values are required for the SceneBuilder.',
					JSON.stringify(config),
					'SceneBuilder'
			);
		}
		
		this.container = el as HTMLElement;
		this.config = config;
		this.settings = {
			showDebugGrid: false,
			upscale: 1,
			disableDataAttributesForTiles: false,
			...settings,
		};
		
		this.buildScene();
	}
	
	// === Settings ===
	/**
	 * Updates the scene's settings with new values. It does not rerender automatically.
	 *
	 * @public
	 * @param {Partial<SceneBuilderSettings>} newSettings - Partial settings to update.
	 * @returns {void}
	 */
	public changeSettings(newSettings: Partial<SceneBuilderSettings>): void {
		this.settings = { ...this.settings, ...newSettings };
	}
	
	// === Layer Handling ===
	/**
	 * Checks if a layer is currently hidden.
	 *
	 * @public
	 * @param {string} layerName - Name of the layer to check.
	 * @returns {boolean} True if the layer is hidden; otherwise, false.
	 */
	public isLayerHidden(layerName: string): boolean {
		return this.hiddenLayers.includes(layerName);
	}
	
	/**
	 * Hides a specified layer from view.
	 *
	 * @public
	 * @param {string} layerName - Name of the layer to hide.
	 * @returns {void}
	 */
	public hideLayer(layerName: string): void {
		if (!this.isLayerHidden(layerName)) {
			this.hiddenLayers.push(layerName);
			const el = this.container.querySelector(`.tw-layer--${layerName}`) as HTMLElement;
			if (el) el.style.display = 'none';
		}
	}
	
	/**
	 * Shows a specified hidden layer.
	 *
	 * @public
	 * @param {string} layerName - Name of the layer to show.
	 * @returns {void}
	 */
	public showLayer(layerName: string): void {
		if (this.isLayerHidden(layerName)) {
			this.hiddenLayers = this.hiddenLayers.filter(name => name !== layerName);
			const el = this.container.querySelector(`.tw-layer--${layerName}`) as HTMLElement;
			if (el) el.style.display = 'grid';
		}
	}
	
	/**
	 * Toggles the visibility of a layer.
	 *
	 * @public
	 * @param {string} layerName - Name of the layer to toggle.
	 * @returns {void}
	 */
	public toggleLayer(layerName: string): void {
		this.isLayerHidden(layerName) ? this.showLayer(layerName) : this.hideLayer(layerName);
	}
	
	/**
	 * Creates a new runtime layer with the given name.
	 * This does not trigger a rerender automatically.
	 * However, the layer usually renders after adding at least one tile,
	 * since the `addTile` method triggers an automatic layer rerender.
	 *
	 * @public
	 * @param {string} layerName - Name of the new layer.
	 * @throws {TWErrorCode.LAYER_ALREADY_EXISTS} If a layer with the same name already exists.
	 * @returns {void}
	 */
	public createRuntimeLayer(layerName: string): void {
		const exists = this.config.layers.some(l => l.name === layerName)
				|| this.runtimeLayers.some(l => l.name === layerName);
		
		if (exists) {
			TWErrorHandler.throw(
					TWErrorCode.LAYER_ALREADY_EXISTS,
					`Layer with name "${layerName}" already exists.`,
					`layerName: ${layerName}`,
					'SceneBuilder'
			);
		}
		
		const tiles = SceneBuilderUtils.createEmpty2DArray(this.config.main.width, this.config.main.height);
		this.runtimeLayers.push({ name: layerName, tiles });
		this.addRuntimeLayerToDOM(layerName)
	}
	
	// === Tile Handling ===
	/**
	 * Adds a tile to a specified layer at given coordinates. It automatically rerender the layer.
	 *
	 * @public
	 * @param {string} layerName - Name of the layer.
	 * @param {number} x - X-coordinate of the tile.
	 * @param {number} y - Y-coordinate of the tile.
	 * @param {string} tileCode - Code representing the tile.
	 * @param additionalConfig - Optional additional configuration for the tile.
	 * @throws {TWErrorCode.LAYER_NOT_FOUND} If the specified layer does not exist.
	 * @throws {TWErrorCode.INVALID_TILE_POSITION} If the coordinates are out of bounds.
	 * @returns {void}
	 */
	public addTile(layerName: string, x: number, y: number, tileCode: string, additionalConfig: TileConfig | null): void {
		TileValidator.validateTileFormat(tileCode, `addTile: ${tileCode} @ (${x},${y})`);
		const layer = this.runtimeLayers.find(l => l.name === layerName);
		
		if (!layer) {
			TWErrorHandler.throw(
					TWErrorCode.LAYER_NOT_FOUND,
					`Layer "${layerName}" does not exist.`,
					`layerName: ${layerName}`,
					'SceneBuilder'
			);
		}
		
		const { width, height } = this.config.main;
		if (x < 0 || x >= width || y < 0 || y >= height) {
			TWErrorHandler.throw(
					TWErrorCode.INVALID_TILE_POSITION,
					`Invalid position (${x}, ${y}) for layer "${layerName}".`,
					`x: ${x}, y: ${y}, width: ${width}, height: ${height}`,
					'SceneBuilder'
			);
		}
		
		layer.tiles[y][x] = tileCode;
		this.updateTileInDOM(layerName, x, y, additionalConfig);
	}
	
	/**
	 * Remove a tile at a specified layer at given coordinates. It automatically rerender the layer.
	 *
	 * @public
	 * @param {string} layerName - Name of the layer.
	 * @param {number} x - X-coordinate of the tile.
	 * @param {number} y - Y-coordinate of the tile.
	 * @throws {TWErrorCode.LAYER_NOT_FOUND} If the specified layer does not exist.
	 * @throws {TWErrorCode.INVALID_TILE_POSITION} If the coordinates are out of bounds.
	 * @returns {void}
	 */
	public removeTile(layerName: string, x: number, y: number): void {
		const layer = this.runtimeLayers.find(l => l.name === layerName);
		
		if (!layer) {
			TWErrorHandler.throw(
					TWErrorCode.LAYER_NOT_FOUND,
					`Layer "${layerName}" does not exist.`,
					`layerName: ${layerName}`,
					'SceneBuilder'
			);
		}
		
		const { width, height } = this.config.main;
		if (x < 0 || x >= width || y < 0 || y >= height) {
			TWErrorHandler.throw(
					TWErrorCode.INVALID_TILE_POSITION,
					`Invalid position (${x}, ${y}) for layer "${layerName}".`,
					`x: ${x}, y: ${y}, width: ${width}, height: ${height}`,
					'SceneBuilder'
			);
		}
		
		layer.tiles[y][x] = "0";
		this.updateTileInDOM(layerName, x, y, null);
	}
	
	/**
	 * Rebuilds the entire scene from scratch.
	 * Useful when critical settings have changed.
	 * **⚠ This is performance-intensive — only use when absolutely necessary.**
	 *
	 * @public
	 * @returns {void}
	 */
	public refresh(): void {
		this.buildScene();
	}
	
	// === Events ===
	
	/**
	 * Subscribes a callback function to the tile clicked event.
	 *
	 * @public
	 * @param {OnTileClickedCallbackFn} cb - Callback function to invoke when a tile is clicked.
	 * @returns {void}
	 */
	public onTileClickedEvent(cb: OnTileClickedCallbackFn): void {
		this.eventSubscriber.onTileClicked.push(cb);
	}
	
	/**
	 * Subscribes a callback function to the tile hover event.
	 *
	 * @public
	 * @param {OnTileHoverCallbackFn} cb - Callback function to invoke when a tile is hovered.
	 * @returns {void}
	 */
	public onTileHoverEvent(cb: OnTileHoverCallbackFn): void {
		this.eventSubscriber.onTileHover.push(cb);
	}
	
	/**
	 * Subscribes a callback function to the tile hover end event.
	 *
	 * @public
	 * @param {OnTileHoverEndCallbackFn} cb - Callback function to invoke when tile hover ends.
	 * @returns {void}
	 */
	public onTileHoverEndEvent(cb: OnTileHoverEndCallbackFn): void {
		this.eventSubscriber.onTileHoverEnd.push(cb);
	}
	
	// === Utilities ===
	
	/**
	 * Creates a DOM element for a given tile code with optional scaling.
	 *
	 * @public
	 * @param {string} tileCode - Code representing the tile.
	 * @param {number} [customScale] - Optional custom scale factor.
	 * @returns {HTMLDivElement} The HTML element representing the tile.
	 */
	public getTileAsElement(tileCode: string, customScale?: number): HTMLDivElement {
		const tileSize = this.config.main.tileSize;
		const scale = customScale ?? this.settings.upscale!;
		const promises: Promise<void>[] = [];
		
		return SceneBuilderUtils.createTileElement(
				tileCode,
				0, 0,
				this.config,
				this.settings,
				tileSize * scale,
				tileSize,
				promises,
				this,
				true
		);
	}
	
	/**
	 * Returns detailed metadata for all tiles located at the specified (x, y) coordinate.
	 * Includes the tile code, layer name, tileset short and id, and merged properties
	 * for each tile present across all layers (bottom to top).
	 *
	 * @public
	 * @param {number} x - X-coordinate of the tile.
	 * @param {number} y - Y-coordinate of the tile.
	 * @returns {TileMetadata[]} Array of tile metadata objects ordered from lowest to highest layer.
	 */
	public getTileMetadataStack(x: number, y: number): TileMetadata[] {
		const { width, height } = this.config.main;
		if (x < 0 || x >= width || y < 0 || y >= height) return [];
		
		const { tilesets, props, layers } = this.config;
		const allLayers = [...layers, ...this.runtimeLayers];
		
		const result: TileMetadata[] = []
		
		for (const layer of allLayers) {
			const tileCode = layer.tiles?.[y]?.[x] ?? "0";
			if (!tileCode || tileCode === "0") continue;
			
			const tilesetShort = tileCode.match(/^[A-Z]+/)?.[0] ?? null;
			const tileset = tilesets.find(ts => ts.short === tilesetShort)
			
			const tileProps = props.tiles[tileCode] ?? {};
			const layerProps = props.layers[layer.name] ?? {};
			const tilesetProps = tilesetShort ? props.tilesets[tileset!.id] ?? {} : {};
			const combinedProps = {
				...tilesetProps,
				...layerProps,
				...tileProps,
			};
			
			result.push({
				tile: tileCode,
				layerName: layer.name,
				tilesetShort: tilesetShort as string,
				tilesetId: tileset!.id,
				props: combinedProps
			});
		}
		
		return result;
	}
	
	/**
	 * Resolves the final combined properties for the tile stack at the given (x, y) coordinate.
	 * Properties from higher layers override those from lower layers in case of key conflicts.
	 *
	 * @public
	 * @param {number} x - X-coordinate of the tile.
	 * @param {number} y - Y-coordinate of the tile.
	 * @returns {Record<string, string>} A merged key-value map of all props at this position.
	 */
	
	public getProps(x: number, y: number): Record<string, string> {
		const stack = this.getTileMetadataStack(x, y);
		const mergedProps: Record<string, string> = {};
		
		for (const tile of stack) {
			Object.assign(mergedProps, tile.props);
		}
		
		return mergedProps;
	}
	
	/**
	 * Returns the resolved properties from the topmost (highest) tile at the given (x, y) coordinate.
	 * If no tile is found at that position, an empty object is returned.
	 *
	 * @public
	 * @param {number} x - X-coordinate of the tile.
	 * @param {number} y - Y-coordinate of the tile.
	 * @returns {Record<string, string>} The property map of the topmost tile, or an empty object if no tile exists.
	 */
	public getPropsFromHighestTile(x: number, y: number): Record<string, string> {
		const stack = this.getTileMetadataStack(x, y);
		if (stack.length === 0) return {};
		const topTile = stack[stack.length - 1];
		return topTile?.props ?? {};
	}
	
	// === Internals ===
	
	private lastHoveredTile: { x: number; y: number } = {x: -1, y: -1};
	private buildScene(): void {
		const start = performance.now();
		
		const { width, height, tileSize: baseSize } = this.config.main;
		const scale = this.settings.upscale!;
		const tileSize = baseSize * scale;
		
		const wrapper = document.createElement('div');
		wrapper.className = 'tw-scene-wrapper';
		wrapper.style.position = 'relative';
		wrapper.style.width = `${width * tileSize}px`;
		wrapper.style.height = `${height * tileSize}px`;
		
		wrapper.onmousemove = (e) => {
			const target = e.target as HTMLElement;
			const x = parseInt(target.dataset.x!);
			const y = parseInt(target.dataset.y!);
			if (isNaN(x) || isNaN(y)) return;
			if (this.lastHoveredTile.x === x && this.lastHoveredTile.y === y) return;
			
			if (this.lastHoveredTile && this.lastHoveredTile.x !== -1 && this.lastHoveredTile.y !== -1) {
				for (const cb of this.eventSubscriber.onTileHoverEnd) {
					cb({ x: this.lastHoveredTile.x, y: this.lastHoveredTile.y, originalMouseEvent: e });
				}
			}
			
			this.lastHoveredTile = { x, y };
			for (const cb of this.eventSubscriber.onTileHover) {
				cb({ x, y, originalMouseEvent: e });
			}
		}
		
		wrapper.onmouseleave = (e) => {
			if (this.lastHoveredTile && this.lastHoveredTile.x !== -1 && this.lastHoveredTile.y !== -1) {
				for (const cb of this.eventSubscriber.onTileHoverEnd) {
					cb({ x: this.lastHoveredTile.x, y: this.lastHoveredTile.y, originalMouseEvent: e });
				}
			}
			this.lastHoveredTile = {x: -1, y: -1};
		}
		
		const promises: Promise<void>[] = [];
		const allLayers = [...this.config.layers, ...this.runtimeLayers];
		
		for (const layer of allLayers) {
			const grid = SceneBuilderUtils.createGridElement(
					layer,
					this.config,
					this.settings,
					tileSize,
					baseSize,
					promises,
					this
			);
			wrapper.appendChild(grid);
		}
		
		this.container.innerHTML = '';
		this.container.appendChild(wrapper);
		
		Promise.all(promises).then(() => {
			const end = performance.now();
			console.log(`SceneBuilder ready in ${(end - start).toFixed(2)} ms`);
		}).catch(err => {
			console.error('SceneBuilder: Error loading tilesets', err);
		});
	}
	
	private updateTileInDOM(layerName: string, x: number, y: number, config: TileConfig | null): void {
		const layerEl = this.container.querySelector(`.tw-layer--${layerName}`) as HTMLDivElement;
		if (!layerEl) return;
		
		const tileIndex = y * this.config.main.width + x;
		const oldTileEl = layerEl.children[tileIndex] as HTMLDivElement;
		if (!oldTileEl) return;
		
		const tileCode = this.getTileCodeFromLayer(layerName, x, y);
		const tileEl = SceneBuilderUtils.createTileElement(
				tileCode, x, y, this.config, this.settings,
				this.config.main.tileSize * this.settings.upscale!,
				this.config.main.tileSize,
				[],
				this,
				false,
				config
		);
		
		layerEl.replaceChild(tileEl, oldTileEl);
	}
	
	private getTileCodeFromLayer(layerName: string, x: number, y: number): string {
		const layer = this.runtimeLayers.find(l => l.name === layerName)
				?? this.config.layers.find(l => l.name === layerName);
		return layer?.tiles?.[y]?.[x] ?? "0";
	}
	
	private addRuntimeLayerToDOM(layerName: string): void {
		const { width, height, tileSize: baseSize } = this.config.main;
		const scale = this.settings.upscale!;
		const tileSize = baseSize * scale;
		
		const tiles = SceneBuilderUtils.createEmpty2DArray(width, height);
		const newLayer: TWMLayer = { name: layerName, tiles };
		this.runtimeLayers.push(newLayer);
		
		const promises: Promise<void>[] = [];
		const layerEl = SceneBuilderUtils.createGridElement(
				newLayer,
				this.config,
				this.settings,
				tileSize,
				baseSize,
				promises,
				this
		);
		
		const wrapper = this.container.querySelector('.tw-scene-wrapper');
		if (wrapper) {
			wrapper.appendChild(layerEl);
		}
		
		Promise.all(promises).catch(err => {
			console.error('SceneBuilder::addRuntimeLayerToDOM: Error loading tileset', err);
		});
	}
}
