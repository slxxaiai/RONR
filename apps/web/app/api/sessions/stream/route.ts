import { handleCreateSessionStream } from "../../../../src/server/api";

export async function POST(request: Request): Promise<Response> {
  return handleCreateSessionStream(await request.json());
}
