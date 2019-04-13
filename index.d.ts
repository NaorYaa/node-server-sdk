// Type definitions for ldclient-node

/**
 * This is the API reference for the LaunchDarkly SDK for Node.js.
 *
 * In typical usage, you will call [[init]] once at startup time to obtain an instance of
 * [[LDClient]], which provides access to all of the SDK's functionality.
 *
 * For more information, see the [SDK reference guide](http://docs.launchdarkly.com/docs/node-sdk-reference).
 */

declare module 'ldclient-node' {
  import { EventEmitter } from 'events';
  import { ClientOpts } from 'redis';

  namespace errors {
    export const LDPollingError: ErrorConstructor;
    export const LDStreamingError: ErrorConstructor;
    export const LDClientError: ErrorConstructor;
    export const LDUnexpectedResponseError: ErrorConstructor;
    export const LDInvalidSDKKeyError: ErrorConstructor;
  }

  /**
   * Creates an instance of the LaunchDarkly client.
   *
   * The client will begin attempting to connect to LaunchDarkly as soon as it is created. To
   * determine when it is ready to use, call [[LDClient.waitForInitialization]], or register an
   * event listener for the `"ready"` event using [[LDClient.on]].
   *
   * @param key
   *   The SDK key.
   * @param options
   *   Optional configuration settings.
   * @return
   *   The new client instance.
   */
  export function init(key: string, options?: LDOptions): LDClient;

  /**
   * Creates a feature store backed by a Redis instance.
   *
   * For more details about how and why you can use a persistent feature store, see
   * the [SDK Reference Guide](https://docs.launchdarkly.com/v2.0/docs/using-a-persistent-feature-store).
   *
   * @param redisOpts
   *   Optional configuration parameters to be passed to the `redis` package.
   * @param cacheTTL
   *   The amount of time, in seconds, that recently read or updated items should remain in an
   *   in-memory cache. If it is zero, there will be no in-memory caching. The default value is DefaultCacheTTL.
   * @param prefix
   *   A string that should be prepended to all Redis keys used by the feature store.
   * @param logger
   *   A custom logger for warnings and errors, if you are not using the default logger.
   *
   * @returns
   *   An object to put in the `featureStore` property for [[LDOptions]].
   */
  export function RedisFeatureStore(
    redisOpts?: ClientOpts,
    cacheTTL?: number,
    prefix?: string,
    logger?: LDLogger | object
  ): LDFeatureStore;

  /**
   * The types of values a feature flag can have.
   *
   * Flags can have any JSON-serializable value.
   */
  export type LDFlagValue = any;

  /**
   * A map of feature flags from their keys to their values.
   */
  export interface LDFlagSet {
    [key: string]: LDFlagValue;
  }

  /**
   * An object that contains the state of all feature flags, generated by [[LDClient.allFlagsState]].
   */
  export interface LDFlagsState {
    /**
     * True if this object contains a valid snapshot of feature flag state, or false if the
     * state could not be computed (for instance, because the client was offline or there
     * was no user).
     */
    valid: boolean;

    /**
     * Returns the value of an individual feature flag at the time the state was recorded.
     * It will be null if the flag returned the default value, or if there was no such flag.
     *
     * @param key
     *   The flag key.
     */
    getFlagValue(key: string): LDFlagValue;

    /**
     * Returns the evaluation reason for a feature flag at the time the state was recorded.
     * It will be null if reasons were not recorded, or if there was no such flag.
     *
     * @param key
     *   The flag key.
     */
    getFlagReason(key: string): LDEvaluationReason;
    
    /**
     * Returns a map of feature flag keys to values. If a flag would have evaluated to the
     * default value, its value will be null.
     *
     * Do not use this method if you are passing data to the front end to "bootstrap" the
     * JavaScript client. Instead, use [[toJSON]].
     */
    allValues(): LDFlagSet;

    /**
     * Returns a Javascript representation of the entire state map, in the format used by
     * the Javascript SDK. Use this method if you are passing data to the front end in
     * order to "bootstrap" the JavaScript client.
     *
     * Do not rely on the exact shape of this data, as it may change in future to support
     * the needs of the JavaScript client.
     */
    toJSON(): object;
  }

