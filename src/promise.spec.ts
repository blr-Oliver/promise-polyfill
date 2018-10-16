import 'mocha';
import {expect} from 'chai';

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
        it('has method "finally"', () => {
          // this one is failing for native Promise (node v8.11.3)
          expect(proto['finally']).to.be.a('function');
        });
      });
    })
  });
})(Promise);
