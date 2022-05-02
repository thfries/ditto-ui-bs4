/* eslint-disable new-cap */
/* eslint-disable no-invalid-this */
/* eslint-disable require-jsdoc */
import {JSONPath} from 'https://cdn.jsdelivr.net/npm/jsonpath-plus@5.0.3/dist/index-browser-esm.min.js';

import {getCurrentEnv, togglePinnedThing} from './environments.js';
import * as Main from '../main.js';
import * as Policies from './policies.js';
import * as Features from './features.js';

export let theThing;
let theSearchCursor;
let theAttribute;
let keyStrokeTimeout;

let thingJsonEditor;

export function ready() {
  thingJsonEditor = ace.edit('thingJsonEditor');
  thingJsonEditor.session.setMode('ace/mode/json');

  $('#searchThings').click(searchClicked);

  $('#pinnedThings').click(() => {
    getThings(getCurrentEnv()['pinnedThings']);
  });

  $('#searchFilterEdit').on('change', function(e) {
    theSearchCursor = null;
    removeMoreFromThingList();
  });

  $('#searchFilterEdit').on('keyup', function(e) {
    if (e.key === 'Enter' || e.keyCode === 13) {
      searchClicked();
    } else {
      clearTimeout(keyStrokeTimeout);
      keyStrokeTimeout = setTimeout(() => {
        if (getCurrentEnv().filterList.indexOf($('#searchFilterEdit').val()) >= 0) {
          $('#favIcon').addClass('fas');
        } else {
          $('#favIcon').removeClass('fas');
        }
      }, 1000);
    }
  });

  $('#createThing').click(function() {
    $.ajax(getCurrentEnv().api_uri + '/api/2/things', {
      type: 'POST',
      contentType: 'application/json',
      data: '{}',
      success: function(data, textStatus, xhr) {
        Main.showSuccess(data, textStatus, xhr);
        refreshThing(data.thingId);
        getThings([data.thingId]);
      },
      error: Main.showError,
    });
  });

  $('#putThing').click(clickModifyThing('PUT'));
  $('#deleteThing').click(clickModifyThing('DELETE'));

  $('#thingsTable').on('click', 'tr', function(event) {
    if ($(this)[0].id === 'searchThingsMore') {
      $(this)[0].style.pointerEvents = 'none';
      searchThings($('#searchFilterEdit').val());
    } else {
      refreshThing($(this)[0].id);
    }
  });

  // Attributes -------------------------------
  $('#attributesTable').on('click', 'tr', function(event) {
    theAttribute = $(this).children(':first').text();
    refreshAttribute(theThing, theAttribute);
  });

  $('#putAttribute').click(clickAttribute('PUT'));
  $('#deleteAttribute').click(clickAttribute('DELETE'));

  $('#searchFilterEdit').focus();
};

