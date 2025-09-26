import { accessSync } from "fs";
import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";

import { Effect } from "effect";

export type FileSystemError = {
  readonly _tag: "FileSystemError";
  readonly type: "FILE_NOT_FOUND" | "PERMISSION_DENIED" | "INVALID_PATH" | "UNKNOWN_ERROR";
  readonly message: string;
  readonly cause?: Error;
};

export interface FileSystemAdapter {
  readonly readFile: (path: string) => Effect.Effect<string, FileSystemError>;
  readonly writeFile: (path: string, content: string) => Effect.Effect<void, FileSystemError>;
  readonly ensureDir: (path: string) => Effect.Effect<void, FileSystemError>;
  readonly exists: (path: string) => Effect.Effect<boolean>;
}

export const createFileSystemAdapter = (): FileSystemAdapter => ({
  readFile: (path: string) =>
    Effect.tryPromise({
      try: () => readFile(path, "utf-8"),
      catch: (error) => {
        const err = error as Error & { readonly code?: string };
        return {
          _tag: "FileSystemError",
          type: err.code === "ENOENT" ? "FILE_NOT_FOUND" : "UNKNOWN_ERROR",
          message: `Failed to read file ${path}: ${err.message}`,
          cause: err,
        } as FileSystemError;
      },
    }),

  writeFile: (path: string, content: string) =>
    Effect.tryPromise({
      try: () => writeFile(path, content, "utf-8"),
      catch: (error) => {
        const err = error as Error & { readonly code?: string };
        return {
          _tag: "FileSystemError",
          type: err.code === "EACCES" ? "PERMISSION_DENIED" : "UNKNOWN_ERROR",
          message: `Failed to write file ${path}: ${err.message}`,
          cause: err,
        } as FileSystemError;
      },
    }),

  ensureDir: (path: string) =>
    Effect.tryPromise({
      try: () => mkdir(dirname(path), { recursive: true }),
      catch: (error) => {
        const err = error as Error;
        return {
          _tag: "FileSystemError",
          type: "UNKNOWN_ERROR",
          message: `Failed to create directory for ${path}: ${err.message}`,
          cause: err,
        } as FileSystemError;
      },
    }),

  exists: (path: string) =>
    Effect.sync(() => {
      try {
        accessSync(path);
        return true;
      } catch {
        return false;
      }
    }),
});
