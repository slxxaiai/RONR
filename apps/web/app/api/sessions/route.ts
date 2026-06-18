import { handleCreateSession } from "../../../src/server/api";

export async function POST(request: Request): Promise<Response> {
  return handleCreateSession(await request.json());
}