  /**
   * Describes the reason that a flag evaluation produced a particular value. This is
   * part of the [[LDEvaluationDetail]] object returned by [[LDClient.variationDetail]].
   */
  export interface LDEvaluationReason {
    /**
     * The general category of the reason:
     *
     * - `'OFF'`: The flag was off and therefore returned its configured off value.
     * - `'FALLTHROUGH'`: The flag was on but the user did not match any targets or rules.
     * - `'TARGET_MATCH'`: The user key was specifically targeted for this flag.
     * - `'RULE_MATCH'`: the user matched one of the flag's rules.
     * - `'PREREQUISITE_FAILED'`: The flag was considered off because it had at least one
     *   prerequisite flag that either was off or did not return the desired variation.
     * - `'ERROR'`: The flag could not be evaluated, e.g. because it does not exist or due
     *   to an unexpected error.
     */
    kind: string;

    /**
     * A further description of the error condition, if the kind was `'ERROR'`.
     */
    errorKind?: string;

    /**
     * The index of the matched rule (0 for the first), if the kind was `'RULE_MATCH'`.
     */
    ruleIndex?: number;

    /**
     * The unique identifier of the matched rule, if the kind was `'RULE_MATCH'`.
     */
    ruleId?: string;

    /**
     * The key of the failed prerequisite flag, if the kind was `'PREREQUISITE_FAILED'`.
     */
    prerequisiteKey?: string;
  }

  /**
   * An object that combines the result of a feature flag evaluation with information about
   * how it was calculated.
   *
   * This is the result of calling [[LDClient.variationDetail]].
   *
   * For more information, see the [SDK reference guide](https://docs.launchdarkly.com/docs/evaluation-reasons).
   */
  export interface LDEvaluationDetail {
    /**
     * The result of the flag evaluation. This will be either one of the flag's variations or
     * the default value that was passed to [[LDClient.variationDetail]].
     */
    value: LDFlagValue;

    /**
     * The index of the returned value within the flag's list of variations, e.g. 0 for the
     * first variation-- or `null` if the default value was returned.
     */
    variationIndex?: number;

    /**
     * An object describing the main factor that influenced the flag evaluation value.
     */
    reason: LDEvaluationReason;
  }

  /**
   * LaunchDarkly initialization options.
   */
  export interface LDOptions {
    /**
     * The base URI for the LaunchDarkly server.
     *
     * Most users should use the default value.
     */
    baseUri?: string;

    /**
     * The base URI for the LaunchDarkly streaming server.
     *
     * Most users should use the default value.
     */
    streamUri?: string;

    /**
     * The base URI for the LaunchDarkly events server.
     *
     * Most users should use the default value.
     */
    eventsUri?: string;

    /**
     * The connection timeout, in seconds.
     */
    timeout?: number;

    /**
     * The capacity of the analytics events queue.
     *
     * The client buffers up to this many events in memory before flushing. If the capacity is
     * exceeded before the buffer is flushed, events will be discarded.
     */
    capacity?: number;

    /**
     * Configures a logger for warnings and errors generated by the SDK.
     *
     * This can be a custom logger or an instance of `winston.Logger`.
     */
    logger?: LDLogger | object;

    /**
     * A component that stores feature flags and related data received from LaunchDarkly.
     *
     * By default, this is an in-memory data structure. The SDK also provides a Redis
     * implementation ([[RedisFeatureStore]]); other options are described in the
     * [SDK reference guide](https://docs.launchdarkly.com/v2.0/docs/using-a-persistent-feature-store).
     */
    featureStore?: LDFeatureStore;

    /**
     * A component that obtains feature flag data and puts it in the feature store.
     *
     * By default, this is the client's default streaming or polling component. It can be changed
     * for testing purposes; see [[FileDataSource]].
     */
    updateProcessor?: object;

    /**
     * The interval in between flushes of the analytics events queue, in seconds.
     */
    flushInterval?: number;

    /**
     * The time between polling requests, in seconds. Ignored in streaming mode.
     */
    pollInterval?: number;

    /**
     * Allows you to specify a host for an optional HTTP proxy.
     */
    proxyHost?: string;

    /**
     * Allows you to specify a port for an optional HTTP proxy.
     *
     * Both the host and port must be specified to enable proxy support.
     */
    proxyPort?: number;

    /**
     * When using an HTTP proxy, specifies whether it is accessed via `http` or `https`.
     */
    proxyScheme?: string;

