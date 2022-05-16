/* eslint-disable prefer-const */
/* eslint-disable new-cap */
/* eslint-disable no-invalid-this */
/* eslint-disable require-jsdoc */
import * as Main from '../main.js';
import * as Things from './things.js';
import {JSONPath} from 'https://cdn.jsdelivr.net/npm/jsonpath-plus@5.0.3/dist/index-browser-esm.min.js';


// let theFeatureId;
let lastNewFeatureBase;

let featurePropertiesEditor;
let featureDesiredPropertiesEditor;

let dom = {};

export function ready() {
  dom.theFeatureId = document.getElementById('theFeatureId');
  dom.featureMessageDetail = document.getElementById('featureMessageDetail');
  dom.featureDefinition = document.getElementById('featureDefinition');
  dom.featureMessagesTable = document.getElementById('featureMessagesTable');
  dom.featureMessagesCount = document.getElementById('featureMessagesCount');
  dom.featureCount = document.getElementById('featureCount');
  dom.featuresTable = document.getElementById('featuresTable');
  dom.messageFeatureSubject = document.getElementById('messageFeatureSubject');
  dom.messageTimeout = document.getElementById('messageTimeout');
  dom.messageFeaturePayload = document.getElementById('messageFeaturePayload');
  dom.messageFeatureResponse = document.getElementById('messageFeatureResponse');

  dom.featuresTable.onclick = (event) => {
    dom.theFeatureId.value = event.target.textContent;
    $('[href="#tabCrudFeature"]').tab('show');
    refreshFeature(Things.theThing, dom.theFeatureId.value);
  };

  document.getElementById('createFeature').onclick = () => {
    createFeature(dom.theFeatureId.value);
  };

  document.getElementById('putFeature').onclick = () => updateFeature('PUT');
  document.getElementById('deleteFeature').onclick = () => updateFeature('DELETE');

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

  document.getElementById('messageFeature').onclick = messageFeature;

  document.getElementById('featureMessagesTable').onclick = (event) => {
    dom.featureMessageDetail.value = event.target.parentNode.getAttribute('data-message');
  };
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
  dom.theFeatureId.value = resultingFeatureId;
  Main.callDittoREST('PUT',
      '/things/' + Things.theThing.thingId + '/features/' + resultingFeatureId,
      '{}',
  ).then(() => Things.refreshThing(Things.theThing.thingId));
}

function updateFeature(method) {
  if (!Things.theThing) {
    Main.showError(null, 'Error', 'No Thing selected'); return;
  };
  if (!dom.theFeatureId.value) {
    Main.showError(null, 'Error', 'No Feature selected'); return;
  };
  const featureObject = {};
  const featureProperties = featurePropertiesEditor.getValue();
  const featureDesiredProperties = featureDesiredPropertiesEditor.getValue();
  if (dom.featureDefinition.value) {
    featureObject.definition = dom.featureDefinition.value.split(',');
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
      '/things/' + Things.theThing.thingId + '/features/' + dom.theFeatureId.value,
    method === 'PUT' ? featureValue : null,
  ).then(() => Things.refreshThing(Things.theThing.thingId));
}

function refreshFeature(thing, feature) {
  if (thing) {
    dom.theFeatureId.value = feature;
    dom.featureDefinition.value = thing.features[feature]['definition'] ? thing.features[feature].definition : null;
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
    dom.theFeatureId.value = null;
    dom.featureDefinition.value = null;
    featurePropertiesEditor.setValue('');
    featureDesiredPropertiesEditor.setValue('');
  }
  dom.featureMessagesTable.innerHTML = '';
  dom.featureMessagesCount.textContent = '';
}

export function onThingChanged(thing) {
  // Update features table
  dom.featuresTable.innerHTML = '';
  let count = 0;
  let thingHasFeature = false;
  if (thing.features) {
    for (const key of Object.keys(thing.features)) {
      if (key === dom.theFeatureId.value) {
        refreshFeature(thing, key);
        thingHasFeature = true;
      };
      Main.addTableRow(dom.featuresTable, key, null, key === dom.theFeatureId.value);
      count++;
    };
  }
  dom.featureCount.textContent = count > 0 ? count : '';
  if (!thingHasFeature) {
    dom.theFeatureId.value = null;
    refreshFeature();
  }
}

const messageFeature = function() {
  const subject = dom.messageFeatureSubject.value;
  const feature = dom.theFeatureId.value;
  const timeout = dom.messageTimeout.value;
  const payload = dom.messageFeaturePayload.value;
  if (subject && feature && payload) {
    dom.messageFeatureResponse.value = null;
    Main.callDittoREST('POST', '/things/' + Things.theThing.thingId +
    '/features/' + feature +
    '/inbox/messages/' + subject +
    '?timeout=' + timeout,
    payload,
    ).then((data) => {
      if (timeout > 0) {
        dom.messageFeatureResponse.value = JSON.stringify(data, null, 2);
      };
    });
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
    const pathFeature = '/features/' + dom.theFeatureId.value;
    if (dittoJson.path.startsWith(pathFeature)) {
      const row = dom.featureMessagesTable.insertRow();
      row.insertCell(0).innerHTML = new Date().toLocaleTimeString();
      row.insertCell().innerHTML = dittoJson.topic.replace(topicThingId, '');
      row.insertCell().innerHTML = dittoJson.path.replace(pathFeature, '');
      row.setAttribute('data-message', JSON.stringify(dittoJson, null, 2));
      dom.featureMessagesCount.textContent = featureMessagesTable.rows.length;
    }
  }
};


