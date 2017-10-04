# Happy Feet

Application state management with triggers that span both urgent and non-urgent states to account for more graceful and staggered recoveries.


## State Management

Sometimes healthy isn't so straight forward. Intermediate states can help fill the `void`.

```
const happy = require('happy-feet');

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

State management spans HAPPY, UNHAPPY, and everything in between. Triggers include soft and hard limits. Soft limits trigger
a warning state (a temporary successful state) indicating the eventually need to be restarted,
while hard limits trigger a state of immediate urgency.

```
const happy = require('happy-feet')({ /* optional options */ });

// happy.state === happy.STATE.HAPPY by default

if (happy.state !== happy.STATE.HAPPY) {
  // do something about it
}
```

| Option | Type | Default | Info |
| --- | --- | --- | --- |
| escalationSoftLimitMin | `number` | `20` | Minimum time (in seconds) before a `WARN` state may be escalated to an `UNHAPPY` state. |
| escalationSoftLimitMax | `number` | `300` | Maximum time (in seconds) before a `WARN` state may be escalated to an `UNHAPPY` state. |
| uncaughtExceptionSoftLimit | `number` | `1` | Number of uncaught exceptions before `WARN` state. |
| uncaughtExceptionHardLimit | `number` | `undefined` | Number of uncaught exceptions before `UNHAPPY` state. Disabled by default. |
| rssSoftLimit | `number` | `undefined` | Memory Resident Set Size (in bytes) before `WARN` state. Disabled by default. |
| rssHardLimit | `number` | `undefined` | Memory Resident Set Size (in bytes) before `UNHAPPY` state. Disabled by default. |
| eventLoopSoftLimit | `number` | `undefined` | Event Loop delay (in ms) before `WARN` state. Disabled by default. Recommended value of `150` or higher. |
| eventLoopHardLimit | `number` | `undefined` | Event Loop delay (in ms) before `UNHAPPY` state. Disabled by default. Recommended value of `500` or higher. |

| Property | Type | Info |
| --- | --- | --- |
| destroy | `function` | Use this to free instance. |


## Connect Usage

If you've already got an (Connect) API, attach a handler like so:
```
const happyConnect = require('happy-feet/connect');
const handler = happyConnect({ /* options */ }, { /* optional happy options */ });

app.use(handler);
```

| Option | Type | Default | Info |
| --- | --- | --- | --- |
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


## Express Usage

If you've already got an (Express) API, attach a handler like so:
```
const happyExpress = require('happy-feet/express');

const handler = happyExpress({ /* options */ }, { /* optional happy options */ });
app.get('/_health', handler);
```

| Option | Type | Default | Info |
| --- | --- | --- | --- |
| errorStatus | `number` | `500` | Status code returned if in `UNHAPPY` state. |
| status | `object` | `{}` | A collection of custom overrides for status responses based on individual states. |
| status[STATE].statusCode | `number` | `200|500` | Status code returned for the given state. By default `${errorStatus}` is returned for `UNHAPPY` state, otherwise `200`.  |
| status[STATE].body | `string` | `${STATE}` | Body message returned for the given state. By default `${STATE}` will be returned verbatim. |
| status[STATE].contentType | `string` | `text/plan` | Content type to responde with. |

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

If your system for monitoring healthchecks is capable of descerning between
catastrophic (remove from LB immediately) and unhealthy (some undesirable event
or threshold, operational but eventually should be restarted), `happy.STATE.WARN`
(HTTP `statusMessage` of `WARN`) can be leveraged to gracefully handle rolling
restarts in whatever fassion deemed acceptable. By default, `WARN` states will be
automatically escalated to `UNHAPPY` after a period of time to avoid vulnerabilities
resulting in mass concurrent crashes and ultimately impact to customers and
availability of your services.
