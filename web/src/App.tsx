import { BrowserRouter, Route, Routes, Link, Navigate } from "react-router-dom";
import Stag from "./pages/Stag";

const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

function Landing() {
  return (
    <div style={{ padding: 40, fontFamily: "system-ui" }}>
      <h1>Stags</h1>
      <ul>
        <li><Link to="/bcn">Barcelona 2026</Link></li>
        <li><Link to="/sthlm">Stockholm 2026</Link></li>
      </ul>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/bcn" element={<Stag slug="bcn" />} />
        <Route path="/sthlm" element={<Stag slug="sthlm" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
