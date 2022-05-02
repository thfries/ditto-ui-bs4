/* eslint-disable new-cap */
/* eslint-disable no-invalid-this */
/* eslint-disable require-jsdoc */
import {getCurrentEnv} from './environments.js';
import * as Main from '../main.js';
import * as Things from './things.js';
import {JSONPath} from 'https://cdn.jsdelivr.net/npm/jsonpath-plus@5.0.3/dist/index-browser-esm.min.js';


let theFeatureId;
let lastNewFeatureBase;

let featurePropertiesEditor;
let featureDesiredPropertiesEditor;

export function ready() {
  $('#featuresTable').on('click', 'tr', function(event) {
    theFeatureId = $(this).text();
    $('[href="#tabCrudFeature"]').tab('show');
    refreshFeature(Things.theThing, theFeatureId);
  });

  $('#createFeature').click(() => {
    createFeature($('#featureId').val());
  });
  $('#putFeature').click(updateFeature('PUT'));
  $('#deleteFeature').click(updateFeature('DELETE'));

  featurePropertiesEditor = ace.edit('featurePropertiesEditor');
  featureDesiredPropertiesEditor = ace.edit('featureDesiredPropertiesEditor');

  featurePropertiesEditor.session.setMode('ace/mode/json');
  featureDesiredPropertiesEditor.session.setMode('ace/mode/json');

  featurePropertiesEditor.on('dblclick', function() {
    setTimeout(() => {
      const token = featurePropertiesEditor.getSelectedText();
      if (token) {
        const path = '$..' + token.replace(/['"]+/g, '').trim();
        const res = JSONPath({
          json: JSON.parse(featurePropertiesEditor.getValue()),
          path: path,
          resultType: 'pointer',
        });
        $('#fieldPath').val('features/' + $('#featureId').val() + '/properties' + res);
      };
    }, 10);
  });

  $('#messageFeature').click(messageFeature);

  $('#featureMessagesTable').on('click', 'tr', function(event) {
    $('#featureMessageDetail').val(JSON.stringify($(this).data('message'), null, 2));
  });
}

export function createFeature(newFeatureId) {
  if (!newFeatureId || newFeatureId === '') {
    newFeatureId = 'new-feature';
  } else if (newFeatureId.startsWith(lastNewFeatureBase)) {
    newFeatureId = lastNewFeatureBase;
  }
  if (!Things.theThing) {
    Main.showError(null, 'Error', 'No Thing selected'); return;
  };
  if (!Things.theThing['features']) {
    Things.theThing.features = {};
  }
  let resultingFeatureId = newFeatureId;
  let countExisting = 0;
  while (Object.keys(Things.theThing.features).includes(resultingFeatureId)) {
    countExisting++;
    resultingFeatureId = newFeatureId + '-' + countExisting;
  }
  theFeatureId = resultingFeatureId;
  Main.callDittoREST('PUT',
      '/things/' + Things.theThing.thingId + '/features/' + resultingFeatureId,
      '{}',
      () => Things.refreshThing(Things.theThing.thingId),
  );
}

function updateFeature(method) {
  return function() {
    if (!Things.theThing) {
      Main.showError(null, 'Error', 'No Thing selected'); return;
    };
    if (!$('#featureId').val()) {
      Main.showError(null, 'Error', 'No Feature selected'); return;
    };
    const featureObject = {};
    const featureProperties = featurePropertiesEditor.getValue();
    const featureDesiredProperties = featureDesiredPropertiesEditor.getValue();
    if ($('#featureDefinition').val()) {
      featureObject.definition = $('#featureDefinition').val().split(',');
    };
    if (featureProperties) {
      featureObject.properties = JSON.parse(featureProperties);
    };
    if (featureDesiredProperties) {
      featureObject.desiredProperties = JSON.parse(featureDesiredProperties);
    };
    const featureValue = JSON.stringify(featureObject) === '{}' ? null : JSON.stringify(featureObject);
    Main.callDittoREST(
        method,
        '/things/' + Things.theThing.thingId + '/features/' + $('#featureId').val(),
      method === 'PUT' ? featureValue : null,
      function() {
        Things.refreshThing(Things.theThing.thingId);
      },
    );
  };
}

function refreshFeature(thing, feature) {
  if (thing) {
    $('#featureId').val(feature);
    $('#featureDefinition').val(thing.features[feature].definition);
    if (thing.features[feature]['properties']) {
      featurePropertiesEditor.setValue(JSON.stringify(thing.features[feature].properties, null, 4), -1);
    } else {
      featurePropertiesEditor.setValue('');
    }
    if (thing.features[feature]['desiredProperties']) {
      featureDesiredPropertiesEditor.setValue(JSON.stringify(thing.features[feature].desiredProperties, null, 4), -1);
    } else {
      featureDesiredPropertiesEditor.setValue('');
    }
  } else {
    $('#featureId').val('');
    $('#featureDefinition').val('');
    featurePropertiesEditor.setValue('');
    featureDesiredPropertiesEditor.setValue('');
  }
  $('#featureMessagesTable').empty();
  $('#featureMessagesCount').text('');
}

export function onThingChanged(thing) {
  // Update features table
  $('#featuresTable').empty();
  let count = 0;
  let thingHasFeature = false;
  if (thing.features) {
    for (const key of Object.keys(thing.features)) {
      if (key === theFeatureId) {
        refreshFeature(thing, key);
        thingHasFeature = true;
      };
      Main.addTableRow($('#featuresTable')[0], key, null, key === theFeatureId);
      count++;
    };
  }
  $('#featureCount').text(count > 0 ? count : '');
  if (!thingHasFeature) {
    theFeatureId = null;
    refreshFeature();
  }
}

const messageFeature = function() {
  const subject = $('#messageFeatureSubject').val();
  const feature = $('#featureId').val();
  const timeout = $('#messageTimeout').val();
  const payload = $('#messageFeaturePayload').val();
  if (subject && feature && payload) {
    $('#messageFeatureResponse').val('');
    $.post(getCurrentEnv().api_uri +
    '/api/2/things/' + Things.theThing.thingId +
    '/features/' + feature +
    '/inbox/messages/' + subject +
    '?timeout=' + timeout,
    payload,
    function(data, status, xhr) {
      Main.showSuccess(data, status, xhr);
      if (timeout > 0) {
        $('#messageFeatureResponse').val(JSON.stringify(data, null, 2));
      };
    },
    );
  } else {
    Main.showError(null, 'Error', 'FeatureId or Subject or Payload is empty');
  }
};

export function onMessage(message) {
  if (message.data.startsWith('START') || !Things.theThing) {
    return;
  };
  const dittoJson = JSON.parse(message.data);
  const topicThingId = Things.theThing.thingId.replace(':', '/');
  if (dittoJson.topic.startsWith(topicThingId)) {
    const pathFeature = '/features/' + theFeatureId;
    if (dittoJson.path.startsWith(pathFeature)) {
      const row = $('#featureMessagesTable')[0].insertRow();
      row.insertCell(0).innerHTML = new Date().toLocaleTimeString();
      row.insertCell().innerHTML = dittoJson.topic.replace(topicThingId, '');
      row.insertCell().innerHTML = dittoJson.path.replace(pathFeature, '');
      $(row).data('message', dittoJson);
      $('#featureMessagesCount').text($('#featureMessagesTable tr').length);
    }
  }
};


