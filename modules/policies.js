/* eslint-disable comma-dangle */
/* eslint-disable prefer-const */
/* eslint-disable no-invalid-this */
/* eslint-disable require-jsdoc */
import {getCurrentEnv, setAuthHeader} from './environments.js';
import * as Main from '../main.js';


export let thePolicy;
let thePolicyEntry;

export function onThingChanged(thing) {
  thePolicy = thing._policy;
  if (thePolicy) {
    $('#thePolicyId').val(thePolicy.policyId);
    refreshPolicy(thePolicy.policyId);
  }
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
    setAuthHeader(false);
    refreshWhoAmI();
  });

  $('#policyEntriesTable').on('click', 'tr', function(event) {
    thePolicyEntry = $(this).text();
    $('#thePolicyEntry').val(thePolicyEntry);
    refillPolicySubjectsAndRessources();
  });

  $('#createPolicyEntry').click(function() {
    return addOrDeletePolicyEntry('PUT');
  });
  $('#deletePolicyEntry').click(function() {
    return addOrDeletePolicyEntry('DELETE');
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
  $.getJSON(getCurrentEnv().api_uri + '/api/2/whoami')
      .done(function(whoami, status, xhr) {
        Main.showSuccess(null, status, xhr);
        $('#whoami').empty();
        whoami.subjects.forEach((subject, i) => {
          Main.addTableRow($('#whoami')[0],
            subject === whoami.defaultSubject ? 'defaultSubject' : 'subject',
            subject, false, true);
        });
      }).fail(Main.showError);
}

export function refreshPolicy(policyId) {
  $.getJSON(getCurrentEnv().api_uri + '/api/2/policies/' + policyId)
      .done(function(policy, status, xhr) {
        Main.showSuccess(null, status, xhr);
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
      }).fail(Main.showError);
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

const addOrDeletePolicyEntry = function(method) {
  let label = $('#thePolicyEntry').val();
  if (label && !(label === thePolicyEntry)) {
    $.ajax(getCurrentEnv().api_uri + '/api/2/policies/' + thePolicy.policyId + '/entries/' + label, {
      type: method,
      data: JSON.stringify({
        subjects: {},
        resources: {}
      }),
      contentType: 'application/json',
      success: function() {
        refreshPolicy(thePolicy.policyId);
      },
      error: Main.showError
    });
  } else {
    Main.showError(null, 'Error', 'Entry already exists or is empty');
  }
};

function modifyPolicyEntry(type, key, value) {
  if (thePolicyEntry && key) {
    if (value) {
      $.ajax(getCurrentEnv().api_uri +
      '/api/2/policies/' + thePolicy.policyId +
      '/entries/' + thePolicyEntry +
      type + key, {
        type: 'PUT',
        contentType: 'application/json',
        data: value,
        success: function() {
          refreshPolicy(thePolicy.policyId);
        },
        error: Main.showError
      });
    } else {
      $.ajax(getCurrentEnv().api_uri +
      '/api/2/policies/' + thePolicy.policyId +
      '/entries/' + thePolicyEntry +
      type + key, {
        type: 'DELETE',
        success: function() {
          refreshPolicy(thePolicy.policyId);
        },
        error: Main.showError
      });
    }
  } else {
    Main.showError(null, 'Error', 'No Policy Entry selected or Subject or Ressource is empty');
  }
};


