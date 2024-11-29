/*
 * Copyright (c) 2016-present Invertase Limited & Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this library except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import { Platform } from 'react-native';
import Base64 from './Base64';
import { isString } from './validate';

export * from './id';
export * from './path';
export * from './promise';
export * from './validate';

export { default as Base64 } from './Base64';
export { default as ReferenceBase } from './ReferenceBase';

export function getDataUrlParts(dataUrlString) {
  const isBase64 = dataUrlString.includes(';base64');
  let [mediaType, base64String] = dataUrlString.split(',');
  if (!mediaType || !base64String) {
    return { base64String: undefined, mediaType: undefined };
  }
  mediaType = mediaType.replace('data:', '').replace(';base64', '');
  if (base64String && base64String.includes('%')) {
    base64String = decodeURIComponent(base64String);
  }
  if (!isBase64) {
    base64String = Base64.btoa(base64String);
  }
  return { base64String, mediaType };
}

export function once(fn, context) {
  let onceResult;
  let ranOnce = false;

  return function onceInner(...args) {
    if (!ranOnce) {
      ranOnce = true;
      onceResult = fn.apply(context || this, args);
    }

    return onceResult;
  };
}

export function isError(value) {
  if (Object.prototype.toString.call(value) === '[object Error]') {
    return true;
  }

  return value instanceof Error;
}

export function hasOwnProperty(target, property) {
  return Object.hasOwnProperty.call(target, property);
}

/**
 * Remove a trailing forward slash from a string if it exists
 *
 * @param string
 * @returns {*}
 */
export function stripTrailingSlash(string) {
  if (!isString(string)) {
    return string;
  }
  return string.endsWith('/') ? string.slice(0, -1) : string;
}

export const isIOS = Platform.OS === 'ios';

export const isAndroid = Platform.OS === 'android';

export const isOther = Platform.OS !== 'ios' && Platform.OS !== 'android';

export function tryJSONParse(string) {
  try {
    return string && JSON.parse(string);
  } catch (jsonError) {
    return string;
  }
}

export function tryJSONStringify(data) {
  try {
    return JSON.stringify(data);
  } catch (jsonError) {
    return null;
  }
}

// Used to indicate if there is no corresponding modular function
const NO_REPLACEMENT = true;

const mapOfDeprecationReplacements = {
  crashlytics: {
    default: {
      checkForUnsentReports: 'checkForUnsentReports()',
      crash: 'crash()',
      deleteUnsentReports: 'deleteUnsentReports()',
      didCrashOnPreviousExecution: 'didCrashOnPreviousExecution()',
      log: 'log()',
      setAttribute: 'setAttribute()',
      setAttributes: 'setAttributes()',
      setUserId: 'setUserId()',
      recordError: 'recordError()',
      sendUnsentReports: 'sendUnsentReports()',
      setCrashlyticsCollectionEnabled: 'setCrashlyticsCollectionEnabled()',
    },
  },
  firestore: {
    FirestoreCollectionReference: {
      count: 'getCountFromServer()',
      countFromServer: 'getCountFromServer()',
      endAt: 'endAt()',
      endBefore: 'endBefore()',
      get: 'getDocs()',
    },
    FirestoreQuery: {},
  },
};

const v8deprecationMessage =
  'This v8 method is deprecated and will be removed in the next major release ' +
  'as part of move to match Firebase Web modular v9 SDK API.';

export function deprecationConsoleWarning(nameSpace, methodName, instanceName, isModularMethod) {
  if (!isModularMethod) {
    const moduleMap = mapOfDeprecationReplacements[nameSpace];
    if (moduleMap) {
      const instanceMap = moduleMap[instanceName];
      const deprecatedMethod = instanceMap[methodName];
      if (instanceMap && deprecatedMethod) {
        const message = createMessage(nameSpace, methodName, instanceName);
        // eslint-disable-next-line no-console
        console.warn(message);
      }
    }
  }
}

export function createMessage(
  nameSpace,
  methodName,
  instanceName = 'default',
  uniqueMessage = null,
) {
  if (uniqueMessage) {
    // Unique deprecation message used for testing
    return uniqueMessage;
  }

  const moduleMap = mapOfDeprecationReplacements[nameSpace];
  if (moduleMap) {
    const instance = moduleMap[instanceName];
    if (instance) {
      const replacementMethodName = instance[methodName];

      if (replacementMethodName !== NO_REPLACEMENT) {
        return v8deprecationMessage + ` Please use \`${replacementMethodName}\` instead.`;
      } else {
        return v8deprecationMessage;
      }
    }
  }
}

function getNamespace(className) {
  if (
    [
      'FirestoreAggregateQuery',
      'FirebaseFirestoreModule',
      'FirestoreCollectionReference',
      'FirestoreQuery',
    ].includes(className)
  ) {
    return 'firestore';
  }
  if (['FirebaseCrashlyticsModule'].includes(className)) {
    return 'crashlytics';
  }
}

export function createDeprecationProxy(instance) {
  return new Proxy(instance, {
    get(target, prop, receiver) {
      const originalMethod = target[prop];

      if (prop === 'constructor') {
        return target.constructor;
      }

      if (typeof originalMethod === 'function') {
        return function (...args) {
          const isModularMethod = args.includes(MODULAR_DEPRECATION_ARG);
          const nameSpace = getNamespace(target.constructor.name);
          const instanceName = !receiver._config ? target.constructor.name : 'default';

          deprecationConsoleWarning(nameSpace, prop, instanceName, isModularMethod);

          return originalMethod.apply(target, args);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

export const MODULAR_DEPRECATION_ARG = 'react-native-firebase-modular-method-call';

export function filterModularArgument(list) {
  return list.filter(arg => arg !== MODULAR_DEPRECATION_ARG);
}

export function warnIfNotModularCall(args, replacementMethodName = '') {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === MODULAR_DEPRECATION_ARG) {
      return;
    }
  }
  let message =
    'This v8 method is deprecated and will be removed in the next major release ' +
    'as part of move to match Firebase Web modular v9 SDK API.';

  if (replacementMethodName.length > 0) {
    message += ` Please use \`${replacementMethodName}\` instead.`;
  }

  // eslint-disable-next-line no-console
  console.warn(message);
}
