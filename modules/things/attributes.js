/* eslint-disable require-jsdoc */
import * as Utils from '../utils.js';
import * as API from '../api.js';
import {theThing} from './things.js';

let theAttribute;

const dom = {
  attributesTable: null,
  attributePath: null,
  attributeValue: null,
  attributeCount: null,
  putAttribute: null,
  deleteAttribute: null,
};

export function ready() {
  Utils.getAllElementsById(dom);

  dom.attributesTable.onclick = (event) => {
    if (event.target && event.target.nodeName === 'TD') {
      theAttribute = event.target.parentNode.chilldren[0].text();
      refreshAttribute(theThing, theAttribute);
    }
  };

  dom.putAttribute.click(clickAttribute('PUT'));
  dom.deleteAttribute.click(clickAttribute('DELETE'));
};

function clickAttribute(method) {
  return function() {
    if (!theThing) {
      Utils.showError(null, 'Error', 'No Thing selected'); return;
    };
    if (!dom.attributePath.value) {
      Utils.showError(null, 'Error', 'AttributePath is empty'); return;
    };
    API.callDittoREST(
        method,
        `/things/${theThing.thingId}/attributes/${dom.attributePath.value}`,
        method === 'PUT' ? '"' + dom.attributeValue.value + '"' : null,
    ).then(() => refreshThing(theThing.thingId));
  };
};

function refreshAttribute(thing, attribute) {
  dom.attributePath.value = thing ? attribute : '';
  dom.attributeValue.value = thing ? JSON.stringify(thing.attributes[attribute]).slice(1, -1) : '';
};

export function updateAttributesTable() {
  dom.attributesTable.innerHTML = '';
  let count = 0;
  let thingHasAttribute = false;
  if (theThing.attributes) {
    for (const key of Object.keys(theThing.attributes)) {
      if (key === theAttribute) {
        refreshAttribute(theThing, key);
        thingHasAttribute = true;
      };
      Utils.addTableRow(dom.attributesTable,
          key,
          JSON.stringify(theThing.attributes[key]),
          key === theAttribute);
      count++;
    };
  };
  dom.attributeCount.innerText = count > 0 ? count : '';
  if (!thingHasAttribute) {
    theAttribute = false;
    refreshAttribute();
  };
};
