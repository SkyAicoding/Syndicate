import type { ScreenId } from "../data/types";

export interface Screen {
  id: ScreenId;
  mount(container: HTMLElement): void;
  destroy(): void;
}
