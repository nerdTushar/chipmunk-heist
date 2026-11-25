export const GAMENAME = "chipmunkheist";

export function save(key: string, value: any) {
  const finalKey = GAMENAME + key;
  localStorage.setItem(finalKey, JSON.stringify(value));
}

export function get(key: string) {
  const finalKey = GAMENAME + key;
  const value = localStorage.getItem(finalKey);
  return value ? JSON.parse(value) : null;
}
