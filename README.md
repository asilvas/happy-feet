# Happy Feet

Application state management with triggers that span both urgent and non-urgent states to account for more graceful and staggered recoveries.


## State Management

Sometimes healthy isn't so straight forward. Intermediate states can help fill the `void`.

```js
const happy = require('happy-feet')();

// by default, happy.state === happy.STATE.HAPPY

// sometimes apps want to differentiate between unhealthy, and not-yet-healthy...
happy.state = happy.STATE.STARTING;

// app is now running
happy.state = happy.STATE.HAPPY;

// something went wrong, but we're still operational.
// eventual escalation to UNHAPPY
happy.state = happy.STATE.WARN;

// other times, maybe you just want your own custom state -- who are we to judge?
happy.state = 'BLACK_HOLE';

// DANGER WILL ROBINSON!
happy.state = happy.STATE.UNHAPPY;

// once state set to UNHAPPY it is irreversible, future states will be ignored
```


## Usage

The core functionality of `happy-feet` lies in setting the `state` property of
your `happy-feet` instance. This state may be set automatically by `happy-feet`
as it monitors your process or set by your application. The value of this state
can be automatically reflected at a web service URL via one of the provided 
middlewares. This can be used to signal to supervising processes that are 
monitoring this health indicator when they need to take corrective action.

You may also decide to manually use the `happy-feet` API to roll your own state
management logic:

```js
const happy = require('happy-feet')({ /* optional options */ });

// happy.state === happy.STATE.HAPPY by default

if (happy.state !== happy.STATE.HAPPY) {
  // do something about it
}
```

There are three built-in values that have a special meaning to `happy-feet`:

| State | Meaning |
|-------|---------|
| `happy.STATE.HAPPY`   | This indicates that your service is in a healthy state |
| `happy.STATE.WARN`    | This means your service is having problems. The health check page will reflect an OK status, but eventually the state will automatically transition to `UNHAPPY`. |
| `happy.STATE.UNHAPPY` | This signals that your service instance should be considered ready to be terminated/restarted due to being in a bad state. |

You can also use custom states if you're rolling your own health status
implementation.

Automatic state change triggers include soft and hard limits. Soft limits trigger
a warning state (a temporary successful state) indicating the eventual need to be restarted,
while hard limits trigger a state of immediate urgency. 

The automatic transition from the `WARN` state to `UNHAPPY` is done after a
random amount of time, which is configurable with the `escalationSoftLimitMin`
and `escalationSoftLimitMax` settings. The purpose of this randomness is to
avoid each member of a service cluster being taken down at the same time in case
of full cluster impacting faults.

Here's a full list of configuration options for `happy-feet`:

| Option | Type | Default | Info |
| --- | --- | --- | --- |
| escalationSoftLimitMin | `number` | `20` | Minimum time (in seconds) before a `WARN` state may be escalated to an `UNHAPPY` state. |
| escalationSoftLimitMax | `number` | `300` | Maximum time (in seconds) before a `WARN` state may be escalated to an `UNHAPPY` state. |
| uncaughtExceptionSoftLimit | `number` | `1` | Number of uncaught exceptions before `WARN` state. |
| uncaughtExceptionHardLimit | `number` | `undefined` | Number of uncaught exceptions before `UNHAPPY` state. Disabled by default. |
| unhandledRejectionSoftLimit | `number` | `undefined` | Number of unhandled rejections before `WARN` state. Disabled by default. |
| unhandledRejectionHardLimit | `number` | `undefined` | Number of unhandled rejections before `UNHAPPY` state. Disabled by default. |
| rssSoftLimit | `number` | `undefined` | Memory Resident Set Size (in bytes) before `WARN` state. Disabled by default. |
| rssHardLimit | `number` | `undefined` | Memory Resident Set Size (in bytes) before `UNHAPPY` state. Disabled by default. |
| eventLoopSoftLimit | `number` | `undefined` | Event Loop delay (in ms) before `WARN` state. Disabled by default. Recommended value of `150` or higher. |
| eventLoopHardLimit | `number` | `undefined` | Event Loop delay (in ms) before `UNHAPPY` state. Disabled by default. Recommended value of `500` or higher. |
| logger | `{ warn,error }` | `console` | Logging interface to use when state changes occur. Defaults to use `console`. |

A `happy-feet` instance has this interface:

| Property | Type | Info |
| --- | --- | --- |
| state | `string` | Get/set the current state of your process. |
| updateState(state, reason) | `function` | Calling this does the same thing as setting the `state` property, except it allows you to log a `reason` for the change. |
| destroy() | `function` | Use this to free the instance. |


