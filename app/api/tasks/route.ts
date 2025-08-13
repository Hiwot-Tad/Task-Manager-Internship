import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';

const prisma = new PrismaClient();

// GET /api/tasks - List tasks for authenticated user
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const categoryId = searchParams.get('categoryId');
    const category = searchParams.get('category'); // Filter by category name
    const dueDate = searchParams.get('dueDate'); // Filter by due date
    const search = searchParams.get('search'); // Search in title/description

    const where: any = {
      userId: request.user.userId
    };

    if (status) {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Filter by category name if provided
    if (category) {
      where.category = {
        name: {
          equals: category,
          mode: 'insensitive' // Case-insensitive search
        }
      };
    }

    // Filter by due date if provided
    if (dueDate) {
      const date = new Date(dueDate);
      where.dueAt = {
        gte: date,
        lt: new Date(date.getTime() + 24 * 60 * 60 * 1000) // Next day
      };
    }

    // Search in title and description
    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// POST /api/tasks - Create a new task
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { title, description, status, categoryId, dueAt } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: status || 'PENDING',
        categoryId: categoryId || null,
        dueAt: dueAt ? new Date(dueAt) : null,
        userId: request.user.userId
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json(
      { message: 'Task created successfully', task },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
