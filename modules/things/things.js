/* eslint-disable new-cap */
/* eslint-disable no-invalid-this */
/* eslint-disable require-jsdoc */
import {JSONPath} from 'https://cdn.jsdelivr.net/npm/jsonpath-plus@5.0.3/dist/index-browser-esm.min.js';

import {getCurrentEnv, togglePinnedThing} from '../environments/environments.js';
import * as API from '../api.js';
import * as Utils from '../utils.js';
import * as Fields from './fields.js';
import * as Attributes from './attributes.js';
import * as SearchFilter from './searchFilter.js';
import * as Policies from '../policies/policies.js';
import * as Features from './features.js';

export let theThing;
let theSearchCursor;
let keyStrokeTimeout;

let thingJsonEditor;

const dom = {
  searchFilterEdit: null,
  thingsTable: null,
  thingId: null,
  favIcon: null,
};

export async function ready() {
  await Fields.ready();
  await SearchFilter.ready();
  Attributes.ready();

  Utils.getAllElementsById(dom);

  thingJsonEditor = ace.edit('thingJsonEditor');
  thingJsonEditor.session.setMode('ace/mode/json');

  document.getElementById('searchThings').onclick = searchClicked;

  document.getElementById('pinnedThings').onclick = () => {
    getThings(getCurrentEnv()['pinnedThings']);
  };

  dom.searchFilterEdit.onchange = () => {
    theSearchCursor = null;
    removeMoreFromThingList();
  };

  dom.searchFilterEdit.onkeyup = (event) => {
    if (event.key === 'Enter' || event.code === 13) {
      searchClicked();
    } else {
      clearTimeout(keyStrokeTimeout);
      keyStrokeTimeout = setTimeout(() => {
        if (getCurrentEnv().filterList.indexOf(dom.searchFilterEdit.value) >= 0) {
          dom.favIcon.classList.add('fas');
        } else {
          dom.favIcon.classList.remove('fas');
        }
      }, 1000);
    }
  };

  document.getElementById('createThing').onclick = () => {
    API.callDittoREST('POST', '/things', {})
        .then((data) => {
          refreshThing(data.thingId);
          getThings([data.thingId]);
        });
  };

  document.getElementById('putThing').onclick = clickModifyThing('PUT');
  document.getElementById('deleteThing').onclick = clickModifyThing('DELETE');

  dom.thingsTable.addEventListener('click', (event) => {
    if (event.target && event.target.nodeName === 'TD') {
      const row = event.target.parentNode;
      if (row.id === 'searchThingsMore') {
        row.style.pointerEvents = 'none';
        searchThings(dom.searchFilterEdit.value);
      } else {
        refreshThing(row.id);
      }
    }
  });

  dom.searchFilterEdit.focus();
};

