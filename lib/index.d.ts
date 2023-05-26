declare module 'happy-feet' {
  import TypedEventEmitter from 'typed-emitter';

  namespace HappyFeet {
    enum HappyFeetState {
      STARTING = 'STARTING',
      HAPPY = 'HAPPY',
      WARN = 'WARN',
      UNHAPPY = 'UNHAPPY'
    }

    interface HappyFeet extends TypedEventEmitter<{
      change: (state: HappyFeetState, reason: string, code: string) => void
    }> {
      state: HappyFeetState,
      STATE: typeof HappyFeetState,
      updateState: (state: HappyFeetState, reason: string, code: string) => void;
      destroy: () => void;
    }

    type HappyFeetOptions = {
      escalationSoftLimitMin?: number,
      escalationSoftLimitMax?: number,
      uncaughtExceptionSoftLimit?: number,
      uncaughtExceptionHardLimit?: number,
      unhandledRejectionSoftLimit?: number,
      unhandledRejectionHardLimit?: number,
      rssSoftLimit?: number,
      rssHardLimit?: number,
      heapSoftLimit?: number,
      heapHardLimit?: number,
      eventLoopSoftLimit?: number,
      eventLoopHardLimit?: number,
      timeLimitMin?: number,
      timeLimitMax?: number,
      logger?: typeof console,
      gracePeriod?: number,
      logOnUnhappy?: boolean
    };
  }

  function HappyFeet(options?: HappyFeet.HappyFeetOptions): HappyFeet.HappyFeet;

  export = HappyFeet;
}
