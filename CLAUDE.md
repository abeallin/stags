# Project rules

## PocketBase migrations are always committed

Any new file under `pocketbase/pb_migrations/` MUST be committed in the same session it is written. Migrations are infrastructure Railway reads from `main` to rebuild the PocketBase image — an uncommitted migration is a divergence between local DB state and prod. Never leave them as untracked working-tree files, even briefly, and even when other unrelated work is in progress in parallel chats.

Apply the migration locally with `pocketbase.exe migrate up`, verify it does what you intended, then `git add` + `git commit` (do not push unless asked).
