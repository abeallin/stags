import PocketBase from "pocketbase";

const url = import.meta.env.VITE_PB_URL;
if (!url) {
  throw new Error("VITE_PB_URL is not set. Add it to web/.env.local for dev or as a GH Actions secret for build.");
}

export const pb = new PocketBase(url);

// Keep auth token across reloads — pocketbase-js does this in localStorage by default.
