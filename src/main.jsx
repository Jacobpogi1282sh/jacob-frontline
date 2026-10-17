import React from "react";
import { createRoot } from "react-dom/client";
import FpsGame from "./FpsGame.jsx";

document.title = "OPERATION: BALANGAY — Tactical FPS";
createRoot(document.getElementById("root")).render(<FpsGame />);
