export type OnTileClickedCallbackFn = (event: OnTileClickedEvent) => void
export interface OnTileClickedEvent {
	x: number,
	y: number,
	originalMouseEvent: MouseEvent
}