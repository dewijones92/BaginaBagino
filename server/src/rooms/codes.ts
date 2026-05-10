// Room-code alphabet excludes I, O, L, 0, 1 for legibility.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateRoomCode(taken: (code: string) => boolean): string {
  // 30^4 = 810k codes — way more than we need, collisions vanishingly rare.
  for (let attempt = 0; attempt < 100; attempt++) {
    let s = '';
    for (let i = 0; i < 4; i++) {
      s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    if (!taken(s)) return s;
  }
  throw new Error('failed to allocate room code after 100 attempts');
}
