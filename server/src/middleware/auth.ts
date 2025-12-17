import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { UserStatus } from '@prisma/client';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        uid: string;
        name: string;
        role: string;
        status: UserStatus;
      };
    }
  }
}

export const statusGuard = async (req: Request, res: Response, next: NextFunction) => {
  // Get UID from header or query
  const uid = (req.headers['x-user-id'] as string) || (req.query.uid as string);

  if (!uid) {
    // If no UID, proceed without user context (allow public access or handle in routes)
    return next();
  }

  try {
    // Find user
    let user = await prisma.user.findUnique({
      where: { uid },
    });

    // Auto-create for MVP if not exists
    if (!user) {
      user = await prisma.user.create({
        data: {
          uid,
          name: uid, // Default name
          role: 'USER',
          status: 'ACTIVE',
        },
      });
    }

    // Status Check
    if (user.status === 'DISABLED') {
      res.status(403).json({ 
        error: 'Account Disabled', 
        status: 'DISABLED',
        message: 'ユーザーを無効化しました。管理者に問い合わせてください。'
      });
      return;
    }

    if (user.status === 'DELETED') {
      res.status(403).json({ 
        error: 'Account Deleted', 
        status: 'DELETED', 
        message: 'ユーザーを削除しました。' 
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      uid: user.uid,
      name: user.name,
      role: user.role,
      status: user.status,
    };

    next();
  } catch (error) {
    // Prisma のユニーク制約違反 (同じ uid のユーザーが同時に作成された等) の場合は
    // 既存ユーザーを取り直して継続する。
    const anyError = error as any;
    if (anyError?.code === 'P2002') {
      try {
        const uid = (req.headers['x-user-id'] as string) || (req.query.uid as string);
        if (uid) {
          const existing = await prisma.user.findUnique({ where: { uid } });
          if (existing) {
            req.user = {
              id: existing.id,
              uid: existing.uid,
              name: existing.name,
              role: existing.role,
              status: existing.status,
            };
            return next();
          }
        }
      } catch (innerError) {
        console.error('Status Guard Recovery Error:', innerError);
      }
    }

    console.error('Status Guard Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
