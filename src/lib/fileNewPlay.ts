import { store } from "./store";
import { uid } from "./types";

/** Where a new play is filed when it is first saved: a playbook id, or the name of one to make. */
export type FileTarget = { id: string } | { name: string };

/** Files a saved play at the end of its playbook (making the playbook if it is new). Returns that playbook. */
export function fileNewPlay(playId: string, target: FileTarget): { id: string; name: string } | null {
  const books = store.get().playbooks;
  const found =
    "id" in target ? books.find((b) => b.id === target.id) : books.find((b) => b.name.toLowerCase() === target.name.toLowerCase());
  if (!found && "id" in target) return null;
  const book = found ?? {
    id: uid("book"),
    name: "name" in target ? target.name : "",
    description: "",
    color: "#19C3AE",
    isPublic: false,
    updatedAt: new Date().toISOString(),
    playIds: [] as string[],
  };
  store.upsertPlaybook({ ...book, playIds: [...book.playIds.filter((p) => p !== playId), playId] });
  return { id: book.id, name: book.name };
}
