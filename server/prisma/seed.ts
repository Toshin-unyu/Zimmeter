import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'メール/チャット', priority: 1 },
  { name: '実装/検証',       priority: 2 },
  { name: '会議',             priority: 3 },
  { name: '資料作成',         priority: 4 },
  { name: '商談/外出',       priority: 5 },
  { name: '電話対応',         priority: 6 },
  { name: '事務処理',         priority: 7 },
  { name: '休憩',             priority: 8 },
  { name: '離席/移動',       priority: 9 },
];

async function main() {
  // Admin User
  const admin = await prisma.user.upsert({
    where: { uid: 'admin' },
    update: {},
    create: {
      uid: 'admin',
      name: 'Administrator',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log({ admin });

  // Categories (冪等性を考慮してupsert等は難しいので、既存チェックなしでcreateする簡易実装とするか、一旦削除するか)
  // ここではシンプルに作成する。重複エラーが出る場合は別途対応。
  // 開発環境なので一旦全削除してから作るのがきれい。
  
  await prisma.workLog.deleteMany();
  await prisma.category.deleteMany();
  
  for (const cat of CATEGORIES) {
    await prisma.category.create({
      data: {
        name: cat.name,
        type: 'SYSTEM',
        createdById: admin.id,
        priority: cat.priority,
      },
    });
  }
  
  console.log('Seed data inserted');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
