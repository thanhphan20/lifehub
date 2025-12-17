export enum BookStatus {
  READING = "READING",
  COMPLETED = "COMPLETED",
  WISHLIST = "WISHLIST",
}

export class Book {
  constructor(
    public readonly id: string,
    public title: string,
    public author: string | null,
    public status: BookStatus,
    public progress: number,
    public rating: number | null,
    public notes: string | null,
    public startedAt: Date | null,
    public completedAt: Date | null
  ) {}

  toObject() {
    return {
      id: this.id,
      title: this.title,
      author: this.author,
      status: this.status,
      progress: this.progress,
      rating: this.rating,
      notes: this.notes,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
    };
  }
}

export class ReadingSession {
  constructor(
    public readonly id: string,
    public bookId: string,
    public pages: number | null,
    public minutes: number | null,
    public notes: string | null,
    public date: Date
  ) {}

  toObject() {
    return {
      id: this.id,
      bookId: this.bookId,
      pages: this.pages,
      minutes: this.minutes,
      notes: this.notes,
      date: this.date,
    };
  }
}