    /**
     * Allows you to specify basic authentication parameters for an optional HTTP proxy.
     * Usually of the form `username:password`.
     */
    proxyAuth?: string;

    /**
     * Whether the client should be initialized in offline mode.
     */
    offline?: boolean;

    /**
     * Whether streaming mode should be used to receive flag updates.
     *
     * This is true by default. If you set it to false, the client will use polling.
     * Streaming should only be disabled on the advice of LaunchDarkly support.
     */
    stream?: boolean;

    /**
     * Whether you are using the LaunchDarkly relay proxy in daemon mode.
     *
     * In this configuration, the client will not connect to LaunchDarkly to get feature flags,
     * but will instead get feature state from a database (Redis or another supported feature
     * store integration) that is populated by the relay. By default, this is false.
     */
    useLdd?: boolean;

    /**
     * Whether to send analytics events back to LaunchDarkly. By default, this is true.
     */
    sendEvents?: boolean;

    /**
     * Whether all user attributes (except the user key) should be marked as private, and
     * not sent to LaunchDarkly.
     *
     * By default, this is false.
     */
    allAttributesPrivate?: boolean;

    /**
     * The names of any user attributes that should be marked as private, and not sent
     * to LaunchDarkly.
     */
    privateAttributeNames?: Array<string>;

    /**
     * The number of user keys that the event processor can remember at any one time,
     * so that duplicate user details will not be sent in analytics events.
     *
     * Defaults to 1000.
     */
    userKeysCapacity?: number;

    /**
     * The interval (in seconds) at which the event processor will reset its set of
     * known user keys.
     *
     * Defaults to 300.
     */
    userKeysFlushInterval?: number;
  }

  /**
   * A LaunchDarkly user object.
   */
  export interface LDUser {
    /**
     * A unique string identifying a user.
     */
    key: string;

    /**
     * An optional secondary key for a user.
     *
     * This affects [feature flag targeting](https://docs.launchdarkly.com/docs/targeting-users#section-targeting-rules-based-on-user-attributes)
     * as follows: if you have chosen to bucket users by a specific attribute, the secondary key (if set)
     * is used to further distinguish between users who are otherwise identical according to that attribute.
     */
    secondary?: string;

    /**
     * The user's name.
     *
     * You can search for users on the User page by name.
     */
    name?: string;

    /**
     * The user's first name.
     */
    firstName?: string;

    /**
     * The user's last name.
     */
    lastName?: string;

    /**
     * The user's email address.
     *
     * If an `avatar` URL is not provided, LaunchDarkly will use Gravatar
     * to try to display an avatar for the user on the Users page.
     */
    email?: string;

    /**
     * An absolute URL to an avatar image for the user.
     */
    avatar?: string;

    /**
     * The user's IP address.
     *
     * If you provide an IP, LaunchDarkly will use a geolocation service to
     * automatically infer a `country` for the user, unless you've already
     * specified one.
     */
    ip?: string;

    /**
     * The country associated with the user.
     */
    country?: string;

    /**
     * If true, the user will _not_ appear on the Users page in the LaunchDarkly dashboard.
     */
    anonymous?: boolean;

    /**
     * Any additional attributes associated with the user.
     */
    custom?: {
      [key: string]:
        | string
        | boolean
        | number
        | Array<string | boolean | number>;
    };

    /**
     * Specifies a list of attribute names (either built-in or custom) which should be
     * marked as private, and not sent to LaunchDarkly in analytics events. This is in
     * addition to any private attributes designated in the global configuration
     * with [[LDOptions.privateAttributeNames]] or [[LDOptions.allAttributesPrivate]].
     */
    privateAttributeNames?: Array<string>;
  }

  /**
   * The LaunchDarkly client logger interface.
   *
   * The client will output informational debugging messages to the logger.
   * Internally, this logger defaults to an instance of [`winston`](https://github.com/winstonjs/winston)'s
   * `Logger` class.
   */
  export interface LDLogger {
    /**
     * The error logger.
     *
     * @param args
     *   A sequence of any JavaScript values.
     */
    error(...args: any[]): void;

    /**
     * The warning logger.
     *
     * @param args
     *   A sequence of any JavaScript values.
     */
    warn(...args: any[]): void;

    /**
     * The info logger.
     *
     * @param args
     *   A sequence of any JavaScript values.
     */
    info(...args: any[]): void;

