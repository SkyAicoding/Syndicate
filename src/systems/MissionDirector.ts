import { MISSIONS } from "../data/missions";
import type { MissionId, MissionResult } from "../data/types";

export class MissionDirector {
  private readonly missionId: MissionId;

  private readonly onEnd: (result: MissionResult) => void;

  private rescuedVip = false;

  private sabotaged = false;

  private missionState: "active" | "success" | "failure" = "active";

  public constructor(missionId: MissionId, onEnd: (result: MissionResult) => void) {
    this.missionId = missionId;
    this.onEnd = onEnd;
  }

  public markVipRescued(): void {
    this.rescuedVip = true;
  }

  public markSabotaged(): void {
    this.sabotaged = true;
  }

  public getState(): "active" | "success" | "failure" {
    return this.missionState;
  }

  public getObjectiveText(): string {
    const mission = MISSIONS[this.missionId];
    if (this.missionState !== "active") {
      return this.missionState === "success" ? "Operation successful" : "Operation failed";
    }

    switch (mission.objectiveKind) {
      case "eliminate":
        return "Eliminate the courier target.";
      case "rescue":
        return this.rescuedVip
          ? "Escort the scientist to extraction."
          : "Reach the scientist and establish escort.";
      case "sabotage":
        return this.sabotaged
          ? "Escape the facility through extraction."
          : "Sabotage the reactor terminal.";
    }
  }

  public resolveSuccess(casualties: string[], creditsEarned: number): void {
    if (this.missionState !== "active") {
      return;
    }

    const mission = MISSIONS[this.missionId];
    this.missionState = "success";
    this.onEnd({
      missionId: this.missionId,
      success: true,
      title: `${mission.name} complete`,
      summary: mission.successText,
      creditsEarned,
      casualties
    });
  }

  public resolveFailure(casualties: string[]): void {
    if (this.missionState !== "active") {
      return;
    }

    const mission = MISSIONS[this.missionId];
    this.missionState = "failure";
    this.onEnd({
      missionId: this.missionId,
      success: false,
      title: `${mission.name} failed`,
      summary: mission.failureText,
      creditsEarned: Math.floor(mission.reward * 0.25),
      casualties
    });
  }
}
