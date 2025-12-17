import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PrismaBaseRepository } from "../application/prisma-base.repository";
import { Book, BookStatus } from "./reading.entity";

@Injectable()
export class ReadingRepository extends PrismaBaseRepository<Book> {
  constructor(private prisma: PrismaService) {
    super(prisma.book);
  }

  async findByStatus(status: BookStatus) {
    return this.prisma.book.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    return this.prisma.book.findUnique({ where: { id } });
  }
}

@Injectable()
export class ReadingSessionRepository extends PrismaBaseRepository<any> {
  constructor(private prisma: PrismaService) {
    super(prisma.readingSession);
  }

  async findByBookId(bookId: string) {
    return this.prisma.readingSession.findMany({
      where: { bookId },
      orderBy: { date: "desc" },
    });
  }
}