function searchClicked() {
  theSearchCursor = null;
  const filter = $('#searchFilterEdit').val();
  const regex = /^(eq\(|ne\(|gt\(|ge\(|lt\(|le\(|in\(|like\(|exists\(|and\(|or\(|not\().*/;
  if (filter === '' || regex.test(filter)) {
    searchThings(filter);
  } else {
    getThings([filter]);
  }
}

function fieldsQueryParameter() {
  const fields = getCurrentEnv().fieldList.filter((f) => f.active).map((f) => f.path);
  return 'fields=thingId' + (fields != '' ? ',' + fields : '');
};

function fillThingsTable(thingsList) {
  const fields = getCurrentEnv().fieldList.filter((f) => f.active).map((f) => f.path);
  thingsList.forEach((item, t) => {
    const row = $('#thingsTable')[0].insertRow();
    row.id = item.thingId;
    if (theThing && (item.thingId == theThing.thingId)) {
      row.classList.add('bg-info');
    };
    Main.addCheckboxToRow(row, item.thingId, getCurrentEnv().pinnedThings.includes(item.thingId), togglePinnedThing);
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
  $.getJSON(getCurrentEnv().api_uri + '/api/2/search/things?' +
  fieldsQueryParameter() +
  ((filter && filter != '') ? '&filter=' + encodeURIComponent(filter) : '') +
  '&option=sort(%2BthingId)' +
  // ',size(3)' +
  (theSearchCursor ? ',cursor(' + theSearchCursor + ')' : ''))
      .done(function(searchResult) {
        checkFirstOrNextPage();
        fillThingsTable(searchResult.items);
        checkLastPage(searchResult);
      }).fail(function(xhr, status, message) {
        Main.showError(xhr, status, message);
      }).always(function() {
        document.body.style.cursor = 'default';
      });
};

function getThings(thingIds) {
  $('#thingsTable').empty();
  if (thingIds.length === 0) {
    return;
  };
  $.getJSON(getCurrentEnv().api_uri + '/api/2/things?' +
    fieldsQueryParameter() +
    '&ids=' + thingIds +
    '&option=sort(%2BthingId)')
      .done(fillThingsTable)
      .fail(Main.showError);
};

function clickModifyThing(method) {
  return function() {
    const thingId = $('#thingId').val();
    if (!thingId) {
      Main.showError(null, 'Error', 'thingId is empty'); return;
    }
    Main.callDittoREST(
        method,
        '/things/' + $('#thingId').val(),
      method === 'PUT' ? thingJsonEditor.getValue() : null,
      function() {
        method === 'PUT' ? refreshThing(thingId) : searchThings();
      },
    );
  };
};

export function refreshThing(thingId) {
  $.getJSON(getCurrentEnv().api_uri +
  '/api/2/things/' + thingId +
  '?fields=thingId%2Cattributes%2Cfeatures%2C_created%2C_modified%2C_revision%2C_policy')
      .done(function(thing, status, xhr) {
        Main.showSuccess(null, status, xhr);
        setTheThing(thing);
      }).fail(Main.showError);
};

export function setTheThing(thingJson) {
  theThing = thingJson;

  // Update fields of Thing table
  $('#thingDetails').empty();
  Main.addTableRow($('#thingDetails')[0], 'thingId', theThing.thingId, null, true);
  Main.addTableRow($('#thingDetails')[0], 'policyId', theThing._policy.policyId, null, true);
  Main.addTableRow($('#thingDetails')[0], 'revision', theThing._revision, null, true);
  Main.addTableRow($('#thingDetails')[0], 'created', theThing._created, null, true);
  Main.addTableRow($('#thingDetails')[0], 'modified', theThing._modified, null, true);

  // Update attributes table
  $('#attributesTable').empty();
  let count = 0;
  let thingHasAttribute = false;
  if (theThing.attributes) {
    for (const key of Object.keys(theThing.attributes)) {
      if (key === theAttribute) {
        refreshAttribute(theThing, key);
        thingHasAttribute = true;
      };
      Main.addTableRow($('#attributesTable')[0],
          key,
          JSON.stringify(theThing.attributes[key]),
          key === theAttribute);
      count++;
    };
  }
  $('#attributeCount').text(count > 0 ? count : '');
  if (!thingHasAttribute) {
    theAttribute = false;
    refreshAttribute();
  }

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

function clickAttribute(method) {
  return function() {
    if (!theThing) {
      Main.showError(null, 'Error', 'No Thing selected'); return;
    };
    if (!$('#attributePath').val()) {
      Main.showError(null, 'Error', 'AttributePath is empty'); return;
    };
    Main.callDittoREST(
        method,
        '/things/' + theThing.thingId + '/attributes/' + $('#attributePath').val(),
      method === 'PUT' ? '"' + $('#attributeValue').val() + '"' : null,
      function() {
        refreshThing(theThing.thingId);
      },
    );
  };
};

function refreshAttribute(thing, attribute) {
  $('#attributePath').val(thing ? attribute : '');
  $('#attributeValue').val(thing ? JSON.stringify(thing.attributes[attribute]).slice(1, -1) : '');
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
  const moreCell = $('#thingsTable')[0].insertRow().insertCell(-1);
  moreCell.innerHTML = 'load more...';
  moreCell.colSpan = $('#thingsTable')[0].rows[0].childElementCount;
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


