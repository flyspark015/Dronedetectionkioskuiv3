import "./polyfills";
import "maplibre-gl/dist/maplibre-gl.css";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(<App />);
  
