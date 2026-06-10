import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useUniverseStore } from "../store/useUniverseStore";
import { useAuthStore } from "../data/auth";
import { craftIntroMessage, isValidWhatsapp, whatsappLink } from "../utils";
import type { Connection } from "../types";

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 60) return m <= 1 ? "just now" : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

export function LightBridgePanel() {
  const closeOverlay = useUniverseStore((s) => s.closeOverlay);
  const authStatus = useAuthStore((s) => s.status);
  const openAuthScreen = useAuthStore((s) => s.openAuthScreen);

  const selfId = useUniverseStore((s) => s.selfId);
  const user = useUniverseStore((s) => s.user);
  const connections = useUniverseStore((s) => s.connections);
  const setWhatsapp = useUniverseStore((s) => s.setWhatsapp);
  const acceptConnection = useUniverseStore((s) => s.acceptConnection);
  const declineConnection = useUniverseStore((s) => s.declineConnection);

  const [phoneInput, setPhoneInput] = useState(user?.whatsapp ?? "");
  const [phoneSaved, setPhoneSaved] = useState(false);

  const incoming = useMemo(
    () => connections.filter((c) => c.toId === selfId && c.status === "pending"),
    [connections, selfId],
  );
  const sent = useMemo(
    () => connections.filter((c) => c.fromId === selfId && c.status === "pending"),
    [connections, selfId],
  );
  const active = useMemo(
    () => connections.filter((c) => c.status === "accepted"),
    [connections],
  );

  function handleSavePhone() {
    setWhatsapp(phoneInput.trim());
    setPhoneSaved(true);
    setTimeout(() => setPhoneSaved(false), 2500);
  }

  if (authStatus !== "authenticated") {
    return (
      <motion.div
        className="veil veil--dim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) closeOverlay(); }}
      >
        <motion.div
          className="panel light-bridge-panel"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="panel__head">
            <div>
              <h2 className="modal__title">🌉 Light Bridge</h2>
              <p className="library__sub">Sign in to connect with people you meet here.</p>
            </div>
            <button className="icon-btn" onClick={closeOverlay} aria-label="Close">✕</button>
          </div>
          <div className="panel__body">
            <p className="empty">
              Light Bridge lets two people consensually exchange WhatsApp contact —
              only after both sides agree. This needs an account so requests can
              find you when you're away.
            </p>
            <button className="btn btn--primary" onClick={() => { closeOverlay(); openAuthScreen(); }}>
              Sign in or create a universe
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="veil veil--dim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) closeOverlay(); }}
    >
      <motion.div
        className="panel light-bridge-panel"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="panel__head">
          <div>
            <h2 className="modal__title">🌉 Light Bridge</h2>
            <p className="library__sub">Two stars, mutually agreeing to meet beyond this galaxy.</p>
          </div>
          <button className="icon-btn" onClick={closeOverlay} aria-label="Close">✕</button>
        </div>

        <div className="panel__body">
          {/* WhatsApp number */}
          <div className="light-bridge__phone">
            <span className="field__label">Your WhatsApp number</span>
            <p className="light-bridge__phone-note">
              Stays private. Only shared with someone after you <em>both</em> accept a connection.
            </p>
            <div className="light-bridge__phone-row">
              <input
                className="field__input"
                type="tel"
                placeholder="+1 555 123 4567"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
              />
              <button
                className="btn--small"
                disabled={!phoneInput.trim() || !isValidWhatsapp(phoneInput)}
                onClick={handleSavePhone}
              >
                {phoneSaved ? "Saved ✓" : "Save"}
              </button>
            </div>
            {phoneInput.trim() && !isValidWhatsapp(phoneInput) && (
              <p className="content-guard-error">That doesn't look like a valid number with country code.</p>
            )}
          </div>

          {/* Incoming requests */}
          {incoming.length > 0 && (
            <>
              <div className="light-give__divider" />
              <p className="stargazing__mine-label">Requests to connect</p>
              {incoming.map((c) => (
                <div key={c.id} className="bridge-card">
                  <div className="bridge-card__header">
                    <span className="bridge-card__star" style={{ background: c.fromColor, boxShadow: `0 0 12px ${c.fromColor}88` }} />
                    <span className="bridge-card__name">{c.fromName}</span>
                    <span className="signal-card__time">{timeAgo(c.createdAt)}</span>
                  </div>
                  {c.fromMessage && <p className="bridge-card__message">"{c.fromMessage}"</p>}
                  <div className="bridge-card__actions">
                    <button className="btn--ghost" onClick={() => void declineConnection(c.id)}>Not now</button>
                    <button className="btn btn--primary" onClick={() => void acceptConnection(c.id)}>
                      Accept & connect
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Active connections */}
          {active.length > 0 && (
            <>
              <div className="light-give__divider" />
              <p className="stargazing__mine-label">Your connections</p>
              {active.map((c) => (
                <ActiveConnectionCard key={c.id} connection={c} selfId={selfId} myName={user?.name ?? ""} />
              ))}
            </>
          )}

          {/* Sent requests */}
          {sent.length > 0 && (
            <>
              <div className="light-give__divider" />
              <p className="stargazing__mine-label">Waiting for a reply</p>
              {sent.map((c) => (
                <div key={c.id} className="bridge-card bridge-card--pending">
                  <div className="bridge-card__header">
                    <span className="bridge-card__star" style={{ background: c.fromColor, boxShadow: `0 0 12px ${c.fromColor}88` }} />
                    <span className="bridge-card__name">{c.toName}</span>
                    <span className="signal-card__time">{timeAgo(c.createdAt)}</span>
                  </div>
                  {c.fromMessage && <p className="bridge-card__message">"{c.fromMessage}"</p>}
                  <p className="bridge-card__waiting">Sent — waiting for {c.toName} to respond</p>
                </div>
              ))}
            </>
          )}

          {incoming.length === 0 && active.length === 0 && sent.length === 0 && (
            <p className="empty">
              No connections yet. Visit another star and tap "Connect" to send a
              request — if they accept, you'll both be able to continue the
              conversation on WhatsApp.
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ActiveConnectionCard({ connection, selfId, myName }: { connection: Connection; selfId: string; myName: string }) {
  const otherName = connection.fromId === selfId ? connection.toName : connection.fromName;
  const myPhone = connection.fromId === selfId ? connection.fromWhatsapp : connection.toWhatsapp;
  const theirPhone = connection.fromId === selfId ? connection.toWhatsapp : connection.fromWhatsapp;

  const message = craftIntroMessage({
    fromName: myName,
    toName: otherName,
    note: connection.fromId === selfId ? connection.fromMessage : undefined,
  });

  return (
    <div className="bridge-card bridge-card--active">
      <div className="bridge-card__header">
        <span className="bridge-card__star" style={{ background: connection.fromColor, boxShadow: `0 0 12px ${connection.fromColor}88` }} />
        <span className="bridge-card__name">{otherName}</span>
        <span className="bridge-card__badge">connected</span>
      </div>
      {!myPhone && (
        <p className="bridge-card__waiting">
          Add your WhatsApp number above to finish connecting with {otherName}.
        </p>
      )}
      {myPhone && !theirPhone && (
        <p className="bridge-card__waiting">
          Waiting for {otherName} to add their number.
        </p>
      )}
      {myPhone && theirPhone && (
        <a
          className="btn btn--primary bridge-card__whatsapp"
          href={whatsappLink(theirPhone, message)}
          target="_blank"
          rel="noreferrer"
        >
          💬 Message {otherName} on WhatsApp
        </a>
      )}
    </div>
  );
}
