import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUniverseStore } from "../store/useUniverseStore";
import type { WisdomCategory } from "../types";
import {
  WISDOM_CATEGORY_GLYPHS,
  WISDOM_CATEGORY_LABELS,
  STAGE_LABELS,
} from "../utils";

const CATEGORIES: WisdomCategory[] = [
  "fear", "hope", "relationships", "work", "dreams", "recovery", "identity",
];

// Seed entries shown when the library is empty — the spirit of the feature.
const SEEDS = [
  { category: "fear" as WisdomCategory, content: "The fear never fully goes away. But it gets smaller as the life around it gets bigger.", fromStage: "remission" },
  { category: "hope" as WisdomCategory, content: "Hope isn't certainty. It's choosing to act as if the future is worth working toward.", fromStage: "treatment" },
  { category: "recovery" as WisdomCategory, content: "Recovery isn't linear. Some days you feel like yourself again. Other days you don't. Both are part of it.", fromStage: "survivorship" },
  { category: "identity" as WisdomCategory, content: "I used to think the diagnosis changed who I was. Eventually I realized it just revealed who I had always been.", fromStage: "survivorship" },
  { category: "relationships" as WisdomCategory, content: "People don't know what to say. That's okay. Tell them what you need. They'll show up.", fromStage: "treatment" },
  { category: "work" as WisdomCategory, content: "Give yourself permission to stop measuring productivity. Being alive is the work right now.", fromStage: "diagnosis" },
  { category: "dreams" as WisdomCategory, content: "I made a list of everything I still wanted to do. Not to plan it — just to remind myself it was worth imagining.", fromStage: "treatment" },
];

export function LibraryOfLight() {
  const closeOverlay = useUniverseStore((s) => s.closeOverlay);
  const user = useUniverseStore((s) => s.user);
  const others = useUniverseStore((s) => s.others);
  const myWisdom = useUniverseStore((s) => s.wisdom);
  const addWisdom = useUniverseStore((s) => s.addWisdom);

  const [activeCategory, setActiveCategory] = useState<WisdomCategory>("fear");
  const [showComposer, setShowComposer] = useState(false);
  const [composerCategory, setComposerCategory] = useState<WisdomCategory>("fear");
  const [composerContent, setComposerContent] = useState("");
  const [composerAnon, setComposerAnon] = useState(false);

  // Collect all wisdom: community + mine
  const allWisdom = useMemo(() => {
    const communityEntries = others.flatMap((c) =>
      c.wisdom.map((w) => ({ ...w, authorStage: c.user.stage, authorName: c.user.name })),
    );
    const myEntries = myWisdom.map((w) => ({
      ...w,
      authorStage: user?.stage,
      authorName: user?.name ?? "You",
      isMine: true,
    }));
    return [...communityEntries, ...myEntries].sort((a, b) => b.createdAt - a.createdAt);
  }, [others, myWisdom, user]);

  const filtered = useMemo(
    () => allWisdom.filter((w) => w.category === activeCategory),
    [allWisdom, activeCategory],
  );

  const seedsForCategory = SEEDS.filter((s) => s.category === activeCategory);
  const showSeeds = filtered.length === 0;

  function handleContribute() {
    if (!composerContent.trim()) return;
    addWisdom({
      category: composerCategory,
      content: composerContent.trim(),
      fromStage: user?.stage,
      anonymous: composerAnon,
    });
    setComposerContent("");
    setShowComposer(false);
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
        className="panel library-panel"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="panel__head">
          <div>
            <h2 className="modal__title">◈ Library of Light</h2>
            <p className="library__sub">Real experiences. Human wisdom. No experts here.</p>
          </div>
          <button className="icon-btn" onClick={closeOverlay} aria-label="Close">✕</button>
        </div>

        <div className="panel__body">
          {/* Category tabs */}
          <div className="library__cats">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`library__cat ${activeCategory === cat ? "library__cat--active" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {WISDOM_CATEGORY_GLYPHS[cat]} {WISDOM_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Entries */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              className="library__entries"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {showSeeds
                ? seedsForCategory.map((entry, i) => (
                    <div key={i} className="library__entry">
                      <blockquote className="library__entry-content">"{entry.content}"</blockquote>
                      <div className="library__entry-meta">
                        <span className="library__entry-from">
                          From {entry.fromStage ? STAGE_LABELS[entry.fromStage as keyof typeof STAGE_LABELS] : "the community"}
                        </span>
                      </div>
                    </div>
                  ))
                : filtered.map((entry) => (
                    <div key={entry.id} className="library__entry">
                      <blockquote className="library__entry-content">"{entry.content}"</blockquote>
                      <div className="library__entry-meta">
                        <span className="library__entry-from">
                          {entry.anonymous
                            ? "Shared anonymously"
                            : `From ${entry.authorStage ? STAGE_LABELS[entry.authorStage as keyof typeof STAGE_LABELS] : "the community"}`}
                        </span>
                      </div>
                    </div>
                  ))}
            </motion.div>
          </AnimatePresence>

          {/* Contribute */}
          <div className="light-give__divider" />
          {!showComposer ? (
            <button
              className="library__contribute-btn"
              onClick={() => { setShowComposer(true); setComposerCategory(activeCategory); }}
            >
              ✦ Write something for someone who needs it
            </button>
          ) : (
            <AnimatePresence>
              <motion.div
                className="library__composer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <div className="library__composer-cats">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      className={`library__cat library__cat--sm ${composerCategory === cat ? "library__cat--active" : ""}`}
                      onClick={() => setComposerCategory(cat)}
                    >
                      {WISDOM_CATEGORY_GLYPHS[cat]}
                    </button>
                  ))}
                  <span className="library__composer-cat-label">
                    {WISDOM_CATEGORY_LABELS[composerCategory]}
                  </span>
                </div>

                <textarea
                  className="light-give__textarea"
                  value={composerContent}
                  onChange={(e) => setComposerContent(e.target.value)}
                  placeholder={`What would you say to someone facing ${WISDOM_CATEGORY_LABELS[composerCategory].toLowerCase()} right now?`}
                  rows={4}
                  maxLength={400}
                  autoFocus
                />

                <div className="light-give__composer-footer">
                  <label className="light-give__anon">
                    <input
                      type="checkbox"
                      checked={composerAnon}
                      onChange={(e) => setComposerAnon(e.target.checked)}
                    />
                    <span>Share anonymously</span>
                  </label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn--ghost" onClick={() => setShowComposer(false)}>Cancel</button>
                    <button
                      className="btn btn--primary"
                      disabled={!composerContent.trim()}
                      onClick={handleContribute}
                    >
                      Add to the library
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
