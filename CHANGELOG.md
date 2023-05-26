# CHANGELOG


## 2.2.0

* ***ENHANCEMENT*** Add TypeScript declarations


## 2.1.0

* ***ENHANCEMENT*** Support for monitoring total heap usage via `heapSoftLimit` and `heapHardLimit`.


## 2.0.1

* ***FIX*** Do not emit the `change` event more than once for the same event.


## 2.0

* ***ENHANCEMENT*** Addition of `gracePeriod` which will prevent state transitions
  during that initial grace period, which defaults to 5 minutes. This is intended
  help protect newly launched services from causing cascading failures.
* ***ENHANCEMENT*** Default thresholds for transitioning into an `UNHAPPY` state
  have been increased to be less aggressive, playing nice with autoscalers.
