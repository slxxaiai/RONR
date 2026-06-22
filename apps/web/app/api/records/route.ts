import { handleListRecords } from "../../../src/server/api";

export async function GET(request: Request): Promise<Response> {
  return handleListRecords(new URL(request.url).searchParams);
}
