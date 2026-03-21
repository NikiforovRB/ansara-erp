import { customAlphabet } from "nanoid";

const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";

export const generateProjectSlug = customAlphabet(alphabet, 6);
