/* eslint-disable no-invalid-this */
/* eslint-disable require-jsdoc */
import {getCurrentEnv} from './environments.js';
import * as Main from '../main.js';

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

let connectionIdList;
let theConnection;

const connectionEditor = ace.edit('connectionEditor');
const incomingEditor = ace.edit('connectionIncomingScript');
const outgoingEditor = ace.edit('connectionOutgoingScript');

export function ready() {
  connectionEditor.session.setMode('ace/mode/json');
  incomingEditor.session.setMode('ace/mode/javascript');
  outgoingEditor.session.setMode('ace/mode/javascript');

  $('#loadConnections').click(loadConnections);

  $('#createConnection').click(function() {
    if (env() === 'things') {
      delete theConnection['id'];
    }
    callConnectionsAPI(config[env()].createConnection, function(newConnection) {
      connectionIdList.push(newConnection.id);
      Main.addTableRow($('#connectionsTable')[0], newConnection.id);
    });
  });

  $('#connectionsTable').on('click', 'tr', function(event) {
    callConnectionsAPI(config[env()].retrieveConnection, function(connection) {
      theConnection = connection;
      const withJavaScript = theConnection.mappingDefinitions && theConnection.mappingDefinitions.javascript;
      $('#connectionId').val(theConnection.id);
      connectionEditor.setValue(JSON.stringify(theConnection, null, 2));
      incomingEditor.setValue(withJavaScript ?
        theConnection.mappingDefinitions.javascript.options.incomingScript :
        '', -1);
      outgoingEditor.setValue(withJavaScript ?
        theConnection.mappingDefinitions.javascript.options.outgoingScript :
        '', -1);
    }, $(this)[0].id);
  });

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

  $('#modifyConnection').click(function() {
    callConnectionsAPI(config[env()].modifyConnection, Main.showSuccess, $('#connectionId').val());
  });

  $('#deleteConnection').click(function() {
    callConnectionsAPI(config[env()].deleteConnection, loadConnections, $('#connectionId').val());
  });
}

const loadConnections = function() {
  callConnectionsAPI(config[env()].listConnections, function(connections) {
    connectionIdList = [];
    $('#connectionsTable').empty();
    for (let c = 0; c < connections.length; c++) {
      const id = env() === 'things' ? connections[c].id : connections[c];
      connectionIdList.push(id);
      const row = $('#connectionsTable')[0].insertRow();
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

function callConnectionsAPI(params, successCallback, connectionId) {
  if (env() === 'things' && !getCurrentEnv().solutionId) {
    showError(null, 'Error', 'SolutionId is empty'); return;
  };
  $.ajax(getCurrentEnv().api_uri + params.path.replace('{{solutionId}}',
      getCurrentEnv().solutionId).replace('{{connectionId}}',
      connectionId), {
    type: params.method,
    data: params.body ?
          params.body.replace('{{connectionId}}',
              connectionId).replace('{{connectionJson}}',
              JSON.stringify(theConnection)) :
      null,
    contentType: 'application/json',
    success: function(data, status, xhr) {
      if (data && data['?'] && data['?']['?'].status >= 400) {
        Main.showError(null, data['?']['?'].status, JSON.stringify(data['?']['?'].payload));
      } else {
        if (params.unwrapJsonPath) {
          params.unwrapJsonPath.split('.').forEach(function(node) {
            data = data[node];
          });
        };
        successCallback(data, status, xhr);
      }
    },
    error: Main.showError,
  });
};

function env() {
  return getCurrentEnv().api_uri.startsWith('https://things') ? 'things' : 'ditto';
};