function searchClicked() {
  theSearchCursor = null;
  const filter = dom.searchFilterEdit.value;
  const regex = /^(eq\(|ne\(|gt\(|ge\(|lt\(|le\(|in\(|like\(|exists\(|and\(|or\(|not\().*/;
  if (filter === '' || regex.test(filter)) {
    searchThings(filter);
  } else {
    getThings([filter]);
  }
}

function fillThingsTable(thingsList) {
  const fields = getCurrentEnv().fieldList.filter((f) => f.active).map((f) => f.path);
  thingsList.forEach((item, t) => {
    const row = dom.thingsTable.insertRow();
    row.id = item.thingId;
    if (theThing && (item.thingId == theThing.thingId)) {
      row.classList.add('bg-info');
    };
    Utils.addCheckboxToRow(row, item.thingId, getCurrentEnv().pinnedThings.includes(item.thingId), togglePinnedThing);
    row.insertCell(-1).innerHTML = item.thingId;
    fields.forEach((key, i) => {
      let path = key.replace(/\//g, '.');
      if (path.charAt(0) != '.') {
        path = '$.' + path;
      }
      const elem = JSONPath({
        json: item,
        path: path,
      });
      row.insertCell(-1).innerHTML = elem.length != 0 ? elem[0] : '';
    });
  });
};

export function searchThings(filter) {
  document.body.style.cursor = 'progress';
  API.callDittoREST('GET', '/search/things?' +
  Fields.getQueryParameter() +
  ((filter && filter != '') ? '&filter=' + encodeURIComponent(filter) : '') +
  '&option=sort(%2BthingId)' +
  // ',size(3)' +
  (theSearchCursor ? ',cursor(' + theSearchCursor + ')' : ''))
      .then((searchResult) => {
        checkFirstOrNextPage();
        fillThingsTable(searchResult.items);
        checkLastPage(searchResult);
      }).finally(() => {
        document.body.style.cursor = 'default';
      });
};

function getThings(thingIds) {
  dom.thingsTable.innerHTML = '';
  if (thingIds.length === 0) {
    return;
  };
  API.callDittoREST('GET', '/things?' +
    Fields.getQueryParameter() +
    '&ids=' + thingIds +
    '&option=sort(%2BthingId)')
      .then(fillThingsTable);
};

function clickModifyThing(method) {
  return function() {
    const thingId = dom.thingId.value;
    if (!thingId) {
      Utils.showError('thingId is empty'); return;
    }
    API.callDittoREST(
        method,
        '/things/' + dom.thingId.value,
        method === 'PUT' ? thingJsonEditor.getValue() : null,
    ).then(() => {
      method === 'PUT' ? refreshThing(thingId) : searchThings();
    });
  };
};

export function refreshThing(thingId) {
  API.callDittoREST('GET',
      `/things/${thingId}?fields=thingId%2Cattributes%2Cfeatures%2C_created%2C_modified%2C_revision%2C_policy`)
      .then((thing) => setTheThing(thing));
};

export function setTheThing(thingJson) {
  theThing = thingJson;

  // Update fields of Thing table
  $('#thingDetails').empty();
  Utils.addTableRow($('#thingDetails')[0], 'thingId', theThing.thingId, null, true);
  Utils.addTableRow($('#thingDetails')[0], 'policyId', theThing._policy.policyId, null, true);
  Utils.addTableRow($('#thingDetails')[0], 'revision', theThing._revision, null, true);
  Utils.addTableRow($('#thingDetails')[0], 'created', theThing._created, null, true);
  Utils.addTableRow($('#thingDetails')[0], 'modified', theThing._modified, null, true);

  // Update attributes table
  Attributes.updateAttributesTabe();

  // Update edit thing area
  $('#thingId').val(theThing.thingId);
  const thingCopy = JSON.parse(JSON.stringify(theThing));
  delete thingCopy['_revision'];
  delete thingCopy['_created'];
  delete thingCopy['_modified'];
  delete thingCopy['_policy'];
  thingCopy.policyId = theThing._policy.policyId;
  thingJsonEditor.setValue(JSON.stringify(thingCopy, null, 2));

  Features.onThingChanged(theThing);
  Policies.onThingChanged(theThing);
}

function checkLastPage(searchResult) {
  if (searchResult['cursor']) {
    addMoreToThingList();
    theSearchCursor = searchResult.cursor;
  } else {
    theSearchCursor = null;
  }
}

function checkFirstOrNextPage() {
  if (!theSearchCursor) {
    $('#thingsTable').empty();
  } else {
    removeMoreFromThingList();
  }
}

function addMoreToThingList() {
  const moreCell = dom.thingsTable.insertRow().insertCell(-1);
  moreCell.innerHTML = 'load more...';
  moreCell.colSpan = dom.thingsTable.rows[0].childElementCount;
  moreCell.style.textAlign = 'center';
  moreCell.style.cursor = 'pointer';
  moreCell.disabled = true;
  moreCell.parentNode.style.color = '#3a8c9a';
  moreCell.parentNode.id = 'searchThingsMore';
};

function removeMoreFromThingList() {
  const moreRow = $('#searchThingsMore');
  if (moreRow[0]) {
    moreRow[0].parentNode.removeChild(moreRow[0]);
  }
}


