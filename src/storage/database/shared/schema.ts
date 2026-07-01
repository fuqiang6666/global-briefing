import { pgTable, serial, timestamp, index, varchar, boolean, text, integer, jsonb, date } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

const uuid = () => sql`gen_random_uuid()`



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const mediaSources = pgTable("media_sources", {
	id: varchar({ length: 36 }).default(uuid()).primaryKey().notNull(),
	name: varchar({ length: 200 }).notNull(),
	url: varchar({ length: 500 }).notNull(),
	type: varchar({ length: 50 }).notNull(),
	region: varchar({ length: 50 }).default('global').notNull(),
	enabled: boolean().default(true).notNull(),
	remark: text(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("media_sources_enabled_idx").using("btree", table.enabled.asc().nullsLast().op("bool_ops")),
	index("media_sources_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const modelParams = pgTable("model_params", {
	id: varchar({ length: 36 }).default(uuid()).primaryKey().notNull(),
	version: integer().default(1).notNull(),
	isActive: boolean("is_active").default(false).notNull(),
	keywords: jsonb().default([]).notNull(),
	topicPreferences: jsonb("topic_preferences").default([]).notNull(),
	excludeWords: jsonb("exclude_words").default([]).notNull(),
	longTermCount: integer("long_term_count").default(2).notNull(),
	domesticImpactCount: integer("domestic_impact_count").default(3).notNull(),
	weeklyEventCount: integer("weekly_event_count").default(5).notNull(),
	minAuthLevel: integer("min_auth_level").default(3).notNull(),
	timeWindowHours: integer("time_window_hours").default(48).notNull(),
	note: text(),
	createdBy: varchar("created_by", { length: 100 }).default('manual').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("model_params_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("model_params_version_idx").using("btree", table.version.asc().nullsLast().op("int4_ops")),
]);

export const briefings = pgTable("briefings", {
	id: varchar({ length: 36 }).default(uuid()).primaryKey().notNull(),
	briefingDate: date("briefing_date").notNull(),
	section: varchar({ length: 50 }).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	title: varchar({ length: 200 }).notNull(),
	body: varchar({ length: 200 }).notNull(),
	source: varchar({ length: 200 }).notNull(),
	sourceUrl: varchar("source_url", { length: 500 }),
	confidence: varchar({ length: 20 }).notNull(),
	detailedAnalysis: text("detailed_analysis"),
	relatedSymbols: jsonb("related_symbols").default([]).notNull(),
	volatilityForecast: varchar("volatility_forecast", { length: 200 }),
	eventDate: date("event_date"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("briefings_date_idx").using("btree", table.briefingDate.asc().nullsLast().op("date_ops")),
	index("briefings_date_section_idx").using("btree", table.briefingDate.asc().nullsLast().op("date_ops"), table.section.asc().nullsLast().op("text_ops")),
	index("briefings_section_idx").using("btree", table.section.asc().nullsLast().op("text_ops")),
]);

export const futureEvents = pgTable("future_events", {
	id: varchar({ length: 36 }).default(uuid()).primaryKey().notNull(),
	eventDate: date("event_date").notNull(),
	title: varchar({ length: 200 }).notNull(),
	description: text().notNull(),
	category: varchar({ length: 50 }).default('other').notNull(),
	confidence: varchar({ length: 20 }).notNull(),
	potentialImpactSymbols: jsonb("potential_impact_symbols").default([]).notNull(),
	volatilityForecast: varchar("volatility_forecast", { length: 200 }),
	source: varchar({ length: 200 }),
	sourceUrl: varchar("source_url", { length: 500 }),
	detailedAnalysis: text("detailed_analysis"),
	status: varchar({ length: 30 }).default('pending').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("future_events_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("future_events_date_idx").using("btree", table.eventDate.asc().nullsLast().op("date_ops")),
	index("future_events_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const emailSettings = pgTable("email_settings", {
	id: varchar({ length: 36 }).default(uuid()).primaryKey().notNull(),
	enabled: boolean().default(false).notNull(),
	recipients: jsonb().default([]).notNull(),
	ccRecipients: jsonb("cc_recipients").default([]).notNull(),
	subjectPrefix: varchar("subject_prefix", { length: 100 }).default('每日全球要闻简报').notNull(),
	sendHour: integer("send_hour").default(8).notNull(),
	sendMinute: integer("send_minute").default(1).notNull(),
	includeMediaLibraryLink: boolean("include_media_library_link").default(true).notNull(),
	includeModelLink: boolean("include_model_link").default(true).notNull(),
	lastSentAt: timestamp("last_sent_at", { withTimezone: true, mode: 'string' }),
	note: text(),
	// SMTP 配置字段
	smtpHost: varchar("smtp_host", { length: 100 }),
	smtpPort: integer("smtp_port"),
	smtpUser: varchar("smtp_user", { length: 100 }),
	smtpPass: varchar("smtp_pass", { length: 100 }),
	smtpSecure: boolean("smtp_secure").default(true),
	smtpFromName: varchar("smtp_from_name", { length: 50 }),
	smtpFromEmail: varchar("smtp_from_email", { length: 100 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("email_settings_enabled_idx").using("btree", table.enabled.asc().nullsLast().op("bool_ops")),
]);

export const emailSendLog = pgTable("email_send_log", {
	id: varchar({ length: 36 }).default(uuid()).primaryKey().notNull(),
	sendDate: date("send_date").notNull(),
	recipients: jsonb().notNull(),
	subject: varchar({ length: 200 }).notNull(),
	status: varchar({ length: 30 }).notNull(),
	errorMessage: text("error_message"),
	briefingDate: date("briefing_date"),
	itemCount: integer("item_count").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("email_send_log_date_idx").using("btree", table.sendDate.asc().nullsLast().op("date_ops")),
	index("email_send_log_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

// 热点产业分析表
export const industryAnalysis = pgTable("industry_analysis", {
	id: varchar({ length: 36 }).default(uuid()).primaryKey().notNull(),
	analysisDate: date("analysis_date").notNull(),
	industryName: varchar("industry_name", { length: 100 }).notNull(),
	policyAnalysis: text("policy_analysis").notNull(),
	chainAnalysis: text("chain_analysis").notNull(),
	capacityFocus: text("capacity_focus").notNull(),
	techDevelopment: text("tech_development").notNull(),
	marketOutlook: text("market_outlook"),
	relatedSymbols: jsonb("related_symbols").default([]).notNull(),
	confidence: varchar({ length: 20 }).default('medium').notNull(),
	source: varchar({ length: 200 }),
	sourceUrl: varchar("source_url", { length: 500 }),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("industry_analysis_date_idx").using("btree", table.analysisDate.asc().nullsLast().op("date_ops")),
]);
