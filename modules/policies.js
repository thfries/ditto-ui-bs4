/* eslint-disable comma-dangle */
/* eslint-disable prefer-const */
/* eslint-disable no-invalid-this */
/* eslint-disable require-jsdoc */
import * as Main from '../main.js';


export let thePolicy;
let thePolicyEntry;

export function onThingChanged(thing) {
  thePolicy = thing._policy;
  $('#thePolicyId').val(thePolicy.policyId);
  refreshPolicy(thePolicy.policyId);
}

export function ready() {
  $('#loadPolicy').click(function() {
    const policyId = $('#thePolicyId').val();
    if (policyId === '') {
      Main.showError(null, 'Error', 'policyId is empty'); return;
    }
    refreshPolicy(policyId);
  });

  $('#tabPolicies').click(function() {
    Main.setAuthHeader(false);
    refreshWhoAmI();
  });

  $('#policyEntriesTable').on('click', 'tr', function(event) {
    thePolicyEntry = $(this).text();
    $('#thePolicyEntry').val(thePolicyEntry);
    refillPolicySubjectsAndRessources();
  });

  $('#createPolicyEntry').click(function() {
    addOrDeletePolicyEntry('PUT');
  });
  $('#deletePolicyEntry').click(function() {
    addOrDeletePolicyEntry('DELETE');
    thePolicyEntry = null;
    $('#thePolicyEntry').val(null);
  });

  $('#policySubjectsTable').on('click', 'tr', function(event) {
    const subject = $(this).children(':first').text();
    $('#policySubjectId').val(subject);
    $('#policySubjectValue').val(JSON.stringify(thePolicy.entries[thePolicyEntry].subjects[subject]));
  });

  $('#policyResourcesTable').on('click', 'tr', function(event) {
    const ressource = $(this).children(':first').text();
    $('#policyResourceId').val(ressource);
    $('#policyResourceValue').val(JSON.stringify(thePolicy.entries[thePolicyEntry].resources[ressource]));
  });

  $('#putPolicySubject').click(function() {
    modifyPolicyEntry('/subjects/', $('#policySubjectId').val(), $('#policySubjectValue').val());
  });

  $('#putPolicyResource').click(function() {
    modifyPolicyEntry('/resources/', $('#policyResourceId').val(), $('#policyResourceValue').val());
  });
}

function refreshWhoAmI() {
  Main.callDittoREST('GET', '/whoami')
      .then((whoami) => {
        $('#whoami').empty();
        whoami.subjects.forEach((subject, i) => {
          Main.addTableRow($('#whoami')[0],
            subject === whoami.defaultSubject ? 'defaultSubject' : 'subject',
            subject, false, true);
        });
      });
}

export function refreshPolicy(policyId) {
  Main.callDittoREST('GET', '/policies/' + policyId)
      .then((policy) => {
        thePolicy = policy;
        let policyHasEntry = false;
        $('#policyEntriesTable').empty();
        for (const key of Object.keys(thePolicy.entries)) {
          Main.addTableRow($('#policyEntriesTable')[0], key, null, key === thePolicyEntry);
          if (key === thePolicyEntry) {
            refillPolicySubjectsAndRessources();
            policyHasEntry = true;
          }
        };
        if (!policyHasEntry) {
          thePolicyEntry = null;
          // todo: clear policy entry data to be consistent with features.
          // For now the filled fields can be used to copy data to other policy
        }
      });
};

function refillPolicySubjectsAndRessources() {
  $('#policySubjectsTable').empty();
  for (const key of Object.keys(thePolicy.entries[thePolicyEntry].subjects)) {
    Main.addTableRow($('#policySubjectsTable')[0],
        key,
        JSON.stringify(thePolicy.entries[thePolicyEntry].subjects[key]));
  }
  $('#policyResourcesTable').empty();
  for (const key of Object.keys(thePolicy.entries[thePolicyEntry].resources)) {
    Main.addTableRow($('#policyResourcesTable')[0],
        key,
        JSON.stringify(thePolicy.entries[thePolicyEntry].resources[key]));
  }
};

function addOrDeletePolicyEntry(method) {
  let label = $('#thePolicyEntry').val();
  if (!label) {
    Main.showError(null, 'Error', 'Entry is empty');
  } else if (method === 'PUT' && label === thePolicyEntry) {
    Main.showError(null, 'Error', 'Entry already exists');
  } else {
    thePolicyEntry = label;
    Main.callDittoREST(method, `/policies/${thePolicy.policyId}/entries/${label}`,
        JSON.stringify({
          subjects: {},
          resources: {}
        })).then(() => refreshPolicy(thePolicy.policyId));
  }
};

function modifyPolicyEntry(type, key, value) {
  if (thePolicyEntry && key) {
    if (value) {
      Main.callDittoREST('PUT',
          `/policies/${thePolicy.policyId}/entries/${thePolicyEntry}${type}${key}`,
          value
      ).then(() => refreshPolicy(thePolicy.policyId));
    } else {
      Main.callDittoREST('DELETE',
          `/policies/${thePolicy.policyId}/entries/${thePolicyEntry}${type}${key}`
      ).then(() => refreshPolicy(thePolicy.policyId));
    }
  } else {
    Main.showError(null, 'Error', 'No Policy Entry selected or Subject or Ressource is empty');
  }
};


