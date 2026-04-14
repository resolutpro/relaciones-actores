import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH =
  process.env["DATABASE_PATH"] ||
  path.resolve(__dirname, "../database.sqlite");

export const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS actors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sector TEXT,
    lat REAL,
    lon REAL,
    custom_fields TEXT NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_actor_id INTEGER NOT NULL,
    target_actor_id INTEGER NOT NULL,
    score REAL NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 1),
    comments TEXT,
    FOREIGN KEY (source_actor_id) REFERENCES actors(id) ON DELETE CASCADE,
    FOREIGN KEY (target_actor_id) REFERENCES actors(id) ON DELETE CASCADE
  );
`);

export interface Actor {
  id: number;
  name: string;
  sector: string | null;
  lat: number | null;
  lon: number | null;
  custom_fields: Record<string, string>;
}

export interface Relationship {
  id: number;
  source_actor_id: number;
  target_actor_id: number;
  score: number;
  comments: string | null;
}

export interface ActorWithScore extends Actor {
  score: number;
  relationship_id: number;
  comments: string | null;
}

interface ActorRow {
  id: number;
  name: string;
  sector: string | null;
  lat: number | null;
  lon: number | null;
  custom_fields: string;
}

interface RelationshipRow {
  id: number;
  source_actor_id: number;
  target_actor_id: number;
  score: number;
  comments: string | null;
}

interface ActorWithScoreRow extends ActorRow {
  relationship_id: number;
  score: number;
  comments: string | null;
}

function parseActor(row: ActorRow): Actor {
  return {
    id: row.id,
    name: row.name,
    sector: row.sector ?? null,
    lat: row.lat ?? null,
    lon: row.lon ?? null,
    custom_fields: JSON.parse(row.custom_fields || "{}"),
  };
}

export const actorQueries = {
  findAll(): Actor[] {
    const rows = db.prepare("SELECT * FROM actors ORDER BY name").all() as ActorRow[];
    return rows.map(parseActor);
  },
  findById(id: number): Actor | null {
    const row = db.prepare("SELECT * FROM actors WHERE id = ?").get(id) as ActorRow | undefined;
    return row ? parseActor(row) : null;
  },
  create(data: {
    name: string;
    sector?: string | null;
    lat?: number | null;
    lon?: number | null;
    custom_fields?: Record<string, string>;
  }): Actor {
    const result = db
      .prepare("INSERT INTO actors (name, sector, lat, lon, custom_fields) VALUES (?, ?, ?, ?, ?)")
      .run(
        data.name,
        data.sector ?? null,
        data.lat ?? null,
        data.lon ?? null,
        JSON.stringify(data.custom_fields || {})
      );
    return actorQueries.findById(Number(result.lastInsertRowid))!;
  },
  update(
    id: number,
    data: {
      name?: string;
      sector?: string | null;
      lat?: number | null;
      lon?: number | null;
      custom_fields?: Record<string, string>;
    }
  ): Actor | null {
    const existing = actorQueries.findById(id);
    if (!existing) return null;
    const updated = { ...existing, ...data };
    db.prepare(
      "UPDATE actors SET name=?, sector=?, lat=?, lon=?, custom_fields=? WHERE id=?"
    ).run(
      updated.name,
      updated.sector ?? null,
      updated.lat ?? null,
      updated.lon ?? null,
      JSON.stringify(updated.custom_fields),
      id
    );
    return actorQueries.findById(id);
  },
  delete(id: number): boolean {
    const result = db.prepare("DELETE FROM actors WHERE id = ?").run(id);
    return result.changes > 0;
  },
};

export const relationshipQueries = {
  findAll(): Relationship[] {
    return db.prepare("SELECT * FROM relationships ORDER BY id").all() as RelationshipRow[];
  },
  findById(id: number): Relationship | null {
    const row = db.prepare("SELECT * FROM relationships WHERE id = ?").get(id) as RelationshipRow | undefined;
    return row ?? null;
  },
  findByActor(actorId: number): ActorWithScore[] {
    const rows = db
      .prepare(
        `SELECT
          a.id, a.name, a.sector, a.lat, a.lon, a.custom_fields,
          r.id as relationship_id, r.score, r.comments
         FROM relationships r
         JOIN actors a ON (
           (r.source_actor_id = ? AND a.id = r.target_actor_id)
           OR (r.target_actor_id = ? AND a.id = r.source_actor_id)
         )
         ORDER BY r.score DESC`
      )
      .all(actorId, actorId) as ActorWithScoreRow[];
    return rows.map((row) => ({
      ...parseActor(row),
      relationship_id: row.relationship_id,
      score: row.score,
      comments: row.comments ?? null,
    }));
  },
  create(data: {
    source_actor_id: number;
    target_actor_id: number;
    score: number;
    comments?: string | null;
  }): Relationship {
    const result = db
      .prepare(
        "INSERT INTO relationships (source_actor_id, target_actor_id, score, comments) VALUES (?, ?, ?, ?)"
      )
      .run(
        data.source_actor_id,
        data.target_actor_id,
        data.score,
        data.comments ?? null
      );
    return relationshipQueries.findById(Number(result.lastInsertRowid))!;
  },
  update(
    id: number,
    data: {
      source_actor_id?: number;
      target_actor_id?: number;
      score?: number;
      comments?: string | null;
    }
  ): Relationship | null {
    const existing = relationshipQueries.findById(id);
    if (!existing) return null;
    const updated = { ...existing, ...data };
    db.prepare(
      "UPDATE relationships SET source_actor_id=?, target_actor_id=?, score=?, comments=? WHERE id=?"
    ).run(
      updated.source_actor_id,
      updated.target_actor_id,
      updated.score,
      updated.comments ?? null,
      id
    );
    return relationshipQueries.findById(id);
  },
  delete(id: number): boolean {
    const result = db.prepare("DELETE FROM relationships WHERE id = ?").run(id);
    return result.changes > 0;
  },
};
