export class MealLog {
  constructor(
    public readonly id: string,
    public description: string,
    public date: Date,
    public calories: number,
    public protein: number,
    public carbs: number,
    public fat: number
  ) {}

  toObject() {
    return {
      id: this.id,
      description: this.description,
      date: this.date,
      calories: this.calories,
      protein: this.protein,
      carbs: this.carbs,
      fat: this.fat,
    };
  }
}
