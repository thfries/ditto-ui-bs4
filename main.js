/* eslint-disable require-jsdoc */
/* eslint-disable no-invalid-this */
import * as Things from './modules/things.js';
import * as Features from './modules/features.js';
import * as Policies from './modules/policies.js';
import * as Connections from './modules/connections.js';
import * as Environments from './modules/environments.js';

let ws;

$(document).ready(function() {
  $('.nav-item').on('click', function() {
    $(this).addClass('active').siblings().removeClass('active');
  });

  $('.table').on('click', 'tr', function() {
    $(this).toggleClass('bg-info').siblings().removeClass('bg-info');
  });

  // make ace editor resize when user changes height
  $('.resizable_pane').mouseup(function(event) {
    const oldHeight = $(this).data('oldHeight');
    if (oldHeight && oldHeight != $(this).height()) {
      window.dispatchEvent(new Event('resize'));
    }
    $(this).data('oldHeight', $(this).height());
  });

  Things.ready();
  Features.ready();
  Policies.ready();
  Connections.ready();
  Environments.ready();
});

export function openWebSocket() {
  let wsuri = Environments.getCurrentEnv().api_uri;
  wsuri = wsuri.replace(/https/, 'wss').replace(/http/, 'ws');
  try {
    ws = new WebSocket(wsuri + '/ws/2' +
      '?access_token=' + Environments.getCurrentEnv().bearer);
    // Environments.getCurrentEnv().usernamePassword + '@' +
    // Environments.getCurrentEnv().api_uri + '/ws/1');
    // ?access_token=' + Environments.getCurrentEnv().bearer
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

function onClose() {
  console.log('CLOSE: WebSocket was closed');
};

function onMessage(message) {
  console.log(message);
  Features.onMessage(message);
};

// function buildfilterEditFilter() {
//   const query = $('#filterEdit').val();
//   const filter = Environments.getCurrentEnv().fieldList.map(
//       (field) => 'like(' + field.path + ',' + '"' + query + '*")').toString();
//   if (Environments.getCurrentEnv().fieldList.length < 2) {
//     return filter;
//   } else {
//     return 'or(' + filter + ')';
//   };
// };


// function modifyThing(method, type, key, value) {
//     if (!key) { showError(null, 'Error', 'FeatureId is empty'); return; }
//     $.ajax(Environments.getCurrentEnv().api_uri + '/api/2/things/' + Things.theThing.thingId + type + key, {
//         type: method,
//         contentType: 'application/json',
//         data: value,
//         success: ,
//         error: showError
//     });
// };

export function callDittoREST(method, path, body, success) {
  $.ajax(Environments.getCurrentEnv().api_uri + '/api/2' + path, {
    type: method,
    contentType: 'application/json',
    data: body,
    success: success,
    error: showError});
};

export const addTableRow = function(table, key, value, selected) {
  const row = table.insertRow();
  row.insertCell(0).innerHTML = key;
  if (value) {
    row.insertCell(1).innerHTML = value;
  }
  if (selected) {
    row.classList.add('bg-info');
  }
};

export function showError(xhr, status, message) {
  $('#errorHeader').text(xhr ? xhr.status : status);
  $('#errorBody').text(xhr ? (xhr.responseJSON ? JSON.stringify(xhr.responseJSON, null, 2) : xhr.statusText) : message);
  $('#errorToast').toast('show');
}

export function showSuccess(data, status, xhr) {
  $('#successHeader').text(xhr.status ? xhr.status : status);
  $('#successBody').text(status);
  $('#successToast').toast('show');
}
