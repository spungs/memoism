-- 기준선(baseline) 마이그레이션 — 2026-09-30, `db push` 운영에서 마이그레이션 이력으로 전환(점검 D4).
--
-- 운영(Supabase 서울)과 로컬 DB에는 이 SQL을 **실행하지 않았다.** 두 DB가 이미 이 스키마와
-- 정확히 같아서(`prisma migrate diff` 결과 빈 마이그레이션) `prisma migrate resolve --applied 0_init`로
-- "적용됨" 기록만 남겼다. 이 파일이 실제로 실행되는 곳은 빈 DB(새 개발 환경, migrate dev의 shadow DB)뿐이다.
--
-- 생성: prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
-- 손으로 고친 곳 두 군데:
--   1) pgvector 확장 생성 — Prisma가 만들지 않는다. 운영과 같이 public 스키마에 둔다.
--   2) 벡터 컬럼 타입을 public.vector로 한정 — 마이그레이션은 search_path=app으로 실행돼
--      한정하지 않으면 타입을 못 찾는다(메모: pgvector는 public, Prisma 경로는 app).
-- 권한 차단(prisma/hardening.sql)·pg_cron 잡·Vault 시크릿은 Prisma 밖에서 관리한다 — 여기 넣지 않는다.

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "app";

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('NONE', 'TRIAL', 'ACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'BASIC', 'PRO');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "google_sub" TEXT,
    "external_llm_consent" BOOLEAN NOT NULL DEFAULT false,
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_personas" (
    "user_id" TEXT NOT NULL,
    "preset_key" TEXT NOT NULL DEFAULT 'factual',
    "tone" TEXT NOT NULL DEFAULT 'warm',
    "formality" TEXT NOT NULL DEFAULT 'casual',
    "sentence_length" TEXT NOT NULL DEFAULT 'medium',
    "perspective" TEXT NOT NULL DEFAULT 'first',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_personas_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "diaries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "previous_content" TEXT,
    "previous_changed_at" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'manual',
    "ai_generation_version" INTEGER NOT NULL DEFAULT 0,
    "content_edited_at" TIMESTAMP(3),
    "location" JSONB,
    "mood" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diary_images" (
    "id" TEXT NOT NULL,
    "diary_id" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL DEFAULT 0,
    "exif_taken_at" TIMESTAMP(3),
    "exif_lat" DOUBLE PRECISION,
    "exif_lng" DOUBLE PRECISION,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diary_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diary_fragments" (
    "id" TEXT NOT NULL,
    "diary_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "content" TEXT,
    "storage_path" TEXT,
    "exif" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "folded_at" TIMESTAMP(3),

    CONSTRAINT "diary_fragments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diary_embeddings" (
    "diary_id" TEXT NOT NULL,
    "vector" public.vector(768) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diary_embeddings_pkey" PRIMARY KEY ("diary_id")
);

-- CreateTable
CREATE TABLE "usage_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "ai_call_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'BASIC',
    "subscription_expires_at" TIMESTAMP(3),
    "storage_used_bytes" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "chat_reset_at" TIMESTAMP(3),
    "photo_vision_opt_in" BOOLEAN,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "related_diaries" JSONB,
    "capture_ref" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_sub_key" ON "users"("google_sub");

-- CreateIndex
CREATE INDEX "diaries_user_id_created_at_idx" ON "diaries"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "diary_images_diary_id_order_index_idx" ON "diary_images"("diary_id", "order_index");

-- CreateIndex
CREATE INDEX "diary_fragments_diary_id_created_at_idx" ON "diary_fragments"("diary_id", "created_at");

-- CreateIndex
CREATE INDEX "diary_fragments_diary_id_folded_at_idx" ON "diary_fragments"("diary_id", "folded_at");

-- CreateIndex
CREATE INDEX "usage_logs_user_id_date_idx" ON "usage_logs"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "usage_logs_user_id_date_key" ON "usage_logs"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "characters_user_id_key" ON "characters"("user_id");

-- CreateIndex
CREATE INDEX "characters_subscription_status_subscription_expires_at_idx" ON "characters"("subscription_status", "subscription_expires_at");

-- CreateIndex
CREATE INDEX "chat_messages_character_id_created_at_idx" ON "chat_messages"("character_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_messages_user_id_created_at_idx" ON "chat_messages"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- AddForeignKey
ALTER TABLE "user_personas" ADD CONSTRAINT "user_personas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diaries" ADD CONSTRAINT "diaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diary_images" ADD CONSTRAINT "diary_images_diary_id_fkey" FOREIGN KEY ("diary_id") REFERENCES "diaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diary_fragments" ADD CONSTRAINT "diary_fragments_diary_id_fkey" FOREIGN KEY ("diary_id") REFERENCES "diaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diary_embeddings" ADD CONSTRAINT "diary_embeddings_diary_id_fkey" FOREIGN KEY ("diary_id") REFERENCES "diaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
