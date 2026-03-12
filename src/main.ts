import "./style.css";
import { AppController } from "./core/App";

const mountNode = document.querySelector<HTMLDivElement>("#app");

if (!mountNode) {
  throw new Error("App mount node was not found.");
}

const app = new AppController(mountNode);
app.mount();
