export class TileCache {
	private static cache: Map<string, HTMLImageElement> = new Map();
	
	static async get(tilesetUrl: string): Promise<HTMLImageElement> {
		if (this.cache.has(tilesetUrl)) {
			return this.cache.get(tilesetUrl)!;
		}
		
		const img = new Image();
		img.src = tilesetUrl;
		await img.decode(); // moderne & sichere Variante
		this.cache.set(tilesetUrl, img);
		return img;
	}
}