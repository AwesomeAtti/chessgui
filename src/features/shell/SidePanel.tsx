/**
 * The fixed-width right column.
 *
 * Present in every view, always the same width and position — only its contents change. That
 * consistency is the whole idea, borrowed from chess.com by way of `docs/ui-survey.md`, and
 * it rests on a principle worth stating: **fixed measure for text, fluid for graphics.** A
 * move list has an optimal reading width and gains nothing from being stretched; a board
 * gains from every pixel. So the panel holds still and the board absorbs the resize.
 *
 * Three parts, and the split matters: a header that does not scroll (so the tabs are always
 * reachable), a body that scrolls however dense it becomes, and an optional footer that does
 * not scroll (so primary actions never disappear). Chess.com's panel does exactly this, and
 * it is what lets their explorer get as dense as it does without losing its controls.
 *
 * The tabs here are a **segmented control**, deliberately not styled like the document tabs
 * above. Two tab strips that look alike is confusing in a way that is easy to feel and hard
 * to name.
 */
import type { ReactNode } from "react";

export interface PanelTab {
  readonly id: string;
  readonly label: string;
}

interface SidePanelProps {
  tabs: readonly PanelTab[];
  activeTab: string;
  onSelectTab: (id: string) => void;
  footer?: ReactNode;
  children: ReactNode;
}

export function SidePanel({
  tabs,
  activeTab,
  onSelectTab,
  footer,
  children,
}: SidePanelProps) {
  return (
    <aside className="side-panel">
      <div className="panel-header">
        {/* A segmented control of one is just a label wearing a control's clothes. */}
        {tabs.length === 1 ? (
          <h2 className="panel-title">{tabs[0]?.label}</h2>
        ) : (
          <div className="segmented" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={tab.id === activeTab}
                className={tab.id === activeTab ? "segment selected" : "segment"}
                onClick={() => onSelectTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="panel-body">{children}</div>

      {footer !== undefined && <div className="panel-footer">{footer}</div>}
    </aside>
  );
}
