import { expect } from 'chai';
import { of, interval, EMPTY } from 'rxjs';
import { audit, take, mergeMap } from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';
import { assertDeepEquals } from 'rxjs/internal/test_helpers/assertDeepEquals';

declare function asDiagram(arg: string): Function;

/** @test {audit} */
describe('audit operator', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(assertDeepEquals);
  });

  //asDiagram('audit')
  it('should emit the last value in each time window', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
      const e1 =   hot('-a-xy-----b--x--cxxx-|');
      const e1subs =   '^                    !';
      const e2 =  cold( '----|                ');
      const e2subs =  [' ^   !                ',
                       '          ^   !       ',
                       '                ^   ! '];
      const expected = '-----y--------x-----x|';

      const result = e1.pipe(audit(() => e2));

      expectObservable(result).toBe(expected);
      expectSubscriptionsTo(e1).toBe(e1subs);
      expectSubscriptionsTo(e2).toBe(e2subs);
    });
  });

  it('should delay the source if values are not emitted often enough', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
      const e1 =   hot('-a--------b-----c----|');
      const e1subs =   '^                    !';
      const e2 =  cold( '----|                ');
      const e2subs =  [' ^   !                ',
                    '          ^   !       ',
                    '                ^   ! '];
      const expected = '-----a--------b-----c|';

      const result = e1.pipe(audit(() => e2));

      expectObservable(result).toBe(expected);
      expectSubscriptionsTo(e1).toBe(e1subs);
      expectSubscriptionsTo(e2).toBe(e2subs);
    });
  });

  it('should audit with duration Observable using next to close the duration', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
      const e1 =   hot('-a-xy-----b--x--cxxx-|');
      const e1subs =   '^                    !';
      const e2 =  cold( '----x-y-z            ');
      const e2subs =  [' ^   !                ',
                    '          ^   !       ',
                    '                ^   ! '];
      const expected = '-----y--------x-----x|';

      const result = e1.pipe(audit(() => e2));

      expectObservable(result).toBe(expected);
      expectSubscriptionsTo(e1).toBe(e1subs);
      expectSubscriptionsTo(e2).toBe(e2subs);
    });
  });

  it('should interrupt source and duration when result is unsubscribed early', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
      const e1 =   hot('-a-x-y-z-xyz-x-y-z----b--x-x-|');
      const unsub =    '              !               ';
      const e1subs =   '^             !               ';
      const e2 =  cold( '-----x------------|          ');
      const e2subs =  [' ^    !                       ',
                    '       ^    !                 ',
                    '             ^!               '];
      const expected = '------y-----z--               ';

      const result = e1.pipe(audit(() => e2));

      expectObservable(result, unsub).toBe(expected);
      expectSubscriptionsTo(e1).toBe(e1subs);
      expectSubscriptionsTo(e2).toBe(e2subs);
    });
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
      const e1 =   hot('-a-x-y-z-xyz-x-y-z----b--x-x-|');
      const e1subs =   '^             !               ';
      const e2 =  cold( '-----x------------|          ');
      const e2subs =  [' ^    !                       ',
                    '       ^    !                 ',
                    '             ^!               '];
      const expected = '------y-----z--               ';
      const unsub =    '              !               ';

      const result = e1.pipe(
        mergeMap((x: string) => of(x)),
        audit(() => e2),
        mergeMap((x: string) => of(x))
      );

      expectObservable(result, unsub).toBe(expected);
      expectSubscriptionsTo(e1).toBe(e1subs);
      expectSubscriptionsTo(e2).toBe(e2subs);
    });
  });

  it('should handle a busy producer emitting a regular repeating sequence', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
      const e1 =   hot('abcdefabcdefabcdefabcdefa|');
      const e1subs =   '^                        !';
      const e2 =  cold('-----|                    ');
      const e2subs =  ['^    !                    ',
                       '      ^    !              ',
                       '            ^    !        ',
                       '                  ^    !  ',
                       '                        ^!'];
      const expected = '-----f-----f-----f-----f-|';

      const result = e1.pipe(audit(() => e2));

      expectObservable(result).toBe(expected);
      expectSubscriptionsTo(e1).toBe(e1subs);
      expectSubscriptionsTo(e2).toBe(e2subs);
    });
  });

  it('should mirror source if durations are always empty', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
      const e1 =   hot('abcdefabcdefabcdefabcdefa|');
      const e1subs =   '^                        !';
      const e2 =  cold('|');
      const expected = 'abcdefabcdefabcdefabcdefa|';

      const result = e1.pipe(audit(() => e2));

      expectObservable(result).toBe(expected);
      expectSubscriptionsTo(e1).toBe(e1subs);
    });
  });

  it('should mirror source if durations are EMPTY', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
      const e1 =   hot('abcdefabcdefabcdefabcdefa|');
      const e1subs =   '^                        !';
      const e2 =  EMPTY;
      const expected = 'abcdefabcdefabcdefabcdefa|';

      const result = e1.pipe(audit(() => e2));

      expectObservable(result).toBe(expected);
      expectSubscriptionsTo(e1).toBe(e1subs);
    });
  });

  it('should emit no values if duration is a never', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
      const e1 =   hot('----abcdefabcdefabcdefabcdefa|');
      const e1subs =   '^                            !';
      const e2 =  cold('-');
      const e2subs =   '    ^                        !';
      const expected = '-----------------------------|';

      const result = e1.pipe(audit(() => e2));

      expectObservable(result).toBe(expected);
      expectSubscriptionsTo(e1).toBe(e1subs);
      expectSubscriptionsTo(e2).toBe(e2subs);
    });
  });

  it('should unsubscribe duration Observable when source raise error', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
      const e1 =   hot('----abcdefabcdefabcdefabcdefa#');
      const e1subs =   '^                            !';
      const e2 =  cold('-');
      const e2subs =   '    ^                        !';
      const expected = '-----------------------------#';

      const result = e1.pipe(audit(() => e2));

      expectObservable(result).toBe(expected);
      expectSubscriptionsTo(e1).toBe(e1subs);
      expectSubscriptionsTo(e2).toBe(e2subs);
    });
  });

  it('should mirror source if durations are synchronous observables', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
      const e1 =   hot('abcdefabcdefabcdefabcdefa|');
      const e1subs =   '^                        !';
      const e2 =  of('one single value');
      const expected = 'abcdefabcdefabcdefabcdefa|';

      const result = e1.pipe(audit(() => e2));

      expectObservable(result).toBe(expected);
      expectSubscriptionsTo(e1).toBe(e1subs);
    });
  });

  it('should raise error as soon as just-throw duration is used', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
      const e1 =   hot('----abcdefabcdefabcdefabcdefa|');
      const e1subs =   '^   !                         ';
      const e2 =  cold('#');
      const e2subs =   '    (^!)                      ';
      const expected = '----(-#)                      ';

      const result = e1.pipe(audit(() => e2));

      expectObservable(result).toBe(expected);
      expectSubscriptionsTo(e1).toBe(e1subs);
      expectSubscriptionsTo(e2).toBe(e2subs);
    });
  });

  it('should audit using durations of constying lengths', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
      const e1 =   hot('abcdefabcdabcdefghabca|   ');
      const e1subs =   '^                     !   ';
      const e2 = [cold('-----|                    '),
                cold(      '---|                '),
                cold(          '-------|        '),
                cold(                  '--|     '),
                cold(                     '----|')];
      const e2subs =  ['^    !                    ',
                       '      ^  !                ',
                       '          ^      !        ',
                       '                  ^ !     ',
                       '                     ^!   '];
      const expected = '-----f---d-------h--c-|   ';

      let i = 0;
      const result = e1.pipe(audit(() => e2[i++]));

      expectObservable(result).toBe(expected);
      expectSubscriptionsTo(e1).toBe(e1subs);
      for (let j = 0; j < e2.length; j++) {
        expectSubscriptionsTo(e2[j]).toBe(e2subs[j]);
      }
    });
  });

  it('should propagate error from duration Observable', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
      const e1 =   hot('abcdefabcdabcdefghabca|   ');
      const e1subs =   '^                !        ';
      const e2 = [cold('-----|                    '),
                  cold(      '---|                '),
                  cold(          '-------#        ')];
      const e2subs =  ['^    !                    ',
                      '      ^  !                ',
                      '          ^      !        '];
      const expected = '-----f---d-------#        ';

      let i = 0;
      const result = e1.pipe(audit(() => e2[i++]));

      expectObservable(result).toBe(expected);
      expectSubscriptionsTo(e1).toBe(e1subs);
      for (let j = 0; j < e2.length; j++) {
        expectSubscriptionsTo(e2[j]).toBe(e2subs[j]);
      }
    });
  });

  it('should propagate error thrown from durationSelector function', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
      const e1 =   hot('abcdefabcdabcdefghabca|   ');
      const e1subs =   '^         !               ';
      const e2 = [cold('-----|                    '),
                  cold(      '---|                '),
                  cold(          '-------|        ')];
      const e2subs =  ['^    !                    ',
                       '      ^  !                '];
      const expected = '-----f---d#                ';

      let i = 0;
      const result = e1.pipe(
        audit(() => {
          if (i === 2) {
            throw 'error';
          }
          return e2[i++];
        })
      );

      expectObservable(result).toBe(expected);
      expectSubscriptionsTo(e1).toBe(e1subs);
      for (let j = 0; j < e2subs.length; j++) {
        expectSubscriptionsTo(e2[j]).toBe(e2subs[j]);
      }
    });
  });

  it('should complete when source does not emit', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
      const e1 =   hot('-----|');
      const subs =     '^    !';
      const expected = '-----|';
      function durationSelector() { return cold('-----|'); }

      expectObservable(e1.pipe(audit(durationSelector))).toBe(expected);
      expectSubscriptionsTo(e1).toBe(subs);
    });
  });

  it('should raise error when source does not emit and raises error', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
      const e1 =   hot('-----#');
      const subs =     '^    !';
      const expected = '-----#';
      function durationSelector() { return cold('-----|'); }

      expectObservable(e1.pipe(audit(durationSelector))).toBe(expected);
      expectSubscriptionsTo(e1).toBe(subs);
    });
  });

  it('should handle an empty source', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
      const e1 =  cold('|');
      const subs =     '(^!)';
      const expected = '|';
      function durationSelector() { return cold('-----|'); }

      expectObservable(e1.pipe(audit(durationSelector))).toBe(expected);
      expectSubscriptionsTo(e1).toBe(subs);
    });
  });

  it('should handle a never source', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
      const e1 =  cold('-');
      const subs =     '^';
      const expected = '-';
      function durationSelector() { return cold('-----|'); }

      expectObservable(e1.pipe(audit(durationSelector))).toBe(expected);
      expectSubscriptionsTo(e1).toBe(subs);
    });
  });

  it('should handle a throw source', () => {
    testScheduler.run(({ hot, cold, expectObservable, expectSubscriptionsTo }) => {
      const e1 =  cold('#');
      const subs =     '(^!)';
      const expected = '#';
      function durationSelector() { return cold('-----|'); }

      expectObservable(e1.pipe(audit(durationSelector))).toBe(expected);
      expectSubscriptionsTo(e1).toBe(subs);
    });
  });

  it('should audit by promise resolves', (done: MochaDone) => {
    const e1 = interval(10).pipe(take(5));
    const expected = [0, 1, 2, 3];

    e1.pipe(
      audit(() => {
        return new Promise((resolve: any) => { resolve(42); });
      })
    ).subscribe(
      (x: number) => {
        expect(x).to.equal(expected.shift()); },
      () => {
        done(new Error('should not be called'));
      },
      () => {
        expect(expected.length).to.equal(0);
        done();
      }
    );
  });

  it('should raise error when promise rejects', (done: MochaDone) => {
    const e1 = interval(10).pipe(take(10));
    const expected = [0, 1, 2];
    const error = new Error('error');

    e1.pipe(
      audit((x: number) => {
        if (x === 3) {
          return new Promise((resolve: any, reject: any) => { reject(error); });
        } else {
          return new Promise((resolve: any) => { resolve(42); });
        }
      })
    ).subscribe(
      (x: number) => {
        expect(x).to.equal(expected.shift()); },
      (err: any) => {
        expect(err).to.be.an('error', 'error');
        expect(expected.length).to.equal(0);
        done();
      },
      () => {
        done(new Error('should not be called'));
      }
    );
  });
});