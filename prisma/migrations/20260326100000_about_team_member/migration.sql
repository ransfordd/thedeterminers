-- CreateTable
CREATE TABLE "about_team_member" (
    "id" SERIAL NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "photo_path" VARCHAR(500) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "bio" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "about_team_member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "about_team_member_sort_order_idx" ON "about_team_member"("sort_order");
