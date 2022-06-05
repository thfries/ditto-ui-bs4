/* eslint-disable prefer-const */
/* eslint-disable max-len */
/* eslint-disable no-invalid-this */
/* eslint-disable require-jsdoc */
import {current} from '../environments/environments.js';
import * as Utils from '../utils.js';
import * as API from '../api.js';

const config = {
  things: {
    listConnections: {
      path: '/api/2/solutions/{{solutionId}}/connections',
      method: 'GET',
      body: null,
      unwrapJsonPath: null,
    },
    retrieveConnection: {
      path: '/api/2/solutions/{{solutionId}}/connections/{{connectionId}}',
      method: 'GET',
      body: null,
      unwrapJsonPath: null,
    },
    createConnection: {
      path: '/api/2/solutions/{{solutionId}}/connections',
      method: 'POST',
      body: '{{connectionJson}}',
      unwrapJsonPath: null,
    },
    modifyConnection: {
      path: '/api/2/solutions/{{solutionId}}/connections/{{connectionId}}',
      method: 'PUT',
      body: '{{connectionJson}}',
      unwrapJsonPath: null,
    },
    deleteConnection: {
      path: '/api/2/solutions/{{solutionId}}/connections/{{connectionId}}',
      method: 'DELETE',
      body: null,
      unwrapJsonPath: null,
    },
    retrieveStatus: {
      path: '/api/2/solutions/{{solutionId}}/connections/{{connectionId}}/status',
      method: 'GET',
      body: null,
      unwrapJsonPath: null,
    },
  },
  ditto: {
    listConnections: {
      path: '/devops/piggyback/connectivity',
      method: 'POST',
      body: {
        'targetActorSelection': '/user/connectivityRoot/connectionIdsRetrieval/singleton',
        'headers': {
          'aggregate': false,
        },
        'piggybackCommand': {
          'type': 'connectivity.commands:retrieveAllConnectionIds',
        },
      },
      unwrapJsonPath: '?.?.connectionIds',
    },
    retrieveConnection: {
      path: '/devops/piggyback/connectivity',
      method: 'POST',
      body: {
        'targetActorSelection': '/system/sharding/connection',
        'headers': {
          'aggregate': false,
        },
        'piggybackCommand': {
          'type': 'connectivity.commands:retrieveConnection',
          'connectionId': '{{connectionId}}',
        },
      },
      unwrapJsonPath: '?.?.connection',
    },
    createConnection: {
      path: '/devops/piggyback/connectivity',
      method: 'POST',
      body: {
        'targetActorSelection': '/system/sharding/connection',
        'headers': {
          'aggregate': false,
        },
        'piggybackCommand': {
          'type': 'connectivity.commands:createConnection',
          'connection': '{{connectionJson}}',
        },
      },
      unwrapJsonPath: '?.?.connection',
    },
    modifyConnection: {
      path: '/devops/piggyback/connectivity',
      method: 'POST',
      body: {
        'targetActorSelection': '/system/sharding/connection',
        'headers': {
          'aggregate': false,
        },
        'piggybackCommand': {
          'type': 'connectivity.commands:modifyConnection',
          'connection': '{{connectionJson}}',
        },
      },
      unwrapJsonPath: null,
    },
    deleteConnection: {
      path: '/devops/piggyback/connectivity',
      method: 'POST',
      body: {
        'targetActorSelection': '/system/sharding/connection',
        'headers': {
          'aggregate': false,
        },
        'piggybackCommand': {
          'type': 'connectivity.commands:deleteConnection',
          'connectionId': '{{connectionId}}',
        },
      },
      unwrapJsonPath: null,
    },
    retrieveStatus: {
      path: '/devops/piggyback/connectivity',
      method: 'POST',
      body: {
        'targetActorSelection': '/system/sharding/connection',
        'headers': {
          'aggregate': false,
        },
        'piggybackCommand': {
          'type': 'connectivity.commands:retrieveConnectionStatus',
          'connectionId': '{{connectionId}}',
        },
      },
      unwrapJsonPath: '?.?',
    },
  },
};

let dom = {
  connectionTemplateRadios: null,
  connectionId: null,
  connectionsTable: null,
};

let connectionIdList;
let theConnection;

let connectionEditor;
let incomingEditor;
let outgoingEditor;

let connectionTemplates;

