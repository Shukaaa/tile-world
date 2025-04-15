import {TWMConfig} from "../config/interfaces/twm-config";
import {TWMConfigParser} from "../config/parser/TWMConfigParser";
import {SceneBuilder} from "../scene/builder/SceneBuilder";
import {TWErrorHandler} from "../core/error/TWErrorHandler";
import {TWErrorCode} from "../core/error/TWErrorCode";
import {SceneBuilderSettings} from "../scene/interfaces/SceneBuilderSettings";

/**
 * TileWorldManager is the main controller for handling TWM configuration and scene building.
 * It serves as the entry point for working with tile-based worlds using the TileWorld system.
 *
 * @class TileWorldManager
 */
export class TileWorldManager {
	private config: TWMConfig | null;
	private sceneBuilder: SceneBuilder | null = null;
	
	/**
	 * Creates an instance of TileWorldManager.
	 *
	 * @constructor
	 * @param {TWMConfig | null} [config=null] - Optional preloaded configuration.
	 */
	constructor(config: TWMConfig | null = null) {
		this.config = config;
	}
	
	/**
	 * Loads and parses a TWM configuration from the provided URL.
	 *
	 * @async
	 * @public
	 * @param {string} twmUrl - The URL pointing to the TWM configuration file.
	 * @returns {Promise<void>} A promise that resolves when the config is loaded.
	 * @throws {Error} If the config fails to load or parse.
	 */
	public async loadConfig(twmUrl: string): Promise<void> {
		this.config = await TWMConfigParser.parseConfig(twmUrl);
	}
	
	/**
	 * Returns the currently loaded TWM configuration.
	 *
	 * @public
	 * @returns {TWMConfig | null} The configuration, or null if not loaded yet.
	 */
	public getConfig(): TWMConfig | null {
		return this.config;
	}
	
	/**
	 * Creates and initializes the scene using the current configuration.
	 *
	 * @public
	 * @param {string} selector - CSS selector for the container element.
	 * @param {SceneBuilderSettings} settings - SceneBuilder settings.
	 * @throws {TWErrorCode.NO_CONFIG_PROVIDED} If no configuration is loaded.
	 * @returns {void}
	 */
	public createScene(selector: string, settings: SceneBuilderSettings): void {
		if (!this.config) {
			TWErrorHandler.throw(
					TWErrorCode.NO_CONFIG_PROVIDED,
					`No config provided!`,
					"",
					'TileWorldManager'
			);
		}
		
		this.sceneBuilder = new SceneBuilder(selector, this.config, settings);
	}
	
	/**
	 * Returns the current SceneBuilder instance used to manage and render the scene.
	 *
	 * @public
	 * @readonly
	 * @type {SceneBuilder | null}
	 */
	public get scene(): SceneBuilder | null {
		return this.sceneBuilder;
	}
}