    /**
     * The debug logger.
     *
     * @param args
     *   A sequence of any JavaScript values.
     */
    debug(...args: any[]): void;
  }

  /**
   * Interface for a feature store component.
   *
   * The feature store is what the client uses to store feature flag data that has been received
   * from LaunchDarkly. By default, it uses an in-memory implementation; there are also adapters
   * for Redis and other databases (see the [SDK Reference Guide](https://docs.launchdarkly.com/v2.0/docs/using-a-persistent-feature-store)).
   * You will not need to use this interface unless you are writing your own implementation.
   */
  export interface LDFeatureStore {
    /**
     * Get an entity from the store.
     *
     * The store should treat any entity with the property `deleted: true` as "not found".
     *
     * @param kind
     *   The type of data to be accessed. The `namespace` property of this object indicates which
     *   collection of entities to use, e.g. `"features"` or `"segments"`. The store should not
     *   make any assumptions about the format of the data, but just return a JSON object.
     *
     * @param key
     *   The unique key of the entity within the specified collection.
     *
     * @param callback
     *   Will be called with the retrieved entity, or null if not found.
     */
    get(kind: object, key: string, callback: (res: object) => void): void;

    /**
     * Get all entities from a collection.
     *
     * The store should filter out any entities with the property `deleted: true`.
     *
     * @param kind
     *   The type of data to be accessed. The `namespace` property of this object indicates which
     *   collection of entities to use, e.g. `"features"` or `"segments"`. The store should not
     *   make any assumptions about the format of the data, but just return an object in which
     *   each key is the `key` property of an entity and the value is the entity.
     *
     * @param callback
     *   Will be called with the resulting map.
     */
    all(kind: object, callback: (res: object) => void): void;

    /**
     * Initialize the store, overwriting any existing data.
     *
     * @param allData
     *   An object in which each key is the "namespace" of a collection (e.g. `"features"`) and
     *   the value is an object that maps keys to entities.
     *
     * @param callback
     *   Will be called when the store has been initialized.
     */
    init(allData: object, callback: () => void): void;

    /**
     * Delete an entity from the store.
     *
     * Deletion should be implemented by storing a placeholder object with the property
     * `deleted: true` and a `version` property equal to the provided version. In other words,
     * it should be exactly the same as calling `upsert` with such an object.
     *
     * @param kind
     *   The type of data to be accessed. The `namespace` property of this object indicates which
     *   collection of entities to use, e.g. `"features"` or `"segments"`.
     *
     * @param key
     *   The unique key of the entity within the specified collection.
     *
     * @param version
     *   A number that must be greater than the `version` property of the existing entity in
     *   order for it to be deleted. If it is less than or equal to the existing version, the
     *   method should do nothing.
     *
     * @param callback
     *   Will be called when the delete operation is complete.
     */
    delete(kind: object, key: string, version: string, callback: () => void): void;

    /**
     * Add an entity or update an existing entity.
     *
     * @param kind
     *   The type of data to be accessed. The `namespace` property of this object indicates which
     *   collection of entities to use, e.g. `"features"` or `"segments"`. The store should not
     *   make any assumptions about the format of the data, but just return a JSON object.
     *
     * @param key
     *   The unique key of the entity within the specified collection.
     *
     * @param data
     *   The contents of the entity, as an object that can be converted to JSON. The store
     *   should check the `version` property of this object, and should *not* overwrite any
     *   existing data if the existing `version` is greater than or equal to that value.
     *
     * @param callback
     *   Will be called after the upsert operation is complete.
     */
    upsert(kind: object, key: string, data: object, callback: () => void): void;

    /**
     * Tests whether the store is initialized.
     *
     * "Initialized" means that the store has been populated with data, either by the client
     * having called `init()` within this process, or by another process (if this is a shared
     * database).
     *
     * @param callback
     *   Will be called back with the boolean result.
     */
    initialized(callback: (isInitialized: boolean) => void): void;

    /**
     * Releases any resources being used by the feature store.
     */
    close(): void;
  }

  /**
   * The LaunchDarkly client stream processor
   *
   * The client uses this internally to retrieve updates from LaunchDarkly.
   *
   * @ignore
   */
  export interface LDStreamProcessor {
    start: (fn?: (err?: any) => void) => void;
    stop: () => void;
    close: () => void;
  }

