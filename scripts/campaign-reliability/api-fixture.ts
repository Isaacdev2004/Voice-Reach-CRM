export async function requireUserId() {
  if (!globalThis.__draftTestOwner) throw Error("Unauthorized");
  return globalThis.__draftTestOwner;
}
export const supabaseAdmin = {
  from(table: string) {
    const filters: Record<string, unknown> = {};
    let single = false;
    const query = {
      select: () => query,
      eq: (key: string, value: unknown) => {
        filters[key] = value;
        return query;
      },
      lt: () => query,
      order: () => query,
      limit: () => query,
      maybeSingle: () => {
        single = true;
        return query;
      },
      then(resolve: (value: unknown) => void) {
        globalThis.__draftTestQueries.push({ table, filters });
        resolve({ data: single ? null : [], error: null });
      },
    };
    return query;
  },
  async rpc(name: string, args: Record<string, unknown>) {
    globalThis.__draftTestRPC = { name, args };
    return globalThis.__draftTestRPCError
      ? { data: null, error: { message: globalThis.__draftTestRPCError } }
      : { data: { revision: 1, snapshot: args.p_snapshot }, error: null };
  },
};
declare global {
  var __draftTestOwner: string | undefined;
  var __draftTestQueries: Array<unknown>;
  var __draftTestRPC: { name: string; args: Record<string, unknown> };
  var __draftTestRPCError: string | undefined;
}
