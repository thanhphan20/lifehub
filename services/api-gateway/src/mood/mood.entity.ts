export class MoodLog {
  constructor(
    public readonly id: string,
    public rating: number,
    public tags: string[],
    public notes: string | null,
  ) {}

  toObject() {
    return {
      id: this.id,
      rating: this.rating,
      tags: this.tags,
      notes: this.notes,
    };
  }
}