## Connect Usage

If you've already got an (Connect) API, attach a handler like so:
```
const happyConnect = require('happy-feet/connect');
const handler = happyConnect({ /* options */ }, { /* optional happy options */ });

app.use(handler);

// Manually change the state
handler.happy.state = handler.happy.STATE.WARN; 
```

| Option | Type | Default | Info |
| --- | --- | --- | --- |
| url | `string` | `"/_health"` | Route to return health status. Defaults to common Kubernetes healthcheck route. |
| method | `string` | `"GET"` | Method required to return health status. |
| errorStatus | `number` | `500` | Status code returned if in `UNHAPPY` state. |
| status | `object` | `{}` | A collection of custom overrides for status responses based on individual states. |
| status[STATE].statusCode | `number` | `200|500` | Status code returned for the given state. By default `${errorStatus}` is returned for `UNHAPPY` state, otherwise `200`.  |
| status[STATE].body | `string` | `${STATE}` | Body message returned for the given state. By default `${STATE}` will be returned verbatim. |
| status[STATE].contentType | `string` | `text/plain` | Content type to responde with. |

| Return Property | Type | Info |
| --- | --- | --- |
| happy | `Happy` | Instance of [Happy](#usage). |


## Express Usage

If you've already got an (Express) API, attach a handler like so:
```
const happyExpress = require('happy-feet/express');

const handler = happyExpress({ /* options */ }, { /* optional happy options */ });
app.get('/_health', handler);

// Manually change the state
handler.happy.state = handler.happy.STATE.WARN; 
```

| Option | Type | Default | Info |
| --- | --- | --- | --- |
| errorStatus | `number` | `500` | Status code returned if in `UNHAPPY` state. |
| status | `object` | `{}` | A collection of custom overrides for status responses based on individual states. |
| status[STATE].statusCode | `number` | `200|500` | Status code returned for the given state. By default `${errorStatus}` is returned for `UNHAPPY` state, otherwise `200`.  |
| status[STATE].body | `string` | `${STATE}` | Body message returned for the given state. By default `${STATE}` will be returned verbatim. |
| status[STATE].contentType | `string` | `text/plain` | Content type to respond with. |

| Return Property | Type | Info |
| --- | --- | --- |
| happy | `Happy` | Instance of [Happy](#usage). |


## API Usage

Or if your service does not expose an API, you can use this helper to expose your healthcheck for you.

```
const happyApi = require('happy-feet/api');

const handler = happyApi({ /* options */ }, { /* optional happy options */ });
```

| Option | Type | Default | Info |
| --- | --- | --- | --- |
| port | 'number' | `80` | HTTP port to bind to. |
| url | `string` | `"/_health"` | Route to return health status. Defaults to common Kubernetes healthcheck route. |
| method | `string` | `"GET"` | Method required to return health status. |
| errorStatus | `number` | `500` | Status code returned if in `UNHAPPY` state. |
| status | `object` | `{}` | A collection of custom overrides for status responses based on individual states. |
| status[STATE].statusCode | `number` | `200|500` | Status code returned for the given state. By default `${errorStatus}` is returned for `UNHAPPY` state, otherwise `200`.  |
| status[STATE].body | `string` | `${STATE}` | Body message returned for the given state. By default `${STATE}` will be returned verbatim. |
| status[STATE].contentType | `string` | `text/plan` | Content type to responde with. |

| Return Property | Type | Info |
| --- | --- | --- |
| happy | `Happy` | Instance of [Happy](#usage). |
| server | `http.Server` | Instance of [http.Server](https://nodejs.org/api/http.html#http_class_http_server). |


## Advanced Healthchecks

The main advantage of *Advanced Healthchecks* over the default escalation
threshold is that a centralized system can coordinate restarts in a more
graceful and controlled manner without impact to availability.

If your system for monitoring healthchecks is capable of discerning between
catastrophic (remove from LB immediately) and unhealthy (some undesirable event
or threshold, operational but eventually should be restarted), `happy.STATE.WARN`
(HTTP `statusMessage` of `WARN`) can be leveraged to gracefully handle rolling
restarts in whatever fashion deemed acceptable. By default, `WARN` states will be
automatically escalated to `UNHAPPY` after a period of time to avoid vulnerabilities
resulting in mass concurrent crashes and ultimately impact to customers and
availability of your services.
