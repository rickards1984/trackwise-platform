import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  decimal
} from "drizzle-orm/pg-core";

// Session storage table
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).unique().notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default('learner'),
  status: varchar("status", { length: 50 }).notNull().default('unverified'),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Learning goals
export const learningGoals = pgTable("learning_goals", {
  id: serial("id").primaryKey(),
  learnerId: integer("learner_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  targetDate: timestamp("target_date"),
  status: varchar("status", { length: 50 }).notNull().default('active'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// OTJ Log entries
export const otjLogEntries = pgTable("otj_log_entries", {
  id: serial("id").primaryKey(),
  learnerId: integer("learner_id").notNull(),
  date: timestamp("date").notNull(),
  hours: decimal("hours", { precision: 4, scale: 2 }).notNull(),
  description: text("description").notNull(),
  supervisorName: varchar("supervisor_name", { length: 255 }),
  verified: boolean("verified").default(false),
  verifiedBy: integer("verified_by"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});