/* eslint-disable prefer-const */
import * as Environments from './environments/environments.js';
import * as Utils from './utils.js';

export let authHeader;

let ws;

/**
 * Activates authorization header for api calls
 * @param {boolean} forDevOps if true, the credentials for the dev ops api will be used.
 */
export function setAuthHeader(forDevOps) {
  if (!Environments.getCurrentEnv().bearer && !Environments.getCurrentEnv().usernamePassword) {
    return;
  };
  if (Environments.getCurrentEnv().useBasicAuth) {
    if (forDevOps && Environments.getCurrentEnv().usernamePasswordDevOps) {
      authHeader = 'Basic ' + window.btoa(Environments.getCurrentEnv().usernamePasswordDevOps);
    } else {
      authHeader = 'Basic ' + window.btoa(Environments.getCurrentEnv().usernamePassword);
    }
  } else {
    authHeader ='Bearer ' + Environments.getCurrentEnv().bearer;
  }
};

/**
 * Calls the ditto api
 * @param {String} method 'POST', 'GET', 'DELETE', etc.
 * @param {String} path of the ditto call (e.g. '/things')
 * @param {Object} body payload for the api call
 * @return {Object} result as json object
 */
export async function callDittoREST(method, path, body) {
  // let response;
  // try {
  const response = await fetch(Environments.getCurrentEnv().api_uri + '/api/2' + path, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    },
    body: JSON.stringify(body),
  });
  // } catch (error) {
  //   Utils.showError(error);
  // }
  // if (!response) {
  //   return;
  // }
  if (!response.ok) {
    Utils.showError(response.statusText, response.status);
    throw new Error('An error occured: ' + response.status);
  };
  if (response.status != 204) {
    return response.json();
  } else {
    return null;
  }
};

/**
 * Initializes a WebSocket
 */
export function openWebSocket() {
  try {
    ws = new WebSocket(createWSURI(Environments.getCurrentEnv()));
    ws.onopen = function() {
      ws.onmessage = onMessage;
      ws.onerror = onMessage;
      ws.onclose = onClose;
      ws.send('START-SEND-EVENTS');
      ws.send('START-SEND-MESSAGES');
      ws.send('START-SEND-LIVE-EVENTS');
      ws.send('START-SEND-LIVE-COMMANDS');
    };
  } catch (error) {
    console.log(error);
  }
};

/**
 * Creates a ditto websocket uri
 * @param {Object} environment
 * @return {String} uri
 */
function createWSURI(environment) {
  const wsuri = new URL(environment.api_uri.replace(/https/, 'wss').replace(/http/, 'ws'));
  wsuri.pathname = '/ws/2';
  if (environment.useBasicAuth) {
    wsuri.username = environment.usernamePassword.split(':')[0];
    wsuri.password = environment.usernamePassword.split(':')[1];
  } else {
    wsuri.search = '?access_token=' + environment.bearer;
  }
  return wsuri.toString();
};

/**
 * WebSocket onClose callback
 */
function onClose() {
  console.log('CLOSE: WebSocket was closed');
};

let wsSubscribers = [];

/**
 * Add a web socket subscriber
 * @param {function} subscriber function that is called on new message
 */
export function addWSSubscriber(subscriber) {
  wsSubscribers.push(subscriber);
}

/**
 * WebSocket onMessage callback
 * @param {String} message
 */
function onMessage(message) {
  wsSubscribers.forEach((subscriber) => subscriber.call(null, message));
};

