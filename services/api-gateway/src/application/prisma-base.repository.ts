export abstract class PrismaBaseRepository<T> {
  constructor(protected model: any) {}

  async findById(id: string): Promise<T | null> {
    return (this.model as any).findUnique({ where: { id } });
  }

  async findAll(): Promise<T[]> {
    return (this.model as any).findMany();
  }

  async findAllWithPagination(
    page: number = 1,
    perPage: number = 10,
    filters: Record<string, any> = {},
  ): Promise<{
    data: T[];
    meta: {
      total: number;
      page: number;
      perPage: number;
      totalPages: number;
    };
  }> {
    const skip = (page - 1) * perPage;

    const [data, total] = await Promise.all([
      this.model.findMany({
        take: perPage,
        skip,
        where: filters,
        orderBy: { createdAt: "desc" },
      }),
      this.model.count({ where: filters }),
    ]);

    const totalPages = Math.ceil(total / perPage);

    return {
      data,
      meta: {
        total,
        page,
        perPage,
        totalPages,
      },
    };
  }

  async create(data: any): Promise<T> {
    return (this.model as any).create({ data });
  }

  async update(id: string, data: any): Promise<T> {
    return (this.model as any).update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await (this.model as any).delete({ where: { id } });
  }
}