  /**
   * The LaunchDarkly client feature flag requestor
   *
   * The client uses this internally to retrieve feature flags from LaunchDarkly.
   *
   * @ignore
   */
  export interface LDFeatureRequestor {
    requestObject: (
      kind: any,
      key: string,
      cb: (err: any, body: any) => void
    ) => void;
    requestAllData: (cb: (err: any, body: any) => void) => void;
  }

  /**
   * Optional settings that can be passed to [[LDClient.allFlagsState]].
   */
  export interface LDFlagsStateOptions {
    /**
     * True if the state should include only flags that have been marked for use with the
     * client-side SDK. By default, all flags are included.
     */
    clientSideOnly?: boolean;
    /**
     * True if evaluation reason data should be captured in the state object (see LDClient.variationDetail).
     * By default, it is not.
     */
    withReasons?: boolean;
    /**
     * True if any flag metadata that is normally only used for event generation-- such as flag versions and
     * evaluation reasons-- should be omitted for any flag that does not have event tracking or debugging turned on.
     * This reduces the size of the JSON data if you are passing the flag state to the front end.
     */
    detailsOnlyForTrackedFlags?: boolean;
  }

  /**
   * The LaunchDarkly SDK client object.
   *
   * Applications should configure the client at startup time and continue to use it throughout the lifetime
   * of the application, rather than creating instances on the fly.
   *
   * Note that `LDClient` inherits from `EventEmitter`, so you can use the standard `on()`, `once()`, and
   * `off()` methods to receive events. The client can emit the following kinds of events:
   *
   * - `"ready"`: Sent only once, when the client has successfully connected to LaunchDarkly.
   * - `"failed"`: Sent only once, if the client has permanently failed to connect to LaunchDarkly.
   * - `"error"`: Contains an error object describing some abnormal condition that the client has detected
   *   (such as a network error).
   * - `"update"`: The client has received a change to a feature flag. The event parameter is an object
   *   containing the flag configuration; its `key` property is the flag key. Note that this does not
   *   necessarily mean the flag's value has changed for any particular user, only that some part of the
   *   flag configuration was changed.
   * - `"update:KEY"`: The client has received a change to the feature flag whose key is KEY. This is the
   *   same as `"update"` but allows you to listen for a specific flag.
   * 
   * For more information, see the [SDK Reference Guide](http://docs.launchdarkly.com/docs/node-sdk-reference).
   */
  export interface LDClient extends EventEmitter {
    /**
     * Tests whether the client has completed initialization.
     *
     * If this returns false, it means that the client has not yet successfully connected to LaunchDarkly.
     * It might still be in the process of starting up, or it might be attempting to reconnect after an
     * unsuccessful attempt, or it might have received an unrecoverable error (such as an invalid SDK key)
     * and given up.
     *
     * @returns
     *   True if the client has successfully initialized.
     */
    initialized(): boolean;

    /**
     * Returns a Promise that tracks the client's initialization state.
     *
     * **Deprecated**: please use [[waitForInitialization]] instead. The difference between that method
     * and this one is that `waitUntilReady` never rejects the Promise, even if initialization fails.
     *
     * @returns
     *   A Promise that will be resolved if the client initializes successfully.
     */
    waitUntilReady(): Promise<void>;

    /**
     * Returns a Promise that tracks the client's initialization state.
     *
     * The Promise will be resolved if the client successfully initializes, or rejected if client
     * initialization has irrevocably failed (for instance, if it detects that the SDK key is invalid).
     *
     * Note that you can also use event listeners ([[on]]) for the same purpose: the event `"ready"`
     * indicates success, and `"failed"` indicates failure.
     * 
     * @returns
     *   A Promise that will be resolved if the client initializes successfully, or rejected if it
     *   fails. If successful, the result is the same client object.
     */
    waitForInitialization(): Promise<LDClient>;

    /**
     * Determines the variation of a feature flag for a user.
     *
     * @param key
     *   The unique key of the feature flag.
     * @param user
     *   The end user requesting the flag. The client will generate an analytics event to register
     *   this user with LaunchDarkly if the user does not already exist.
     * @param defaultValue
     *   The default value of the flag, to be used if the value is not available from LaunchDarkly.
     * @param callback
     *   A Node-style callback to receive the result value. If omitted, you will receive a Promise instead.
     * @returns
     *   If you provided a callback, then nothing. Otherwise, a Promise which will be resolved
     *   with the result value.
     */
    variation(
      key: string,
      user: LDUser,
      defaultValue: LDFlagValue,
      callback?: (err: any, res: LDFlagValue) => void
    ): Promise<LDFlagValue>;

