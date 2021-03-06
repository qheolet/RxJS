(function () {
  'use strict';
  /* jshint undef: true, unused: true */
  /* globals QUnit, test, Rx, equal, ok */

  QUnit.module('HistoricalScheduler');

  var HistoricalScheduler = Rx.HistoricalScheduler;

  function arrayEquals(first, second) {
    if (first.length !== second.length) {
      ok(false);
    }
    for (var i = 0, len = first.length; i < len; i++) {
      var f = first[i], s = second[i];
      if (f.equals && s.equals) {
        ok(f.equals(s));
      } else {
        ok(f === s);
      }
    }
  }

  function time(days) {
    var d = new Date(1979,10,31,4,30,15);
    d.setUTCDate(d.getDate() + days);
    return d.getTime();
  }

  function fromDays(days) {
    return 86400000 * days;
  }

  function Timestamped (value, timestamp) {
    this.value = value;
    this.timestamp = timestamp;
  }

  Timestamped.prototype.equals = function (other) {
    if (other == null) { return false; }
    return other.value === this.value && other.timestamp === this.timestamp;
  };

  test('constructor', function () {
    var s = new HistoricalScheduler();
    equal(0, s.clock);
    equal(false, s.isEnabled);
  });

  test('start and stop', function () {
    var s = new HistoricalScheduler();

    var list = [];

    s.scheduleAbsolute(null, time(0), function () { list.push(new Timestamped(1, s.now())); });
    s.scheduleAbsolute(null, time(1), function () { list.push(new Timestamped(2, s.now())); });
    s.scheduleAbsolute(null, time(2), function () { s.stop(); });
    s.scheduleAbsolute(null, time(3), function () { list.push(new Timestamped(3, s.now())); });
    s.scheduleAbsolute(null, time(4), function () { s.stop(); });
    s.scheduleAbsolute(null, time(5), function () { s.start(); });
    s.scheduleAbsolute(null, time(6), function () { list.push(new Timestamped(4, s.now())); });

    s.start();

    equal(time(2), s.now());
    equal(time(2), s.clock);

    s.start();

    equal(time(4), s.now());
    equal(time(4), s.clock);

    s.start();

    equal(time(6), s.now());
    equal(time(6), s.clock);

    s.start();

    equal(time(6), s.now());
    equal(time(6), s.clock);

    arrayEquals(list, [
      new Timestamped(1, time(0)),
      new Timestamped(2, time(1)),
      new Timestamped(3, time(3)),
      new Timestamped(4, time(6))
    ]);
  });

  test('order', function () {
    var s = new HistoricalScheduler();

    var list = [];

    s.scheduleAbsolute(null, time(2), function () { list.push(new Timestamped(2, s.now())); });

    s.scheduleAbsolute(null, time(3), function () { list.push(new Timestamped(3, s.now())); });

    s.scheduleAbsolute(null, time(1), function () { list.push(new Timestamped(0, s.now())); });
    s.scheduleAbsolute(null, time(1), function () { list.push(new Timestamped(1, s.now())); });

    s.start();

    arrayEquals(list, [
      new Timestamped(0, time(1)),
      new Timestamped(1, time(1)),
      new Timestamped(2, time(2)),
      new Timestamped(3, time(3))
    ]);
  });

  test('cancellation', function () {
    var s = new HistoricalScheduler();

    var list = [];

    var d = s.scheduleAbsolute(null, time(2), function () { list.push(new Timestamped(2, s.now())); });

    s.scheduleAbsolute(null, time(1), function () {
      list.push(new Timestamped(0, s.now()));
      d.dispose();
    });

    s.start();

    arrayEquals(list, [
      new Timestamped(0, time(1))
    ]);
  });

  test('advance to', function () {
    var s = new HistoricalScheduler();

    var list = [];

    s.scheduleAbsolute(null, time(0), function () { list.push(new Timestamped(0, s.now())); });
    s.scheduleAbsolute(null, time(1), function () { list.push(new Timestamped(1, s.now())); });
    s.scheduleAbsolute(null, time(2), function () { list.push(new Timestamped(2, s.now())); });
    s.scheduleAbsolute(null, time(10), function () { list.push(new Timestamped(10, s.now())); });
    s.scheduleAbsolute(null, time(11), function () { list.push(new Timestamped(11, s.now())); });

    s.advanceTo(time(8));

    equal(time(8), s.now());
    equal(time(8), s.clock);

    arrayEquals(list, [
      new Timestamped(0, time(0)),
      new Timestamped(1, time(1)),
      new Timestamped(2, time(2))
    ]);

    s.advanceTo(time(8));

    equal(time(8), s.now());
    equal(time(8), s.clock);

    arrayEquals(list, [
      new Timestamped(0, time(0)),
      new Timestamped(1, time(1)),
      new Timestamped(2, time(2))
    ]);

    s.scheduleAbsolute(null, time(7), function () { list.push(new Timestamped(7, s.now())); });
    s.scheduleAbsolute(null, time(8), function () { list.push(new Timestamped(8, s.now())); });

    equal(time(8), s.now());
    equal(time(8), s.clock);

    arrayEquals(list, [
      new Timestamped(0, time(0)),
      new Timestamped(1, time(1)),
      new Timestamped(2, time(2))
    ]);

    s.advanceTo(time(10));

    equal(time(10), s.now());
    equal(time(10), s.clock);

    arrayEquals(list, [
      new Timestamped(0, time(0)),
      new Timestamped(1, time(1)),
      new Timestamped(2, time(2)),
      new Timestamped(7, time(8)),
      new Timestamped(8, time(8)),
      new Timestamped(10, time(10))
    ]);

    s.advanceTo(time(100));

    equal(time(100), s.now());
    equal(time(100), s.clock);

    arrayEquals(list, [
      new Timestamped(0, time(0)),
      new Timestamped(1, time(1)),
      new Timestamped(2, time(2)),
      new Timestamped(7, time(8)),
      new Timestamped(8, time(8)),
      new Timestamped(10, time(10)),
      new Timestamped(11, time(11))
    ]);
  });

  test('advance by', function () {
    var s = new HistoricalScheduler();

    var list = [];

    s.scheduleAbsolute(null, time(0), function () { list.push(new Timestamped(0, s.now())); });
    s.scheduleAbsolute(null, time(1), function () { list.push(new Timestamped(1, s.now())); });
    s.scheduleAbsolute(null, time(2), function () { list.push(new Timestamped(2, s.now())); });
    s.scheduleAbsolute(null, time(10), function () { list.push(new Timestamped(10, s.now())); });
    s.scheduleAbsolute(null, time(11), function () { list.push(new Timestamped(11, s.now())); });

    s.advanceBy(time(8) - s.now());

    equal(time(8), s.now());
    equal(time(8), s.clock);

    arrayEquals(list, [
      new Timestamped(0, time(0)),
      new Timestamped(1, time(1)),
      new Timestamped(2, time(2))
    ]);

    s.scheduleAbsolute(null, time(7), function () { list.push(new Timestamped(7, s.now())); });
    s.scheduleAbsolute(null, time(8), function () { list.push(new Timestamped(8, s.now())); });

    equal(time(8), s.now());
    equal(time(8), s.clock);

    arrayEquals(list, [
      new Timestamped(0, time(0)),
      new Timestamped(1, time(1)),
      new Timestamped(2, time(2))
    ]);

    s.advanceBy(0);

    equal(time(8), s.now());
    equal(time(8), s.clock);

    arrayEquals(list, [
      new Timestamped(0, time(0)),
      new Timestamped(1, time(1)),
      new Timestamped(2, time(2))
    ]);

    s.advanceBy(fromDays(2));

    equal(time(10), s.now());
    equal(time(10), s.clock);

    arrayEquals(list, [
      new Timestamped(0, time(0)),
      new Timestamped(1, time(1)),
      new Timestamped(2, time(2)),
      new Timestamped(7, time(8)),
      new Timestamped(8, time(8)),
      new Timestamped(10, time(10))
    ]);

    s.advanceBy(fromDays(90));

    equal(time(100), s.now());
    equal(time(100), s.clock);

    arrayEquals(list, [
      new Timestamped(0, time(0)),
      new Timestamped(1, time(1)),
      new Timestamped(2, time(2)),
      new Timestamped(7, time(8)),
      new Timestamped(8, time(8)),
      new Timestamped(10, time(10)),
      new Timestamped(11, time(11))
    ]);
  });

  test('is enabled', function () {
    var s = new HistoricalScheduler();

    equal(false, s.isEnabled);

    s.schedule(s, function (s) {
      equal(true, s.isEnabled);
      s.stop();
      equal(false, s.isEnabled);
    });

    equal(false, s.isEnabled);

    s.start();

    equal(false, s.isEnabled);
  });

  test('Sleep 1', function () {
    var now = new Date(1983, 2, 11, 12, 0, 0).getTime();

    var s = new HistoricalScheduler(now);

    s.sleep(fromDays(1));

    equal(now + fromDays(1), s.clock);
  });

  test('sleep 2', function () {
    var s = new HistoricalScheduler();

    var n = 0;

    s.scheduleRecursiveFuture(null, new Date(s.now() + 6000), function (_, rec) {
      s.sleep(3 * 6000);
      n++;

      rec(null, new Date(s.now() + 6000));
    });

    s.advanceTo(s.now() + (5 * 6000));

    equal(2, n);
  });

  function reverseComparer (x, y) {
    return y - x;
  }

  test('with comparer', function () {
    var now = new Date();

    var s = new HistoricalScheduler(now, reverseComparer);

    var res = [];

    s.scheduleAbsolute(null, now - 1000, function () { res.push(1); });
    s.scheduleAbsolute(null, now - 2000, function () { res.push(2); });

    s.start();

    arrayEquals(res, [1,2]);
  });

}());
