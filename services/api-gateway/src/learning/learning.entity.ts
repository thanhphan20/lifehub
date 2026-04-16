export class Skill {
  constructor(
    public readonly id: string,
    public name: string,
    public proficiency: number,
    public notes: string | null,
  ) {}

  toObject() {
    return {
      id: this.id,
      name: this.name,
      proficiency: this.proficiency,
      notes: this.notes,
    };
  }
}

export class SelfTest {
  constructor(
    public readonly id: string,
    public skillId: string,
    public score: number | null,
    public notes: string | null,
    public date: Date,
  ) {}

  toObject() {
    return {
      id: this.id,
      skillId: this.skillId,
      score: this.score,
      notes: this.notes,
      date: this.date,
    };
  }
}
