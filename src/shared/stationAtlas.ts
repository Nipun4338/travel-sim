// The Line 6 station sign atlas (polish spec §6.1): the bake writes UVs into this layout and Metro
// Mode paints it from the line's station names, so the signs cost no download. One 1024 × 2048
// canvas, one 128 px row per station (north to south): the fascia over the road, the platform
// roundel, and the two street entrance signs (exits A and B).
export const STATION_ATLAS_W = 1024, STATION_ROW_H = 128, STATION_ROWS = 16;
export const STATION_ATLAS_H = STATION_ROW_H * STATION_ROWS;

export type StationSign = 'fascia' | 'roundel' | 'exitA' | 'exitB';
/** x and width of each sign in a station's row (px). */
export const STATION_CELLS: Record<StationSign, [number, number]> = {
  fascia: [0, 448], roundel: [448, 256], exitA: [704, 160], exitB: [864, 160],
};

/** u0, v0, u1, v1 with v up (the canvas top is v = 1). */
export function stationUV(station: number, sign: StationSign): [number, number, number, number] {
  const [x, w] = STATION_CELLS[sign], y = (Math.min(station, STATION_ROWS - 1)) * STATION_ROW_H, inset = 2;
  return [(x + inset) / STATION_ATLAS_W, 1 - (y + STATION_ROW_H - inset) / STATION_ATLAS_H, (x + w - inset) / STATION_ATLAS_W, 1 - (y + inset) / STATION_ATLAS_H];
}
