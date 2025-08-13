import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';

const prisma = new PrismaClient();

// GET /api/categories/stats - Get category statistics with task counts
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    // Get all categories with task counts for the user
    const categoriesWithCounts = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        _count: {
          select: {
            tasks: {
              where: {
                userId: request.user.userId
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Get total task count for the user
    const totalTasks = await prisma.task.count({
      where: {
        userId: request.user.userId
      }
    });

    // Get tasks by status count
    const tasksByStatus = await prisma.task.groupBy({
      by: ['status'],
      where: {
        userId: request.user.userId
      },
      _count: {
        status: true
      }
    });

    const stats = {
      totalCategories: categoriesWithCounts.length,
      totalTasks,
      categories: categoriesWithCounts.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        taskCount: cat._count.tasks
      })),
      tasksByStatus: tasksByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as Record<string, number>)
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Get category stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
