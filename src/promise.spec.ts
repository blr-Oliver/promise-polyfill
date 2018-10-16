import 'mocha';
import {expect} from 'chai';

class ManualResolver {
  resolve: Function;
  reject: Function;

  constructor() {
    this.task = this.task.bind(this);
  }

  task(resolve: Function, reject: Function) {
    this.resolve = resolve;
    this.reject = reject;
  }
}

const runDelayed = (cb) => setTimeout(cb, 0);

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
          promise.then((arg) => {
            ++count;
            value = arg;
            if (!firstToExecute)
              firstToExecute = 1;
          });
          promise.then(() => {
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
        })
      });
    })
  });
})(Promise);
