import React from "react";
import { createRoot } from "react-dom/client";
import FpsGame from "./FpsGame.jsx";

document.title = "JACOB: FRONTLINE | Free Browser Tactical FPS";
createRoot(document.getElementById("root")).render(<FpsGame />);
