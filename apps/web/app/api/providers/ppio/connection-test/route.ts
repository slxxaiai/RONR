import { handleProviderConnectionTest } from "../../../../../src/server/api";

export async function GET(): Promise<Response> {
  return handleProviderConnectionTest();
}
