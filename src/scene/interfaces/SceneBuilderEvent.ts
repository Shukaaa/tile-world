interface TileMouseEvent {
	x: number,
	y: number,
	originalMouseEvent: MouseEvent
}

export type OnTileClickedCallbackFn = (event: OnTileClickedEvent) => void
export interface OnTileClickedEvent extends TileMouseEvent {}

export type OnTileHoverCallbackFn = (event: OnTileHoverEvent) => void
export interface OnTileHoverEvent extends TileMouseEvent {}

export type OnTileHoverEndCallbackFn = (event: OnTileHoverEndEvent) => void
export interface OnTileHoverEndEvent extends TileMouseEvent {}

export type SceneEventSubscriber = {
	onTileClicked: OnTileClickedCallbackFn[],
	onTileHover: OnTileHoverCallbackFn[],
	onTileHoverEnd: OnTileHoverEndCallbackFn[]
}