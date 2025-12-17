import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ReadingService } from "./reading.service";
import { CreateBookDto, UpdateBookProgressDto, RateBookDto, CreateReadingSessionDto, BookStatus } from "./reading.dto";

@ApiTags("reading")
@Controller("reading")
export class ReadingController {
  constructor(private readonly readingService: ReadingService) {}

  @Post("books")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Add a book to reading log" })
  @ApiResponse({ status: 201, description: "Book created" })
  async createBook(@Body() dto: CreateBookDto) {
    return this.readingService.createBook(dto);
  }

  @Get("books")
  @ApiOperation({ summary: "Get books by status" })
  @ApiQuery({ name: "status", required: false, enum: BookStatus, description: "Filter by status" })
  @ApiResponse({ status: 200, description: "List of books" })
  async getBooks(@Query("status") status?: BookStatus) {
    return this.readingService.getBooksByStatus(status);
  }

  @Get("books/:id")
  @ApiOperation({ summary: "Get book by ID" })
  @ApiParam({ name: "id", description: "Book ID" })
  @ApiResponse({ status: 200, description: "Book details" })
  async getBookById(@Param("id") id: string) {
    return this.readingService.getBookById(id);
  }

  @Patch("books/:id/progress")
  @ApiOperation({ summary: "Update book progress" })
  @ApiParam({ name: "id", description: "Book ID" })
  @ApiResponse({ status: 200, description: "Progress updated" })
  async updateProgress(@Param("id") id: string, @Body() dto: UpdateBookProgressDto) {
    return this.readingService.updateProgress(id, dto);
  }

  @Patch("books/:id/rating")
  @ApiOperation({ summary: "Rate a book (1-5 stars)" })
  @ApiParam({ name: "id", description: "Book ID" })
  @ApiResponse({ status: 200, description: "Rating updated" })
  async rateBook(@Param("id") id: string, @Body() dto: RateBookDto) {
    return this.readingService.rateBook(id, dto);
  }

  @Post("sessions")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Log a reading session" })
  @ApiResponse({ status: 201, description: "Reading session created" })
  async createSession(@Body() dto: CreateReadingSessionDto) {
    return this.readingService.createReadingSession(dto);
  }

  @Get("books/:id/sessions")
  @ApiOperation({ summary: "Get reading sessions for a book" })
  @ApiParam({ name: "id", description: "Book ID" })
  @ApiResponse({ status: 200, description: "List of reading sessions" })
  async getSessions(@Param("id") id: string) {
    return this.readingService.getSessionsByBook(id);
  }
}
