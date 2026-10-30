"use client";

import { Download, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { clearPlayers, countPlayers, downloadCsv, getPlayers, playersToCsv } from "@/lib/playerLog";

/** The address that opens the panel: the game's link with #players on the end. */
const HASH = "#players";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Staff only: the list of doctors who played on this device, downloadable as
 * CSV. Opened by the secret link (#players), never shown to players.
 */
export function StaffPanel() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    const sync = () => setOpen(window.location.hash === HASH);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const refresh = useCallback(() => {
    countPlayers().then(setCount, () => {
      setCount(null);
      setStatus("The player list can't be read in this browser (storage may be blocked or in a private window).");
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    setStatus("");
    setConfirmClear(false);
    refresh();
  }, [open, refresh]);

  const close = () => {
    // Take #players off the address without reloading, so the game carries on underneath.
    history.replaceState(null, "", window.location.pathname + window.location.search);
    setOpen(false);
  };

  const download = async () => {
    try {
      const players = await getPlayers();
      downloadCsv(playersToCsv(players), `cabp-bowling-players-${today()}.csv`);
      setStatus(`Downloaded ${players.length} ${players.length === 1 ? "player" : "players"}.`);
    } catch {
      setStatus("Couldn't read the player list.");
    }
  };

  const clear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    try {
      await clearPlayers();
      setStatus("The player list is now empty.");
    } catch {
      setStatus("Couldn't clear the player list.");
    }
    setConfirmClear(false);
    refresh();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      tone="game"
      eyebrow={<span className="text-brand-gold">Staff</span>}
      title={<span className="font-display uppercase tracking-wide text-brand-gold">Players</span>}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={clear}
            disabled={!count}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-display text-lg tracking-wide ring-1 transition-colors disabled:opacity-40 ${
              confirmClear ? "bg-brand-red text-white ring-brand-red" : "bg-white/10 text-white ring-white/30 hover:bg-white/20"
            }`}
          >
            <Trash2 className="h-5 w-5" aria-hidden />
            {confirmClear ? `Tap again to delete all ${count}` : "Clear list"}
          </button>
          <button type="button" onClick={download} disabled={!count} className="btn-primary px-6 py-3 text-lg tracking-wide disabled:opacity-40">
            <Download className="h-5 w-5" aria-hidden /> Download CSV
          </button>
        </div>
      }
    >
      <p className="text-lg text-white">
        {count === null ? "Reading the list…" : count === 0 ? "No players saved yet." : `${count} ${count === 1 ? "player" : "players"} saved on this device.`}
      </p>
      <p className="mt-2 text-sm text-white/70">Saved in this browser only, with no internet needed. The CSV has each doctor&apos;s name and the date and time they played.</p>
      {status && (
        <p role="status" className="mt-3 text-sm font-semibold text-brand-gold">
          {status}
        </p>
      )}
    </Dialog>
  );
}
