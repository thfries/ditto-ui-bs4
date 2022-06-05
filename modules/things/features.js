/* eslint-disable new-cap */
import * as Utils from '../utils.js';
import * as API from '../api.js';
import * as Things from './things.js';
import * as Fields from './fields.js';
import {JSONPath} from 'https://cdn.jsdelivr.net/npm/jsonpath-plus@5.0.3/dist/index-browser-esm.min.js';

let featurePropertiesEditor;
let featureDesiredPropertiesEditor;

const dom = {
  theFeatureId: null,
  featureMessageDetail: null,
  featureDefinition: null,
  featureMessagesTable: null,
  featureMessagesCount: null,
  featureCount: null,
  featuresTable: null,
  messageFeatureSubject: null,
  messageTimeout: null,
  messageFeaturePayload: null,
  messageFeatureResponse: null,
};

/**
 * Initializes components. Should be called after DOMContentLoaded event
 */
export function ready() {
  Utils.getAllElementsById(dom);

  dom.featuresTable.onclick = (event) => {
    dom.theFeatureId.value = event.target.textContent;
    // $('[href="#tabCrudFeature"]').tab('show');
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
        Fields.setFieldPath('features/' + dom.theFeatureId.value + '/properties' + res);
      };
    }, 10);
  });

  document.getElementById('messageFeature').onclick = messageFeature;

  document.getElementById('featureMessagesTable').onclick = (event) => {
    dom.featureMessageDetail.value = event.target.parentNode.getAttribute('data-message');
  };

  API.addWSSubscriber(onWSMessage);
  Things.addChangeListener(onThingChanged);
}

/**
 * Creates a new empty feature for the given thing in ditto
 * @param {String} newFeatureId Name of the new feature. (optional, if not given, a name is generated)
 */
export function createFeature(newFeatureId) {
  console.assert(newFeatureId && newFeatureId != '', 'newFeatureId expected');
  Utils.assert(Things.theThing, 'No Thing selected');
  if (Things.theThing['features']) {
    Utils.assert(!Object.keys(Things.theThing.features).includes(newFeatureId),
        `FeatureId ${newFeatureId} already exists in Thing`);
  }

  API.callDittoREST('PUT',
      '/things/' + Things.theThing.thingId + '/features/' + resultingFeatureId,
      {},
  ).then(() => Things.refreshThing(Things.theThing.thingId));
}

/**
 * Triggers a feature update in ditto according to UI contents
 * @param {String} method Either PUT to update the feature or DELETE to delete the feature
 */
function updateFeature(method) {
  Utils.assert(Things.theThing, 'No Thing selected');
  Utils.assert(dom.theFeatureId.value, 'No Feature selected');

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

  API.callDittoREST(
      method,
      '/things/' + Things.theThing.thingId + '/features/' + dom.theFeatureId.value,
      method === 'PUT' ? featureObject : null,
  ).then(() => Things.refreshThing(Things.theThing.thingId)
  ).catch(
      // nothing to clean-up if featureUpdate failed
  );
}

/**
 * Initializes all UI components for the given single feature of the given thing, if no thing is given the UI is cleared
 * @param {Object} thing thing the feature values are taken from
 * @param {String} feature FeatureId to be refreshed
 */
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

/**
 * Initializes all feature UI components for the given thing
 * @param {Object} thing UI is initialized for the features of the given thing
 */
function onThingChanged(thing) {
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
      Utils.addTableRow(dom.featuresTable, key, null, key === dom.theFeatureId.value);
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
  const payload = JSON.parse(dom.messageFeaturePayload.value);
  if (subject && feature && payload) {
    dom.messageFeatureResponse.value = null;
    API.callDittoREST('POST', '/things/' + Things.theThing.thingId +
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
    Utils.showError('FeatureId or Subject or Payload is empty');
  }
};

/**
 * Processes a message received by ditto web socket
 * @param {Object} message Message to be processed
 * @return {boolean} false in case the message was not processed
 */
function onWSMessage(message) {
  if (message.data.startsWith('START') || !Things.theThing) {
    return false;
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
  return true;
};


