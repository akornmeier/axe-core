// Bounded async delivery. Overflow is a transport failure, never silent event loss.
export class BoundedStream<T> implements AsyncIterableIterator<T> {
  private readonly values: T[] = [];
  private waiter:
    | { resolve: (value: IteratorResult<T>) => void; reject: (error: Error) => void }
    | undefined;
  private ended = false;
  private error: Error | undefined;
  constructor(
    private readonly limit = 64,
    private readonly onClose: () => void = () => {},
  ) {}

  push(value: T): void {
    if (this.ended) return;
    if (this.waiter) {
      this.waiter.resolve({ done: false, value });
      this.waiter = undefined;
    } else if (this.values.length >= this.limit) this.close(new Error("event-overflow"));
    else this.values.push(value);
  }

  close(error?: Error): void {
    if (this.ended) return;
    this.ended = true;
    this.error = error;
    if (error) this.values.length = 0;
    if (this.waiter) {
      if (error) this.waiter.reject(error);
      else this.waiter.resolve({ done: true, value: undefined });
      this.waiter = undefined;
    }
    this.onClose();
  }

  next(): Promise<IteratorResult<T>> {
    if (this.error) return Promise.reject(this.error);
    if (this.values.length > 0) {
      // Length, not payload value, distinguishes an empty queue (T may include undefined).
      return Promise.resolve({ done: false, value: this.values.shift() as T });
    }
    if (this.ended) return Promise.resolve({ done: true, value: undefined });
    if (this.waiter) return Promise.reject(new Error("Concurrent stream reads are not supported"));
    return new Promise((resolve, reject) => {
      this.waiter = { resolve, reject };
    });
  }

  async return(): Promise<IteratorResult<T>> {
    this.values.length = 0;
    this.close();
    return { done: true, value: undefined };
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    return this;
  }
}
