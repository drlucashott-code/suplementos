import { Prisma } from "@prisma/client";

function readErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function isMissingRelationError(error: unknown, relationName: string) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2010") {
    return false;
  }

  const message = readErrorMessage(error);
  return message.includes("42P01") && message.includes(`"${relationName}"`);
}

export function isMissingColumnError(error: unknown, columnName: string) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2010") {
    return false;
  }

  const message = readErrorMessage(error);
  return message.includes("42703") && message.includes(`"${columnName}"`);
}
