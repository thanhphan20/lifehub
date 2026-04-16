export class WorkoutLog {
  constructor(
    public readonly id: string,
    public type: string,
    public sets: number,
    public reps: number,
    public weight: number,
  ) {}

  toObject() {
    return {
      id: this.id,
      type: this.type,
      sets: this.sets,
      reps: this.reps,
      weight: this.weight,
    };
  }
}
