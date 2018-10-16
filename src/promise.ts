type Handler = (any?) => any;
type Status = -1 | 0 | 1;
type Task = (resolve?: Function, reject?: Function) => any;

export class PromisePolyfill {
  private status: Status = 0;
  private value: any;
  private children: PromisePolyfill[] = [];
  private resolveHandler?: Handler;
  private rejectHandler?: Handler;

  constructor(task: Task) {
    try {
      task.call(this, this.resolveWith.bind(this), this.rejectWith.bind(this));
    } catch (ex) {
      this.rejectWith(ex);
    }
  }

  static resolve(valueOrPromise?: PromisePolyfill): PromisePolyfill;

  static resolve(valueOrPromise?: any): PromisePolyfill {
    if (valueOrPromise instanceof PromisePolyfill)
      return valueOrPromise;
    return new PromisePolyfill(resolve => resolve(valueOrPromise));
  }

  static reject(valueOrPromise: any): PromisePolyfill {
    return new PromisePolyfill((_, reject) => PromisePolyfill.resolve(valueOrPromise).then(<Handler> reject));
  }

  then(resolveHandler?: Handler, rejectHandler?: Handler): PromisePolyfill {
    if (!resolveHandler && !rejectHandler) return this;
    switch (this.status) {
      case -1:
        if (rejectHandler)
          return new PromisePolyfill((_, reject) => {
            reject(rejectHandler(this.value));
          });
        return this;
      case 0:
        let promise = new PromisePolyfill(() => {
        });
        if (resolveHandler) promise.resolveHandler = resolveHandler;
        if (rejectHandler) promise.rejectHandler = rejectHandler;
        this.children.push(promise);
        return promise;
      case 1:
        if (resolveHandler)
          return new PromisePolyfill(resolve => {
            resolve(resolveHandler(this.value));
          });
        return this;
    }
  }

  'catch'(rejectHandler: Handler): PromisePolyfill {
    return this.then(null, rejectHandler);
  }

  private resolveWith(value?: any) {
    if (this.status !== 0) return;
    if (this.resolveHandler) {
      try {
        value = this.resolveHandler(value);
      } catch (ex) {
        this.rejectWith(ex);
        return;
      }
    }
    this.value = value;
    for (let child of this.children) {
      setTimeout(() => {
        child.resolveWith(value);
      }, 0);
    }
    this.status = 1;
    this.resolveHandler = null;
    this.rejectHandler = null;
    this.children = null;
  }

  private rejectWith(value?: any) {
    if (this.status !== 0) return;
    if (this.rejectHandler) {
      try {
        this.rejectHandler(value);
      } catch (ex) {
        value = ex;
      }
    }
    this.value = value;
    for (let child of this.children) {
      setTimeout(() => {
        child.rejectWith(value);
      }, 0);
    }
    this.status = -1;
    this.resolveHandler = null;
    this.rejectHandler = null;
    this.children = null;
  }
}