    /**
     * Determines the variation of a feature flag for a user, along with information about how it was
     * calculated.
     *
     * The `reason` property of the result will also be included in analytics events, if you are
     * capturing detailed event data for this flag.
     *
     * For more information, see the [SDK reference guide](https://docs.launchdarkly.com/docs/evaluation-reasons).
     *
     * @param key
     *   The unique key of the feature flag.
     * @param user
     *   The end user requesting the flag. The client will generate an analytics event to register
     *   this user with LaunchDarkly if the user does not already exist.
     * @param defaultValue
     *   The default value of the flag, to be used if the value is not available from LaunchDarkly.
     * @param callback
     *   A Node-style callback to receive the result (as an [[LDEvaluationDetail]]). If omitted, you
     *   will receive a Promise instead.
     * @returns
     *   If you provided a callback, then nothing. Otherwise, a Promise which will be resolved
     *   with the result (as an [[LDEvaluationDetail]]).
     */
    variationDetail(
      key: string,
      user: LDUser,
      defaultValue: LDFlagValue,
      callback?: (err: any, res: LDEvaluationDetail) => void
    ): Promise<LDEvaluationDetail>;

    /**
     * Synonym for [[variation]].
     *
     * **Deprecated**. Please use [[variation]] instead.
     */
    toggle(
      key: string,
      user: LDUser,
      defaultValue: LDFlagValue,
      callback?: (err: any, res: LDFlagValue) => void
    ): Promise<LDFlagValue>;

    /**
     * Retrieves the set of all flag values for a user.
     *
     * **Deprecated**: use [[allFlagsState]] instead. Current versions of the client-side
     * SDK will not generate analytics events correctly if you pass the result of `allFlags()`.
     *
     * @param user
     *   The end user requesting the feature flags.
     * @param callback
     *   A Node-style callback to receive the result (as an [[LDFlagSet]]). If omitted, you
     *   will receive a Promise instead.
     * @returns
     *   If you provided a callback, then nothing. Otherwise, a Promise which will be resolved
     *   with the result as an [[LDFlagSet]].
     */
    allFlags(
      user: LDUser,
      callback?: (err: Error, res: LDFlagSet) => void
    ): Promise<LDFlagSet>;

    /**
     * Builds an object that encapsulates the state of all feature flags for a given user.
     * This includes the flag values and also metadata that can be used on the front end. This
     * method does not send analytics events back to LaunchDarkly.
     *
     * The most common use case for this method is to bootstrap a set of client-side
     * feature flags from a back-end service. Call the `toJSON()` method of the returned object
     * to convert it to the data structure used by the client-side SDK.
     *
     * @param user
     *   The end user requesting the feature flags.
     * @param options
     *   Optional [[LDFlagsStateOptions]] to determine how the state is computed.
     * @param callback
     *   A Node-style callback to receive the result (as an [[LDFlagsState]]). If omitted, you
     *   will receive a Promise instead.
     * @returns
     *   If you provided a callback, then nothing. Otherwise, a Promise which will be resolved
     *   with the result as an [[LDFlagsState]].
     */
    allFlagsState(
      user: LDUser,
      options?: LDFlagsStateOptions,
      callback?: (err: Error, res: LDFlagsState) => void
    ): Promise<LDFlagsState>;

    /**
     * Computes an HMAC signature of a user signed with the client's SDK key.
     *
     * For more information, see the JavaScript SDK Reference Guide on
     * [Secure mode](https://github.com/launchdarkly/js-client#secure-mode).
     *
     * @param user
     *   The user properties.
     *
     * @returns
     *   The hash string.
     */
    secureModeHash(user: LDUser): string;

    /**
     * Discards all network connections, background tasks, and other resources held by the client.
     *
     * Do not attempt to use the client after calling this method.
     */
    close(): void;

    /**
     * Tests whether the client is configured in offline mode.
     *
     * @returns
     *   True if the `offline` property is true in your [[LDOptions]].
     */
    isOffline(): boolean;

