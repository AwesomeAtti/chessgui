import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// chessground ships its own stylesheets; the board does not render without them.
import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.brown.css";
import "chessground/assets/chessground.cburnett.css";

import "@/i18n";
import "@/styles.css";
import App from "@/App";

const container = document.getElementById("root");
if (container === null) {
  throw new Error("root element missing from index.html");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
