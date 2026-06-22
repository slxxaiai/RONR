import { handleGetRecordDetail } from "../../../../src/server/api";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const params = await context.params;
  return handleGetRecordDetail(params.id, new URL(request.url).searchParams);
}
