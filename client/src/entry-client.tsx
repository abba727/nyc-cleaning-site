import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const app = <App />;
const root = document.getElementById("root")!;
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
