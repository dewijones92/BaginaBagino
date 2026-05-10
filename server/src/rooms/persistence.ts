import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { GameStateInternal } from '../engine/state.js';

/**
 * Per-room snapshot store. We keep the latest state plus a rolling window
 * of recent events so a reconnecting client can request a replay from a
 * given lastEventId.
 */
export class Persistence {
  private db: Database.Database;
  private insertSnapshot: Database.Statement;
  private getSnapshot: Database.Statement;
  private insertEvent: Database.Statement;
  private getEvents: Database.Statement;
  private listRooms: Database.Statement;

  constructor(filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true });
    this.db = new Database(filePath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS room_snapshots (
        code TEXT PRIMARY KEY,
        state JSON NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS room_events (
        code TEXT NOT NULL,
        event_id INTEGER NOT NULL,
        event JSON NOT NULL,
        PRIMARY KEY (code, event_id)
      );
      CREATE INDEX IF NOT EXISTS idx_events_code ON room_events(code, event_id);
    `);
    this.insertSnapshot = this.db.prepare(
      'INSERT OR REPLACE INTO room_snapshots(code, state, updated_at) VALUES (?, ?, ?)',
    );
    this.getSnapshot = this.db.prepare(
      'SELECT state FROM room_snapshots WHERE code = ?',
    );
    this.insertEvent = this.db.prepare(
      'INSERT OR IGNORE INTO room_events(code, event_id, event) VALUES (?, ?, ?)',
    );
    this.getEvents = this.db.prepare(
      'SELECT event_id, event FROM room_events WHERE code = ? AND event_id > ? ORDER BY event_id ASC',
    );
    this.listRooms = this.db.prepare('SELECT code FROM room_snapshots');
  }

  saveSnapshot(state: GameStateInternal): void {
    this.insertSnapshot.run(state.code, JSON.stringify(state), Date.now());
  }

  loadSnapshot(code: string): GameStateInternal | null {
    const row = this.getSnapshot.get(code) as { state: string } | undefined;
    if (!row) return null;
    return JSON.parse(row.state) as GameStateInternal;
  }

  appendEvent(code: string, eventId: number, evt: unknown): void {
    this.insertEvent.run(code, eventId, JSON.stringify(evt));
  }

  eventsAfter(code: string, eventId: number): unknown[] {
    const rows = this.getEvents.all(code, eventId) as { event_id: number; event: string }[];
    return rows.map((r) => JSON.parse(r.event));
  }

  allRoomCodes(): string[] {
    return (this.listRooms.all() as { code: string }[]).map((r) => r.code);
  }

  deleteRoomData(code: string): void {
    const tx = this.db.transaction((c: string) => {
      this.db.prepare('DELETE FROM room_snapshots WHERE code = ?').run(c);
      this.db.prepare('DELETE FROM room_events WHERE code = ?').run(c);
    });
    tx(code);
  }

  close(): void {
    this.db.close();
  }
}
