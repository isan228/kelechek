import "../src/loadEnv.js";
import { Prisma, PrismaClient, ContentStatus, ContentType, Locale, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function ensureDemoUsers() {
  await prisma.user.upsert({
    where: { phone: "+996700000000" },
    create: {
      phone: "+996700000000",
      roles: [UserRole.ADMIN, UserRole.CONTENT_EDITOR],
      firstName: "Админ",
      locale: Locale.ru,
      phoneVerifiedAt: new Date(),
    },
    update: {
      roles: [UserRole.ADMIN, UserRole.CONTENT_EDITOR],
      status: "ACTIVE",
      deletedAt: null,
    },
  });
  await prisma.user.upsert({
    where: { phone: "+996700000001" },
    create: {
      phone: "+996700000001",
      roles: [UserRole.COACH],
      firstName: "Айбек",
      lastName: "Тренер",
      locale: Locale.ru,
      phoneVerifiedAt: new Date(),
      coachCounter: { create: { activeRelationCount: 0 } },
    },
    update: {},
  });
}

async function main() {
  await ensureDemoUsers();
  if ((await prisma.tariff.count()) > 0) {
    console.log("Seed skipped: data already present. Admin +996700000000");
    return;
  }

  await prisma.ratePlan.create({
    data: {
      traineeSoloBps: 8200,
      traineeWithCoachBps: 3200,
      coachBps: 5000,
      validFrom: new Date("2026-01-01T00:00:00Z"),
    },
  });

  const tariff = await prisma.tariff.create({
    data: {
      priceKgs: 1000,
      periodDays: 30,
      isActive: true,
      translations: {
        create: [
          {
            locale: Locale.ru,
            name: "Месячный абонемент",
            description:
              "30 дней доступа к занятиям и материалам. Часть оплаты накапливается к образованию.",
          },
          {
            locale: Locale.ky,
            name: "Айлык абонемент",
            description:
              "Машыгууларга жана материалдарга 30 күн жетки. Төлөмдүн бир бөлүгү билимге топтолот.",
          },
        ],
      },
    },
  });

  await prisma.withdrawalPolicyVersion.create({
    data: {
      version: 1,
      isActive: true,
      rules: {
        create: [
          { code: "HOLDING_PERIOD", enabled: true, paramsJson: { months: 12 } },
          { code: "MIN_AMOUNT", enabled: true, paramsJson: { minKgs: 1000 } },
          { code: "ENROLLMENT_DOCUMENT", enabled: true, paramsJson: {} },
          {
            code: "PAYMENT_STREAK",
            enabled: false,
            paramsJson: { freezeOnBreak: true },
          },
          { code: "NO_OPEN_DEBT", enabled: true, paramsJson: {} },
        ],
      },
    },
  });

  await prisma.systemConfig.createMany({
    data: [
      { key: "activePayoutMethod", value: "CARD" },
      { key: "maxActiveTrainees", value: Prisma.JsonNull },
      { key: "graceDays", value: 0 },
    ],
  });

  const editor = await prisma.user.upsert({
    where: { phone: "+996700000000" },
    create: {
      phone: "+996700000000",
      roles: [UserRole.ADMIN, UserRole.CONTENT_EDITOR],
      firstName: "Админ",
      locale: Locale.ru,
      phoneVerifiedAt: new Date(),
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { phone: "+996700000001" },
    create: {
      phone: "+996700000001",
      roles: [UserRole.COACH],
      firstName: "Айбек",
      lastName: "Тренер",
      locale: Locale.ru,
      phoneVerifiedAt: new Date(),
      coachCounter: { create: { activeRelationCount: 0 } },
    },
    update: {},
  });

  await prisma.contentItem.create({
    data: {
      type: ContentType.ARTICLE,
      status: ContentStatus.PUBLISHED,
      authorId: editor.id,
      reviewerId: editor.id,
      reviewedAt: new Date(),
      publishedAt: new Date(),
      bodyJson: {},
      translations: {
        create: [
          {
            locale: Locale.ru,
            title: "Зачем нужна регулярность",
            summary: "Как серия занятий помогает держать форму и копить к учёбе.",
            bodyRich:
              "<p>Материал носит информационный характер и не заменяет консультацию врача или квалифицированного тренера.</p><p>Регулярные занятия важнее редких интенсивных тренировок. Оплачивайте месяц за месяцем — так растёт и серия, и накопление к образованию.</p>",
            contraindications: null,
          },
          {
            locale: Locale.ky,
            title: "Үзгүлтүксүздүк эмне үчүн керек",
            summary: "Машыгуу сериясы форманы жана окууга топтоону кантип колдойт.",
            bodyRich:
              "<p>Материал маалыматтык мүнөзгө ээ жана дарыгердин же квалификациялуу машыктыруучунун кеңешин алмаштырбайт.</p><p>Сейрек оор машыгууга караганда үзгүлтүксүз сабактар маанилүү.</p>",
            contraindications: null,
          },
        ],
      },
    },
  });

  await prisma.contentItem.create({
    data: {
      type: ContentType.EXERCISE,
      status: ContentStatus.PUBLISHED,
      authorId: editor.id,
      reviewerId: editor.id,
      reviewedAt: new Date(),
      publishedAt: new Date(),
      bodyJson: { sets: 3, reps: 10 },
      translations: {
        create: [
          {
            locale: Locale.ru,
            title: "Приседания с собственным весом",
            summary: "Базовое упражнение для ног. Смотрите технику до начала.",
            bodyRich:
              "<p>Материал носит информационный характер и не заменяет консультацию врача или квалифицированного тренера.</p><p>Стопы на ширине плеч, спина нейтральна, колени направлены по носкам.</p>",
            contraindications:
              "Боль в коленях, свежая травма поясницы. Перед началом проконсультируйтесь с врачом.",
          },
          {
            locale: Locale.ky,
            title: "Өз салмагы менен отуруп-туруу",
            summary: "Буттар үчүн негизги көнүгүү. Баштоодон мурун техниканы караңыз.",
            bodyRich:
              "<p>Материал маалыматтык мүнөзгө ээ жана дарыгердин же машыктыруучунун кеңешин алмаштырбайт.</p>",
            contraindications:
              "Тизе оорусу, белдин жаңы жаракаты. Баштоодон мурун дарыгерге кайрылыңыз.",
          },
        ],
      },
    },
  });

  console.log("Seed OK. Tariff", tariff.id);
  console.log("Demo phones: +996700000000 admin, +996700000001 coach. OTP printed in API log.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });
