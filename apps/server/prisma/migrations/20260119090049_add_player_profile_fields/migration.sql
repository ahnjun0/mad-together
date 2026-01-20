/*
  Warnings:

  - You are about to drop the column `isHost` on the `Player` table. All the data in the column will be lost.
  - Added the required column `nickname` to the `Player` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Player" DROP COLUMN "isHost",
ADD COLUMN     "nickname" TEXT NOT NULL,
ADD COLUMN     "profileImage" TEXT;