export function ready() {
  Utils.getAllElementsById(dom);

  connectionEditor = ace.edit('connectionEditor');
  incomingEditor = ace.edit('connectionIncomingScript');
  outgoingEditor = ace.edit('connectionOutgoingScript');

  connectionEditor.session.setMode('ace/mode/json');
  incomingEditor.session.setMode('ace/mode/javascript');
  outgoingEditor.session.setMode('ace/mode/javascript');

  loadConnectionTemplates();

  document.getElementById('loadConnections').onclick = loadConnections;

  document.getElementById('createConnection').onclick = () => {
    const selectedTemplate = document.querySelector('input[name=connectionTemplate]:checked').value;
    setConnection(connectionTemplates[selectedTemplate]);
    if (env() === 'things') {
      delete theConnection['id'];
    }
    callConnectionsAPI(config[env()].createConnection, loadConnections);
  };

  dom.connectionsTable.addEventListener('click', (event) => {
    if (event.target && event.target.tagName === 'TD') {
      callConnectionsAPI(config[env()].retrieveConnection, setConnection, event.target.parentNode.id);
    }
  });

  function setConnection(connection) {
    theConnection = connection;
    const withJavaScript = theConnection && theConnection.mappingDefinitions && theConnection.mappingDefinitions.javascript;
    dom.connectionId.value = theConnection ? theConnection.id : '';
    connectionEditor.setValue(theConnection ? JSON.stringify(theConnection, null, 2) : '');
    incomingEditor.setValue(withJavaScript ?
      theConnection.mappingDefinitions.javascript.options.incomingScript :
      '', -1);
    outgoingEditor.setValue(withJavaScript ?
      theConnection.mappingDefinitions.javascript.options.outgoingScript :
      '', -1);
  }

  incomingEditor.on('blur', function() {
    theConnection.mappingDefinitions.javascript.options.incomingScript = incomingEditor.getValue();
    connectionEditor.setValue(JSON.stringify(theConnection, null, 2));
  });
  outgoingEditor.on('blur', function() {
    theConnection.mappingDefinitions.javascript.options.outgoingScript = outgoingEditor.getValue();
    connectionEditor.setValue(JSON.stringify(theConnection, null, 2));
  });
  connectionEditor.on('blur', function() {
    theConnection = JSON.parse(connectionEditor.getValue());
  });

  document.getElementById('modifyConnection').onclick = () => {
    callConnectionsAPI(config[env()].modifyConnection, loadConnections, dom.connectionId.value);
  };

  document.getElementById('deleteConnection').onclick = () => {
    callConnectionsAPI(config[env()].deleteConnection, loadConnections, dom.connectionId.value);
    setConnection(null);
  };
}

const loadConnections = function() {
  callConnectionsAPI(config[env()].listConnections, function(connections) {
    connectionIdList = [];
    dom.connectionsTable.innerHTML = '';
    for (let c = 0; c < connections.length; c++) {
      const id = env() === 'things' ? connections[c].id : connections[c];
      connectionIdList.push(id);
      const row = dom.connectionsTable.insertRow();
      row.id = id;
      row.insertCell(0).innerHTML = id;
      callConnectionsAPI(config[env()].retrieveStatus, updateConnectionRow(row, 'liveStatus', -1), id);
      callConnectionsAPI(config[env()].retrieveConnection, updateConnectionRow(row, 'name', 0), id);
    };
  });
};

function updateConnectionRow(targetRow, fieldToExtract, index) {
  return function(data) {
    targetRow.insertCell(index).innerHTML = data[fieldToExtract];
  };
};

async function callConnectionsAPI(params, successCallback, connectionId) {
  if (env() === 'things' && !current().solutionId) {
    Utils.showError(null, 'Error', 'No solutionId configured in environment'); return;
  };
  document.body.style.cursor = 'progress';
  const response = await fetch(current().api_uri + params.path.replace('{{solutionId}}',
      current().solutionId).replace('{{connectionId}}',
      connectionId), {
    method: params.method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': API.authHeader,
    },
    body: params.body ? JSON.stringify(params.body).replace('{{connectionId}}', connectionId).replace('"{{connectionJson}}"', JSON.stringify(theConnection)) : null,
  });
  response.json().then((data) => {
    if (data && data['?'] && data['?']['?'].status >= 400) {
      Utils.showError(JSON.stringify(data['?']['?'].payload, data['?']['?'].status));
    } else {
      if (params.unwrapJsonPath) {
        params.unwrapJsonPath.split('.').forEach(function(node) {
          if (node === '?') {
            node = Object.keys(data)[0];
          }
          data = data[node];
        });
      };
      successCallback(data);
    }
  }).catch((error) => {
    Utils.showError('Error calling connections API');
  }).finally(() => {
    document.body.style.cursor = 'default';
  });
};

function env() {
  return current().api_uri.startsWith('https://things') ? 'things' : 'ditto';
};

function loadConnectionTemplates() {
  fetch('templates/connectionTemplates.json')
      .then((response) => {
        response.json().then((loadedTemplates) => {
          connectionTemplates = loadedTemplates;
          Object.keys(connectionTemplates).forEach((templateName, i) => {
            Utils.addRadioButton(dom.connectionTemplateRadios, 'connectionTemplate', templateName, i == 0);
          });
        });
      });
}