    /**
     * Tracks that a user performed an event.
     *
     * LaunchDarkly automatically tracks pageviews and clicks that are specified in the Goals
     * section of the dashboard. This can be used to track custom goals or other events that do
     * not currently have goals.
     *
     * If the user is omitted or has no key, the client will log a warning
     * and will not send an event.
     *
     * @param key
     *   The name of the event, which may correspond to a goal in A/B tests.
     * @param user
     *   The user to track.
     * @param data
     *   Optional additional information to associate with the event.
     */
    track(key: string, user: LDUser, data?: any): void;

    /**
     * Identifies a user to LaunchDarkly.
     *
     * This simply creates an analytics event that will transmit the given user properties to
     * LaunchDarkly, so that the user will be visible on your dashboard even if you have not
     * evaluated any flags for that user. It has no other effect.
     *
     * If the user is omitted or has no key, the client will log a warning
     * and will not send an event.
     *
     * @param user
     *   The user properties. Must contain at least the `key` property.
     */
    identify(user: LDUser): void;

    /**
     * Flushes all pending analytics events.
     *
     * Normally, batches of events are delivered in the background at intervals determined by the
     * `flushInterval` property of [[LDOptions]]. Calling `flush()` triggers an immediate delivery.
     *
     * @param callback
     *   A function which will be called when the flush completes. If omitted, you
     *   will receive a Promise instead.
     *
     * @returns
     *   If you provided a callback, then nothing. Otherwise, a Promise which resolves once
     *   flushing is finished. Note that the Promise will be rejected if the HTTP request
     *   fails, so be sure to attach a rejection handler to it.
     */
    flush(callback?: (err: Error, res: boolean) => void): Promise<void>;
  }

  /**
   * Configuration for [[FileDataSource]].
   */
  export interface FileDataSourceOptions {
    /**
     * The path(s) of the file(s) that FileDataSource will read.
     */
    paths: Array<string>;

    /**
     * True if FileDataSource should reload flags whenever one of the data files is modified.
     * This feature uses Node's `fs.watch()` API, so it is subject to
     * the limitations described [here](https://nodejs.org/docs/latest/api/fs.html#fs_fs_watch_filename_options_listener).
     */
    autoUpdate?: boolean;

    /**
     * Configures a logger for warnings and errors. This can be a custom logger or an instance of
     * `winston.Logger`. By default, it uses the same logger as the rest of the SDK.
     */
    logger?: LDLogger | object;
  }

  /**
   * Creates an object that allows you to use local files as a source of feature flag state,
   * instead of connecting to LaunchDarkly. This would typically be used in a test environment.
   * 
   * To use this component, call `FileDataSource(options)` and store the result in the `updateProcessor`
   * property of your LaunchDarkly client configuration:
   * 
   *     var dataSource = LaunchDarkly.FileDataSource({ paths: [ myFilePath ] });
   *     var config = { updateProcessor: dataSource };
   *
   * This will cause the client not to connect to LaunchDarkly to get feature flags. The
   * client may still make network connections to send analytics events, unless you have disabled
   * this in your configuration with `send_events` or `offline`.
   * 
   * The format of the data files is described in the SDK Reference Guide on
   * [Reading flags from a file](https://docs.launchdarkly.com/v2.0/docs/reading-flags-from-a-file).
   *
   * @param options
   *   Configuration for the data source. You should at least set the `paths` property.
   * @returns
   *   An object to put in the `updateProcessor` property for [[LDOptions]].
   */
  export function FileDataSource(
    options: FileDataSourceOptions
  ): object;
}

/**
 * @ignore
 */
declare module 'ldclient-node/streaming' {
  import {
    LDOptions,
    LDFeatureRequestor,
    LDStreamProcessor
  } from 'ldclient-node';

  function StreamProcessor(
    sdkKey: string,
    options: LDOptions,
    requestor: LDFeatureRequestor
  ): LDStreamProcessor;
  export = StreamProcessor;
}

/**
 * @ignore
 */
declare module 'ldclient-node/requestor' {
  import { LDOptions, LDFeatureRequestor } from 'ldclient-node';

  function Requestor(sdkKey: string, options: LDOptions): LDFeatureRequestor;
  export = Requestor;
}

declare module 'ldclient-node/feature_store' {
  import { LDFeatureStore } from 'ldclient-node';

  function InMemoryFeatureStore(): LDFeatureStore;
  export = InMemoryFeatureStore;
}
