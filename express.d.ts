///<reference types="./lib/index.d.ts"/>

declare module 'happy-feet/express' {
  import type { HappyFeet, HappyFeetOptions, HappyFeetState } from 'happy-feet';
  import type { Handler } from 'express';  
  
  namespace HappyExpress {
    export type MiddlewareOptions = {
      errorStatus?: number,
      status?: {
        [K in HappyFeetState]?: {
          statusCode?: number,
          body?: string,
          contentType?: string
        }
      }
    }  
  }

  function HappyExpress(
    options?: HappyExpress.MiddlewareOptions,
    happyFeetOpts?: HappyFeetOptions
  ): Handler & { happy: HappyFeet };

  export = HappyExpress;
}