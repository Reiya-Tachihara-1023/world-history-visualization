// 20 categorical hues for polities. Chosen to stay distinguishable on the
// parchment-coloured land while remaining soft enough for text on top.
export const PALETTE: [number, number, number][] = [
  [231, 76, 60], [52, 152, 219], [46, 204, 113], [241, 196, 15], [155, 89, 182],
  [230, 126, 34], [26, 188, 156], [236, 112, 99], [93, 173, 226], [88, 214, 141],
  [244, 208, 63], [175, 122, 197], [235, 152, 78], [72, 201, 176], [205, 97, 85],
  [84, 153, 199], [82, 190, 128], [212, 172, 13], [136, 78, 160], [202, 111, 30],
];

export function rgba(slot: number, a: number): string {
  const c = PALETTE[((slot % PALETTE.length) + PALETTE.length) % PALETTE.length] ?? [120, 120, 120];
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

export const EVENT_COLORS: Record<string, string> = {
  battle: '#ff6b6b', revolution: '#ff8e53', fall: '#c0392b',
  politics: '#ffd166', founding: '#f7e08a', treaty: '#6fb3ff',
  culture: '#7bd389', religion: '#c89bff', exploration: '#5fd3e0', other: '#cccccc',
};
