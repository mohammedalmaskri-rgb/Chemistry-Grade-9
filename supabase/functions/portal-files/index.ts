// Edge Function entry: wires the pure handler (handler.js) to Supabase Storage and the portal_file_* SQL functions.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform to every Edge Function; nothing is hard-coded here.
import { createClient } from "npm:@supabase/supabase-js@2";
import { BUCKET, createHandler } from "./handler.js";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const bucket = sb.storage.from(BUCKET);

Deno.serve(
  createHandler({
    rpc: (name: string, args: Record<string, unknown>) => sb.rpc(name, args),
    storage: {
      signedUpload: (path: string) => bucket.createSignedUploadUrl(path),
      signedUrl: (path: string, seconds: number, downloadName?: string) =>
        bucket.createSignedUrl(path, seconds, downloadName ? { download: downloadName } : undefined),
      upload: (path: string, bytes: Uint8Array, mime: string) =>
        bucket.upload(path, bytes, { contentType: mime, upsert: false, cacheControl: "3600" }),
    },
    uuid: () => crypto.randomUUID(),
  }),
);
