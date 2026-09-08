import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { OverlayPage } from "@/routes/OverlayPage";
import { EditorPage, RemotePage } from "@/routes/lazyRoutes";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Suspense fallback={null}>
              <EditorPage />
            </Suspense>
          }
        />
        <Route path="/overlay" element={<OverlayPage />} />
        <Route
          path="/remote"
          element={
            <Suspense fallback={null}>
              <RemotePage />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
