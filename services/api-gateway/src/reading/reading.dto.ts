import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";

export enum BookStatus {
  READING = "READING",
  COMPLETED = "COMPLETED",
  WISHLIST = "WISHLIST",
}

export class CreateBookDto {
  @ApiProperty({ example: "The Pragmatic Programmer", description: "Book title" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: "Andy Hunt", description: "Author name" })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({ example: "READING", enum: BookStatus, description: "Book status" })
  @IsOptional()
  @IsEnum(BookStatus)
  status?: BookStatus;

  @ApiPropertyOptional({ example: 25, description: "Progress percentage (0-100)", minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @ApiPropertyOptional({ example: "Great book on software development", description: "Notes about the book" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBookProgressDto {
  @ApiProperty({ example: 50, description: "Progress percentage (0-100)", minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  progress: number;

  @ApiPropertyOptional({ example: "READING", enum: BookStatus, description: "Update status if completed" })
  @IsOptional()
  @IsEnum(BookStatus)
  status?: BookStatus;
}

export class RateBookDto {
  @ApiProperty({ example: 5, description: "Rating (1-5 stars)", minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;
}

export class CreateReadingSessionDto {
  @ApiProperty({ example: "f0f9d1a4-1c23-4bb3-9a9d-1c2b3d4e5f6a", description: "Book ID" })
  @IsString()
  @IsNotEmpty()
  bookId: string;

  @ApiPropertyOptional({ example: 20, description: "Pages read" })
  @IsOptional()
  @IsInt()
  @Min(0)
  pages?: number;

  @ApiPropertyOptional({ example: 30, description: "Minutes spent reading" })
  @IsOptional()
  @IsInt()
  @Min(0)
  minutes?: number;

  @ApiPropertyOptional({ example: "Chapter 3 was insightful", description: "Session notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}
