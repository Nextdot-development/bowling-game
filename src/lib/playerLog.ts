/**
 * The list of doctors who played, kept on this device in the browser's
 * IndexedDB: no server and no network, so it works offline and in the
 * single-file HTML build. One small record per game (name and time), written in
 * the background, so even thousands of entries never slow the game. Staff
 * download it as CSV from the panel at #players (StaffPanel).
 */

const DB_NAME = "cabp-bowling";
const DB_VERSION = 1;
const STORE = "players";

export interface PlayerRecord {
  id?: number;
  name: string;
  /** When the name was entered, ms since 1970 (Date.now()). */
  at: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB is not available"));
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("IndexedDB is blocked by another tab"));
  }).catch((err) => {
    dbPromise = null; // try again next time
    throw err;
  });
  return dbPromise;
}

/** Runs one request in a transaction on the players store and resolves when the transaction is done. */
async function run<T>(mode: IDBTransactionMode, make: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = make(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error ?? req.error);
    tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
  });
}

/** Saves a player. Never throws: if storage is unavailable (private window, blocked), the game just carries on. */
export async function savePlayer(name: string, at: number = Date.now()): Promise<boolean> {
  try {
    await run("readwrite", (s) => s.add({ name, at } satisfies PlayerRecord));
    return true;
  } catch {
    return false;
  }
}

/** Every saved player, oldest first. */
export function getPlayers(): Promise<PlayerRecord[]> {
  return run("readonly", (s) => s.getAll() as IDBRequest<PlayerRecord[]>);
}

export function countPlayers(): Promise<number> {
  return run("readonly", (s) => s.count());
}

export async function clearPlayers(): Promise<void> {
  await run("readwrite", (s) => s.clear());
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A CSV cell: quoted when it holds a comma, quote or line break; a leading = + - @ is defused so a spreadsheet never runs it as a formula. */
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** The players as CSV (Name, Date, Time in the device's local time), with a BOM so Excel reads the text as UTF-8. */
export function playersToCsv(players: readonly PlayerRecord[]): string {
  const rows = players.map((p) => {
    const d = new Date(p.at);
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    return [cell(p.name), date, time].join(",");
  });
  return "﻿" + ["Name,Date,Time", ...rows].join("\r\n") + "\r\n";
}

/** Saves the CSV as a file on this device (works offline, and from the single-file HTML). */
export function downloadCsv(csv: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
