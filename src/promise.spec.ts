import 'mocha';
import {expect} from 'chai';

class ManualResolver {
  resolve: Function;
  reject: Function;
  callback?: (resolve?: Function, reject?: Function) => void;

  constructor(callback?: (resolve: Function, reject: Function) => void) {
    this.callback = callback;
    this.task = this.task.bind(this);
  }

  task(resolve: Function, reject: Function) {
    this.resolve = resolve;
    this.reject = reject;
    if (this.callback) this.callback(resolve, reject);
  }
}

const runDelayed = (cb) => setTimeout(cb, 0);
const noop = x => x;

((subj) => {
  describe('Promise', () => {
    describe('Shape and typing', () => {
      describe('Static', () => {
        it('is defined', () => {
          expect(subj).not.undefined;
        });
        it('has method "resolve"', () => {
          expect(subj.resolve).to.be.a('function');
        });
        it('has method "reject"', () => {
          expect(subj.reject).to.be.a('function');
        });
        it('has method "all"', () => {
          expect(subj.all).to.be.a('function');
        });
        it('has method "race"', () => {
          expect(subj.race).to.be.a('function');
        });
      });
      describe('Prototype', () => {
        const proto = subj.prototype;
        it('is defined', () => {
          expect(proto).not.undefined;
        });
        it('has method "then"', () => {
          expect(proto.then).to.be.a('function');
        });
        it('has method "catch"', () => {
          expect(proto['catch']).to.be.a('function');
        });
        xit('has method "finally"', () => {
          // fails for native Promise (node v8.11.3)
          expect(proto['finally']).to.be.a('function');
        });
      });
    });
    describe('Execution', () => {
      let resolver, promise;
      beforeEach(() => {
        resolver = new ManualResolver();
        promise = new subj(resolver.task);
      });

      it('executes passed task immediately', () => {
        let executed = false;
        new subj(() => {
          executed = true;
        });
        expect(executed).to.be.equal(true);
      });
      it('provides resolve callback', () => {
        expect(resolver.resolve).to.be.a('function');
      });
      it('provides reject callback', () => {
        expect(resolver.reject).to.be.a('function');
      });
      it('never fires a handler before resolution', (done) => {
        let executed = false;
        const handler = () => executed = true;
        promise.then(handler, handler);
        promise['catch'](handler);
        promise['finally'] && promise['finally'](handler);
        runDelayed(() => {
          expect(executed).to.be.equal(false);
          done();
        });
      });
      it('can accept null handlers', () => {
        promise.then(null, null);
        promise['catch'](null);
      });
      describe('Fulfillment', () => {
        let count = 0, value, firstToExecute = 0;
        before(() => {
          promise.then(() => {
            if (!firstToExecute)
              firstToExecute = 1;
          });
          promise.then(arg => {
            ++count;
            value = arg;
            if (!firstToExecute)
              firstToExecute = 2;
          });
          resolver.resolve(42);
        });

        it('eventually fires handler exactly once', (done) => {
          runDelayed(() => {
            expect(count).to.be.equal(1);
            done();
          });
        });
        it('passes resolution value to the handler', (done) => {
          runDelayed(() => {
            expect(value).to.be.equal(42);
            done();
          });
        });
        it('ignores subsequent fulfillments', (done) => {
          resolver.resolve(1984);
          runDelayed(() => {
            expect(count).to.be.equal(1);
            expect(value).to.be.equal(42);
            done();
          });
        });
        xit('ignores subsequent rejections', (done) => {
          // fails for native Promise (node v8.11.3)
          let executed = false;
          promise['catch'](() => executed = true);
          resolver.reject('ignored');
          runDelayed(() => {
            expect(executed).to.be.equal(false);
            done();
          });
        });
        it('executes handlers in order', (done) => {
          runDelayed(() => {
            expect(firstToExecute).to.be.equal(1);
            done();
          });
        });
      });

      describe('Rejection', () => {
        // how fulfillment tests can be reused?
        let count = 0, value, firstToExecute = 0;
        before(() => {
          promise.then(null, () => {
            if (!firstToExecute)
              firstToExecute = 1;
          });
          promise.then(null, arg => {
            ++count;
            value = arg;
            if (!firstToExecute)
              firstToExecute = 2;
          });
          resolver.reject(42);
        });

        it('eventually fires handler exactly once', (done) => {
          runDelayed(() => {
            expect(count).to.be.equal(1);
            done();
          });
        });
        it('passes rejection value to the handler', (done) => {
          runDelayed(() => {
            expect(value).to.be.equal(42);
            done();
          });
        });
        it('rejects on exception', (done) => {
          const err = new Error('test');
          const failingResolver = new ManualResolver(() => {
            throw err;
          });
          const promise = new subj(failingResolver.task);
          let value;
          promise.then(null, arg => value = arg);
          runDelayed(() => {
            expect(value).to.equal(err);
            done();
          })
        });
        xit('ignores subsequent rejections', (done) => {
          // this (un)surprisingly causes node to emit UnhandledPromiseRejectionWarning
          // when obviously there is a catch handler (two actually)
          resolver.reject(1984);
          runDelayed(() => {
            expect(count).to.be.equal(1);
            expect(value).to.be.equal(42);
            done();
          });
        });
        xit('ignores subsequent fulfillments', (done) => {
          // fails for native Promise (node v8.11.3)
          let executed = false;
          promise.then(() => executed = true);
          resolver.resolve('ignored');
          runDelayed(() => {
            expect(executed).to.be.equal(false);
            done();
          });
        });
        it('executes handlers in order', (done) => {
          runDelayed(() => {
            expect(firstToExecute).to.be.equal(1);
            done();
          });
        });
      });
    });

    describe('Pipes', () => {
      let resolver, promise;
      beforeEach(() => {
        resolver = new ManualResolver();
        promise = new subj(resolver.task);
      });

      describe('Fulfillment', () => {
        it('creates new promise with "then"', () => {
          expect(promise.then(noop) instanceof subj).to.equal(true);
        });

        it('passes modified value to chained handler', (done) => {
          const chained = promise.then(() => 42);
          let value;
          chained.then(arg => value = arg);
          resolver.resolve('ignored');
          runDelayed(() => {
            expect(value).to.equal(42);
            done();
          })
        });

        it('rejects chained promise when original fails', (done) => {
          const chained = promise.then(noop);
          let value;
          chained.then(null, arg => value = arg);
          resolver.reject(42);
          runDelayed(() => {
            expect(value).to.equal(42);
            done();
          });
        })
      });

      describe('Rejection', () => {
        it('creates new promise with "catch"', () => {
          expect(promise['catch'](noop) instanceof subj).to.equal(true);
        });

        it('never rejects chained handler without exceptions', (done) => {
          const chained = promise.then(null, noop);
          let executed = false;
          chained.then(null, () => executed = true);
          resolver.reject('ignored');
          runDelayed(() => {
            expect(executed).to.equal(false);
            done();
          })
        });

        it('overrides original cause with exception', (done) => {
          const err = new Error('test');
          const chained = promise.then(null, () => {
            throw err;
          });
          let value;
          chained.then(null, arg => value = arg);
          resolver.reject('ignored');
          runDelayed(() => {
            expect(value).to.equal(err);
            done();
          })
        });

      });
    });

    describe('With other promises', () => {
      it('should do well with promises as resolve values', () => {
        expect.fail();
      })
    })
  });
})(Promise);
