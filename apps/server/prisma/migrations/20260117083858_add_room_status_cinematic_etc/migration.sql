-- AlterEnum
ALTER TYPE "RoomStatus" ADD VALUE 'CINEMATIC';

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "isLeader" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "maxPlayers" INTEGER NOT NULL DEFAULT 10;
