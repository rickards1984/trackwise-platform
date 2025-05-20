
// FILE: scripts/seedAdmin.ts
import { db } from "../server/db";
import { users } from "../shared/schema";
import bcrypt from "bcrypt";

async function seedAdmin() {
  const hashed = await bcrypt.hash("admin123", 10);
  await db.insert(users).values({
    username: "admin",
    email: "admin@example.com",
    password: hashed,
    role: "admin",
    firstName: "Admin",
    lastName: "Test",
    status: "active",
    createdAt: new Date(),
    lastLoginAt: null
  });
  console.log("✅ Admin user seeded: admin@example.com / admin123");
}

seedAdmin();
