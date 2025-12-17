import { Injectable, NotFoundException } from "@nestjs/common";
import { ReadingRepository, ReadingSessionRepository } from "./reading.repository";
import { CreateBookDto, UpdateBookProgressDto, RateBookDto, CreateReadingSessionDto, BookStatus } from "./reading.dto";
import { RedisService } from "../adapters/redis/redis.service";

@Injectable()
export class ReadingService {
  private readonly CACHE_TTL_SECONDS = 300;
  private readonly CACHE_KEY_PREFIX = "reading:";

  constructor(
    private readonly bookRepo: ReadingRepository,
    private readonly sessionRepo: ReadingSessionRepository,
    private readonly redisService: RedisService
  ) {}

  async createBook(dto: CreateBookDto) {
    const book = await this.bookRepo.create({
      title: dto.title,
      author: dto.author || null,
      status: dto.status || BookStatus.READING,
      progress: dto.progress || 0,
      notes: dto.notes || null,
      startedAt: dto.status === BookStatus.READING ? new Date() : null,
    });

    await this.invalidateCache();
    return book;
  }

  async updateProgress(id: string, dto: UpdateBookProgressDto) {
    const book = await this.bookRepo.findById(id);
    if (!book) throw new NotFoundException("Book not found");

    const updateData: any = { progress: dto.progress };
    if (dto.status) {
      updateData.status = dto.status;
      if (dto.status === BookStatus.COMPLETED && !book.completedAt) {
        updateData.completedAt = new Date();
      }
      if (dto.status === BookStatus.READING && !book.startedAt) {
        updateData.startedAt = new Date();
      }
    }

    const updated = await this.bookRepo.update(id, updateData);
    await this.invalidateCache();
    return updated;
  }

  async rateBook(id: string, dto: RateBookDto) {
    const book = await this.bookRepo.findById(id);
    if (!book) throw new NotFoundException("Book not found");

    const updated = await this.bookRepo.update(id, { rating: dto.rating });
    await this.invalidateCache();
    return updated;
  }

  async getBooksByStatus(status?: BookStatus) {
    const cacheKey = `${this.CACHE_KEY_PREFIX}books:${status || "all"}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const books = status ? await this.bookRepo.findByStatus(status) : await this.bookRepo.findAll();
    await this.redisService.set(cacheKey, JSON.stringify(books), this.CACHE_TTL_SECONDS);
    return books;
  }

  async getBookById(id: string) {
    const cacheKey = `${this.CACHE_KEY_PREFIX}book:${id}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const book = await this.bookRepo.findById(id);
    if (!book) throw new NotFoundException("Book not found");

    await this.redisService.set(cacheKey, JSON.stringify(book), this.CACHE_TTL_SECONDS);
    return book;
  }

  async createReadingSession(dto: CreateReadingSessionDto) {
    const book = await this.bookRepo.findById(dto.bookId);
    if (!book) throw new NotFoundException("Book not found");

    const session = await this.sessionRepo.create({
      bookId: dto.bookId,
      pages: dto.pages || null,
      minutes: dto.minutes || null,
      notes: dto.notes || null,
      date: new Date(),
    });

    await this.invalidateCache();
    return session;
  }

  async getSessionsByBook(bookId: string) {
    return this.sessionRepo.findByBookId(bookId);
  }

  private async invalidateCache() {
    const keys = ["books:all", "books:READING", "books:COMPLETED", "books:WISHLIST"];
    for (const key of keys) {
      await this.redisService.del(`${this.CACHE_KEY_PREFIX}${key}`);
    }
  }
}
