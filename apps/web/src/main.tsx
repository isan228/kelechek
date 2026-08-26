import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { SiteCopyProvider } from "./content/SiteCopyProvider";
import "./i18n";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SiteCopyProvider>
          <App />
        </SiteCopyProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
