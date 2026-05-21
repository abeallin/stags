import { BrowserRouter, Route, Routes, Link, Navigate } from "react-router-dom";
import Stag from "./pages/Stag";
import { DialogHost } from "./lib/dialogs";

const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

function Landing() {
  return (
    <div className="landing">
      <div className="landing-eyebrow">// PICK A TRIP</div>
      <h1 className="landing-title">Stags<em>·</em></h1>
      <div className="landing-grid">
        <Link to="/bcn" className="landing-card">
          <div className="landing-card-num">01</div>
          <div className="landing-card-where">Barcelona</div>
          <div className="landing-card-when">June · 2026</div>
        </Link>
        <Link to="/sthlm" className="landing-card">
          <div className="landing-card-num">02</div>
          <div className="landing-card-where">Stockholm</div>
          <div className="landing-card-when">June · 2026</div>
        </Link>
      </div>
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
      <DialogHost />
    </BrowserRouter>
  );
}
