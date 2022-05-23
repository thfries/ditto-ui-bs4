/* eslint-disable arrow-parens */
/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
/* eslint-disable no-invalid-this */
// import $ from 'jquery';
// global.$ = global.jQuery = $;

import * as Things from './modules/things.js';
import * as Features from './modules/features.js';
import * as Policies from './modules/policies.js';
import * as Connections from './modules/connections.js';
import * as Environments from './modules/environments.js';

let ws;
let resized = false;

$(document).ready(async function() {
  document.getElementById('thingsHTML').innerHTML = await (await fetch('modules/things.html')).text();
  document.getElementById('featuresHTML').innerHTML = await (await fetch('modules/features.html')).text();
  document.getElementById('policyHTML').innerHTML = await (await fetch('modules/policies.html')).text();
  document.getElementById('connectionsHTML').innerHTML = await (await fetch('modules/connections.html')).text();
  document.getElementById('environmentsHTML').innerHTML = await (await fetch('modules/environments.html')).text();
  document.getElementById('authorizationHTML').innerHTML = await (await fetch('modules/environments/authorization.html')).text();

  await Things.ready();
  Features.ready();
  Policies.ready();
  Connections.ready();
  Environments.ready();

  document.querySelectorAll('.nav-item').forEach((e) => {
    e.addEventListener('click', (event) => {
      toggleClassInSiblings(event.currentTarget, 'active');
    });
  });

  document.querySelectorAll('.table').forEach((e) => {
    e.addEventListener('click', (event) => {
      console.log('click on table');
      if (event.target && event.target.tagName === 'TD') {
        toggleClassInSiblings(event.target.parentNode, 'bg-info');
      };
    });
  });

  // make ace editor resize when user changes height
  const resizeObserver = new ResizeObserver(() => {
    resized = true;
  });
  document.querySelectorAll('.resizable_pane').forEach((e) => {
    resizeObserver.observe(e);
    e.addEventListener('mouseup', () => {
      if (resized) {
        window.dispatchEvent(new Event('resize'));
        resized = false;
        console.log('resized');
      }
    });
  });
});

function toggleClassInSiblings(node, classToToggle) {
  Array.from(node.parentNode.children).forEach((n) => {
    n.classList.remove(classToToggle);
  });
  node.classList.add(classToToggle);
};

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

export function createWSURI(environment) {
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

function onClose() {
  console.log('CLOSE: WebSocket was closed');
};

function onMessage(message) {
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
export let authHeader;

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
  $.ajaxSetup({
    beforeSend: function(xhr) {
      xhr.setRequestHeader('Authorization', authHeader);
    },
  });
};

export async function callDittoREST(method, path, body) {
  const response = await fetch(Environments.getCurrentEnv().api_uri + '/api/2' + path, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    },
    body: body,
  });
  if (!response.ok) {
    showError(null, response.status, response.statusText);
  };
  if (response.status != 204) {
    return response.json();
  } else {
    return null;
  }
};

export const addTableRow = function(table, key, value, selected, withClipBoardCopy) {
  const row = table.insertRow();
  row.id = key;
  row.insertCell(0).innerHTML = key;
  if (value) {
    row.insertCell(1).innerHTML = value;
  }
  if (selected) {
    row.classList.add('bg-info');
  }
  if (withClipBoardCopy) {
    addClipboardCopyToRow(row);
  }
};

export function addCheckboxToRow(row, id, checked, onToggle) {
  const td = row.insertCell(0);
  td.style.verticalAlign = 'middle';
  const checkBox = document.createElement('input');
  checkBox.type = 'checkbox';
  checkBox.id = id;
  checkBox.checked = checked;
  checkBox.onchange = onToggle;
  td.append(checkBox);
}

export function addClipboardCopyToRow(row) {
  const td = row.insertCell();
  td.style.textAlign = 'right';
  const button = document.createElement('button');
  button.classList.add('btn', 'btn-sm');
  button.style.padding = 0;
  button.innerHTML = `<i class="fa-regular fa-clone"></i>`;
  button.onclick = (evt) => {
    const td = evt.currentTarget.parentNode.previousSibling;
    navigator.clipboard.writeText(td.innerText);
  };
  td.appendChild(button);
}

export function addRadioButton(target, groupName, value, checked) {
  const radio = document.createElement('div');
  radio.innerHTML = `<div class="form-check">
    <input class="form-check-input" type="radio" id="${ value}" name="${ groupName}" value="${ value}"
        ${checked ? 'checked' : ''}>
    <label class="form-check-label" for="${ value}">
      ${ value}
    </label>
  </div>`;
  target.appendChild(radio);
}

export function addTab(tabItemsNode, tabContentsNode, title, contentHTML) {
  const id = 'tab' + title.replace(/\s/g, '');

  const li = document.createElement('li');
  li.classList.add('nav-item');
  li.innerHTML = `<a class="nav-link" data-toggle="tab" href="#${id}">${title}</a>`;
  tabItemsNode.appendChild(li);

  const template = document.createElement('template');
  template.innerHTML = contentHTML;
  template.content.firstChild.id = id;
  tabContentsNode.appendChild(template.content.firstChild);
};

export function showError(xhr, status, message) {
  document.getElementById('errorHeader').text(xhr ? xhr.status : status);
  document.getElementById('errorBody').text(xhr ? (xhr.responseJSON ? JSON.stringify(xhr.responseJSON, null, 2) : xhr.statusText) : message);
  document.getElementById('errorToast').toast('show');
}

export function showSuccess(data, status, xhr) {
  document.getElementById('successHeader').text(xhr.status ? xhr.status : status);
  document.getElementById('successBody').text(status);
  document.getElementById('successToast').toast('show');
}
