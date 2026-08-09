export interface StorageObject {
  key: string;
  size?: number;
  updatedAt?: string;
}

export interface StorageProvider {
  readonly name: string;

  put(key: string, data: string | Uint8Array, contentType?: string): Promise<void>;

  get(key: string): Promise<Uint8Array | null>;

  getText(key: string): Promise<string | null>;

  exists(key: string): Promise<boolean>;

  delete(key: string): Promise<void>;

  list(prefix?: string): Promise<StorageObject[]>;
}
