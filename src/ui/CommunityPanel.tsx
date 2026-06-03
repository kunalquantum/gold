import { useState } from "react";
import { motion } from "framer-motion";
import { useUniverseStore } from "../store/useUniverseStore";
import type { Citizen, Milestone, UserRole } from "../types";
import { MILESTONE_DEFS, ROLE_LABELS, STAGE_LABELS, formatDate } from "../utils";

type Filter = "all" | UserRole;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "patient", label: "Journey" },
  { id: "survivor", label: "Survivors" },
  { id: "caregiver", label: "Caregivers" },
  { id: "supporter", label: "Supporters" },
];

function latestMilestone(milestones: Milestone[]): Milestone | null {
  const pub = milestones.filter((m) => m.isPublic);
  if (!pub.length) return null;
  return pub.sort((a, b) => b.createdAt - a.createdAt)[0];
}

function milestoneGlyph(type: Milestone["type"]): string {
  return MILESTONE_DEFS.find((d) => d.type === type)?.glyph ?? "✦";
}

function CitizenRow({ citizen, onVisit }: { citizen: Citizen; onVisit: () => void }) {
  const role = citizen.user.role;
  const stage = citizen.user.stage;
  const milestone = latestMilestone(citizen.milestones);
  const isSurvivor = role === "survivor";

  return (
    <div className={`community-citizen ${isSurvivor ? "community-citizen--risen" : ""}`}>
      <div className="community-citizen__header">
        <div className="community-citizen__star" style={{ background: citizen.user.color, boxShadow: `0 0 14px ${citizen.user.color}55` }} />
        <div className="community-citizen__info">
          <span className="community-citizen__name">{citizen.user.name}</span>
          <div className="community-citizen__badges">
            {role && (
              <span className="role-badge" style={{ color: isSurvivor ? "#ffd27a" : "#9bb8ff" }}>
                {ROLE_LABELS[role]}
              </span>
            )}
            {stage && (
              <span className="stage-badge">{STAGE_LABELS[stage]}</span>
            )}
          </div>
        </div>
        <button className="visit-btn" onClick={onVisit}>
          Visit
        </button>
      </div>

      {milestone && (
        <div className="community-citizen__milestone">
          <span className="community-citizen__milestone-glyph">{milestoneGlyph(milestone.type)}</span>
          <span className="community-citizen__milestone-text">{milestone.title}</span>
          <span className="community-citizen__milestone-date">{formatDate(milestone.date)}</span>
        </div>
      )}
    </div>
  );
}

function MilestoneFeedItem({ milestone, citizenName, color }: { milestone: Milestone; citizenName: string; color: string }) {
  return (
    <div className="milestone-feed-item">
      <span className="milestone-feed-item__glyph" style={{ color }}>{milestoneGlyph(milestone.type)}</span>
      <div className="milestone-feed-item__body">
        <span className="milestone-feed-item__title">{milestone.title}</span>
        <span className="milestone-feed-item__from">{citizenName} · {formatDate(milestone.date)}</span>
      </div>
    </div>
  );
}

export function CommunityPanel() {
  const closeOverlay = useUniverseStore((s) => s.closeOverlay);
  const selectCitizen = useUniverseStore((s) => s.selectCitizen);
  const selfId = useUniverseStore((s) => s.selfId);
  const world = useUniverseStore((s) => s.world)();

  const [filter, setFilter] = useState<Filter>("all");

  const community = world.filter((c) => c.ownerId !== selfId && c.user.isPublic !== false);

  const filtered = filter === "all"
    ? community
    : community.filter((c) => c.user.role === filter);

  const sorted = [...filtered].sort((a, b) => {
    const scoreOf = (c: Citizen) => (c.user.role === "survivor" ? 2 : c.user.role === "patient" ? 1 : 0);
    return scoreOf(b) - scoreOf(a);
  });

  const allPublicMilestones = community
    .flatMap((c) => c.milestones.filter((m) => m.isPublic).map((m) => ({ milestone: m, citizen: c })))
    .sort((a, b) => b.milestone.createdAt - a.milestone.createdAt)
    .slice(0, 12);

  function visitCitizen(c: Citizen) {
    selectCitizen(c.ownerId);
    closeOverlay();
  }

  return (
    <motion.div
      className="panel community-panel"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 280, damping: 32 }}
    >
      <button className="icon-btn panel__close" onClick={closeOverlay} aria-label="Close">✕</button>

      <div className="community-panel__header">
        <h2 className="community-panel__title">The Cosmos</h2>
        <p className="community-panel__sub">
          {community.length === 0
            ? "You're among the first stars here."
            : `${community.length} soul${community.length === 1 ? "" : "s"} sharing this sky`}
        </p>
      </div>

      <div className="chips" style={{ marginBottom: "20px", flexWrap: "nowrap", overflowX: "auto", paddingBottom: "4px" }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`chip ${filter === f.id ? "chip--active" : ""}`}
            style={{ flexShrink: 0 }}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="panel__body">
        {sorted.length === 0 ? (
          <p className="empty">
            {filter === "all"
              ? "No one has joined the community cosmos yet.\nYou can make yourself visible in your settings."
              : `No ${FILTERS.find((f) => f.id === filter)?.label.toLowerCase()} here yet.`}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
            {sorted.map((c) => (
              <CitizenRow key={c.ownerId} citizen={c} onVisit={() => visitCitizen(c)} />
            ))}
          </div>
        )}

        {allPublicMilestones.length > 0 && (
          <>
            <div className="community-section-label">Recent victories</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {allPublicMilestones.map(({ milestone, citizen }) => (
                <MilestoneFeedItem
                  key={milestone.id}
                  milestone={milestone}
                  citizenName={citizen.user.name}
                  color={citizen.user.color}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
