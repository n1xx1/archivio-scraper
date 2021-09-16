declare module "node-fetch-cache" {
  import { Response } from "node-fetch";

  type MaybePromise<T> = PromiseLike<T> | T;

  const defaultFetch: {
    (...args: any[]): Promise<NFCResponse>;
    withCache: (cache: any) => typeof defaultFetch;
  };

  export default defaultFetch;
  export const fetchBuilder: typeof defaultFetch;

  interface CacheData {
    bodyStream: NodeJS.ReadableStream;
    metaData: any;
  }

  export class Cache {
    get(key: string): MaybePromise<undefined | CacheData>;

    set(
      key: string,
      bodyStream: NodeJS.ReadableStream,
      metaData: any,
    ): MaybePromise<undefined | CacheData>;

    remove(key: string): Promise<void> | void;
  }

  export class NFCResponse extends Response {}

  export class MemoryCache implements Cache {
    constructor(options?: { ttl?: number });
    get(key: string): MaybePromise<undefined | CacheData>;
    set(
      key: string,
      bodyStream: NodeJS.ReadableStream,
      metaData: any,
    ): MaybePromise<undefined | CacheData>;
    remove(key: string): Promise<void> | void;
  }

  export class FileSystemCache implements Cache {
    constructor(options?: { ttl?: number; cacheDirectory?: string });
    get(key: string): MaybePromise<undefined | CacheData>;
    set(
      key: string,
      bodyStream: NodeJS.ReadableStream,
      metaData: any,
    ): MaybePromise<undefined | CacheData>;
    remove(key: string): Promise<void> | void;
  }
}
