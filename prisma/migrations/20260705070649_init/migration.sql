-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ShopperSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user" TEXT NOT NULL,
    "events" TEXT NOT NULL,
    "rulePrediction" TEXT,
    "ruleExplanations" TEXT,
    "aiClassification" TEXT,
    "confidence" INTEGER,
    "evidence" TEXT,
    "recommendedAction" TEXT,
    "reasoning" TEXT,
    "abVariant" TEXT NOT NULL,
    "isConversion" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ABTestStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classification" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "ABTestStats_classification_variant_key" ON "ABTestStats"("classification", "variant");
