export class WorkoutLog {
  constructor(
    public readonly id: string,
    public type: string,
    public sets: number,
    public reps: number,
    public weight: number,
    public enrichmentStatus?: string,
    public syncDetails: any = {},
  ) {}

  toObject() {
    return {
      id: this.id,
      type: this.type,
      sets: this.sets,
      reps: this.reps,
      weight: this.weight,
      enrichmentStatus: this.enrichmentStatus,
      syncDetails: this.syncDetails,
    };
  }
}
