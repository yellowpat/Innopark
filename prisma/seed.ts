import { PrismaClient, Canton, Role, Center } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Computus algorithm for Easter Sunday
function computeEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function dateOnly(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

function getSwissHolidays(year: number, canton: Canton) {
  const easter = computeEaster(year);
  const goodFriday = addDays(easter, -2);
  const easterMonday = addDays(easter, 1);
  const ascension = addDays(easter, 39);
  const whitMonday = addDays(easter, 50);
  const corpusChristi = addDays(easter, 60);

  // Common holidays for all cantons
  const common = [
    { date: dateOnly(year, 1, 1), name: "Nouvel An" },
    { date: dateOnly(year, 1, 2), name: "Saint-Berchtold" },
    { date: goodFriday, name: "Vendredi Saint" },
    { date: easterMonday, name: "Lundi de Pâques" },
    { date: ascension, name: "Ascension" },
    { date: whitMonday, name: "Lundi de Pentecôte" },
    { date: dateOnly(year, 8, 1), name: "Fête nationale" },
    { date: dateOnly(year, 12, 25), name: "Noël" },
  ];

  const cantonSpecific: Record<Canton, Array<{ date: Date; name: string }>> = {
    FR: [
      { date: corpusChristi, name: "Fête-Dieu" },
      { date: dateOnly(year, 8, 15), name: "Assomption" },
      { date: dateOnly(year, 11, 1), name: "Toussaint" },
      { date: dateOnly(year, 12, 8), name: "Immaculée Conception" },
    ],
    VD: [
      { date: dateOnly(year, 9, 15), name: "Lundi du Jeûne fédéral" }, // Approximate - 3rd Monday of September
    ],
    GE: [
      { date: dateOnly(year, 6, 5), name: "Fête de Genève" }, // Approximate - Thursday after first Sunday of September historically but June for Restoration
      { date: dateOnly(year, 9, 11), name: "Jeûne genevois" },
      { date: dateOnly(year, 12, 31), name: "Restauration de la République" },
    ],
  };

  // VD: Compute Monday after 3rd Sunday of September (Lundi du Jeûne)
  if (canton === "VD") {
    const sept1 = new Date(year, 8, 1); // September 1
    const dayOfWeek = sept1.getDay();
    // Find first Sunday
    const firstSunday = dayOfWeek === 0 ? 1 : 1 + (7 - dayOfWeek);
    // Third Sunday
    const thirdSunday = firstSunday + 14;
    // Monday after third Sunday
    const lundiJeune = thirdSunday + 1;
    cantonSpecific.VD = [
      { date: dateOnly(year, 9, lundiJeune), name: "Lundi du Jeûne fédéral" },
    ];
  }

  // GE: Jeûne genevois is Thursday after first Sunday of September
  if (canton === "GE") {
    const sept1 = new Date(year, 8, 1);
    const dayOfWeek = sept1.getDay();
    const firstSunday = dayOfWeek === 0 ? 1 : 1 + (7 - dayOfWeek);
    const jeuneGenevois = firstSunday + 4; // Thursday after first Sunday
    cantonSpecific.GE = [
      { date: dateOnly(year, 12, 31), name: "Restauration de la République" },
      {
        date: dateOnly(year, 9, jeuneGenevois),
        name: "Jeûne genevois",
      },
    ];
  }

  return [...common, ...(cantonSpecific[canton] || [])].map((h) => ({
    ...h,
    canton,
    year,
  }));
}

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@innopark.ch" },
    update: {},
    create: {
      email: "admin@innopark.ch",
      password: adminPassword,
      name: "Admin Innopark",
      role: Role.ADMIN,
      primaryCenter: Center.FRIBOURG,
    },
  });

  // Create a staff user for each center
  const staffPassword = await bcrypt.hash("staff123", 10);
  for (const center of [Center.FRIBOURG, Center.LAUSANNE, Center.GENEVA]) {
    const email = `staff-${center.toLowerCase()}@innopark.ch`;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password: staffPassword,
        name: `Staff ${center}`,
        role: Role.CENTER_STAFF,
        primaryCenter: center,
      },
    });
  }

  // Create sample participant
  const participantPassword = await bcrypt.hash("participant123", 10);
  await prisma.user.upsert({
    where: { email: "participant@innopark.ch" },
    update: {},
    create: {
      email: "participant@innopark.ch",
      password: participantPassword,
      name: "Jean Dupont",
      role: Role.PARTICIPANT,
      primaryCenter: Center.FRIBOURG,
    },
  });

  // Seed public holidays for 2026 for all cantons
  for (const canton of [Canton.FR, Canton.VD, Canton.GE]) {
    const holidays = getSwissHolidays(2026, canton);
    for (const holiday of holidays) {
      await prisma.publicHoliday.upsert({
        where: {
          date_canton: {
            date: holiday.date,
            canton: holiday.canton,
          },
        },
        update: { name: holiday.name },
        create: {
          date: holiday.date,
          name: holiday.name,
          canton: holiday.canton,
          year: holiday.year,
        },
      });
    }
    console.log(`Seeded ${holidays.length} holidays for ${canton}`);
  }

  console.log("Seeding complete!");
  console.log("Admin: admin@innopark.ch / admin123");
  console.log("Staff: staff-fribourg@innopark.ch / staff123");
  console.log("Participant: participant@innopark.ch / participant123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
