///<reference types="./lib/index.d.ts"/>

declare module 'happy-feet/connect' {
  import type { HappyFeet, HappyFeetState, HappyFeetOptions } from 'happy-feet';
  import type { HandleFunction } from 'connect';

  namespace HappyConnect {
    export type MiddlewareOptions = {
      url?: string,
      method?: string,
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
  
  function HappyConnect(
    options?: HappyConnect.MiddlewareOptions,
    happyFeetOpts?: HappyFeetOptions
  ): HandleFunction & { happy: HappyFeet };

  export = HappyConnect;
}
