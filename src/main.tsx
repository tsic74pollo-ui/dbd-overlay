import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { EditorPage } from "@/routes/EditorPage";
import { OverlayPage } from "@/routes/OverlayPage";
import { RemotePage } from "@/routes/RemotePage";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EditorPage />} />
        <Route path="/overlay" element={<OverlayPage />} />
        <Route path="/remote" element={<RemotePage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
