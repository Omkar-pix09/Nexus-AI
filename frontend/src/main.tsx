import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Shell from "./components/Shell";
import CommandCenter from "./pages/CommandCenter";
import KnowledgeGraph from "./pages/KnowledgeGraph";
import SimulationLab from "./pages/SimulationLab";
import EvidenceExplorer from "./pages/EvidenceExplorer";
import ResearchRoom from "./pages/ResearchRoom";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<CommandCenter />} />
          <Route path="graph" element={<KnowledgeGraph />} />
          <Route path="simulate" element={<SimulationLab />} />
          <Route path="evidence" element={<EvidenceExplorer />} />
          <Route path="research" element={<ResearchRoom />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
