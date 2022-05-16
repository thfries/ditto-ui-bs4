/* eslint-disable comma-dangle */
/* eslint-disable prefer-const */
/* eslint-disable no-invalid-this */
/* eslint-disable require-jsdoc */
import * as Main from '../main.js';

export let thePolicy;
let dom = {};

export function ready() {
  dom.thePolicyId = document.getElementById('thePolicyId');
  dom.thePolicyEntry = document.getElementById('thePolicyEntry');
  dom.policySubjectId = document.getElementById('policySubjectId');
  dom.policySubjectValue = document.getElementById('policySubjectValue');
  dom.policyResourceId = document.getElementById('policyResourceId');
  dom.policyResourceValue = document.getElementById('policyResourceValue');
  dom.policyEntriesTable = document.getElementById('policyEntriesTable');
  dom.policySubjectsTable = document.getElementById('policySubjectsTable');
  dom.policyResourcesTable = document.getElementById('policyResourcesTable');
  dom.whoami = document.getElementById('whoami');

  document.getElementById('loadPolicy').onclick = () => {
    const policyId = dom.thePolicyId.value;
    if (policyId === '') {
      Main.showError(null, 'Error', 'policyId is empty'); return;
    }
    refreshPolicy(policyId);
  };

  document.getElementById('tabPolicies').onclick = () => {
    Main.setAuthHeader(false);
    refreshWhoAmI();
  };

  document.getElementById('createPolicyEntry').onclick = () => {
    addOrDeletePolicyEntry('PUT');
  };

  document.getElementById('deletePolicyEntry').onclick = () => {
    addOrDeletePolicyEntry('DELETE');
    dom.thePolicyEntry.value = null;
  };

  document.getElementById('putPolicySubject').onclick = () => {
    modifyPolicyEntry('/subjects/', dom.policySubjectId.value, dom.policySubjectValue.value);
  };

  document.getElementById('putPolicyResource').onclick = () => {
    modifyPolicyEntry('/resources/', dom.policyResourceId.value, dom.policyResourceValue.value);
  };

  dom.policyEntriesTable.onclick = (event) => {
    dom.thePolicyEntry.value = event.target.textContent;
    refillPolicySubjectsAndRessources();
  };

  dom.policySubjectsTable.onclick = (event) => {
    const subject = event.target.parentNode.id;
    dom.policySubjectId.value = subject;
    dom.policySubjectValue.value = JSON.stringify(thePolicy.entries[dom.thePolicyEntry.value].subjects[subject]);
  };

  dom.policyResourcesTable.onclick = (event) => {
    const ressource = event.target.parentNode.id;
    dom.policyResourceId.value = ressource;
    dom.policyResourceValue.value = JSON.stringify(thePolicy.entries[dom.thePolicyEntry.value].resources[ressource]);
  };
}

export function onThingChanged(thing) {
  thePolicy = thing._policy;
  dom.thePolicyId.value = thePolicy.policyId;
  refreshPolicy(thePolicy.policyId);
}

function refreshWhoAmI() {
  Main.callDittoREST('GET', '/whoami')
      .then((whoamiResult) => {
        dom.whoami.innerHTML = '';
        whoamiResult.subjects.forEach((subject, i) => {
          Main.addTableRow(dom.whoami,
            subject === whoamiResult.defaultSubject ? 'defaultSubject' : 'subject',
            subject, false, true);
        });
      });
}

export function refreshPolicy(policyId) {
  Main.callDittoREST('GET', '/policies/' + policyId)
      .then((policy) => {
        thePolicy = policy;
        let policyHasEntry = false;
        dom.policyEntriesTable.innerHTML = '';
        for (const key of Object.keys(thePolicy.entries)) {
          Main.addTableRow(dom.policyEntriesTable, key, null, key === dom.thePolicyEntry.value);
          if (key === dom.thePolicyEntry.value) {
            refillPolicySubjectsAndRessources();
            policyHasEntry = true;
          }
        };
        if (!policyHasEntry) {
          dom.thePolicyEntry.value = null;
          // todo: clear policy entry data to be consistent with features.
          // For now the filled fields can be used to copy data to other policy
        }
      });
};

function refillPolicySubjectsAndRessources() {
  dom.policySubjectsTable.innerHTML = '';
  for (const key of Object.keys(thePolicy.entries[dom.thePolicyEntry.value].subjects)) {
    Main.addTableRow(dom.policySubjectsTable,
        key,
        JSON.stringify(thePolicy.entries[dom.thePolicyEntry.value].subjects[key]));
  }
  dom.policyResourcesTable.innerHTML = '';
  for (const key of Object.keys(thePolicy.entries[dom.thePolicyEntry.value].resources)) {
    Main.addTableRow(dom.policyResourcesTable,
        key,
        JSON.stringify(thePolicy.entries[dom.thePolicyEntry.value].resources[key]));
  }
};

function addOrDeletePolicyEntry(method) {
  if (!dom.thePolicyEntry.value) {
    Main.showError(null, 'Error', 'Entry is empty');
  } else if (method === 'PUT' && thePolicy.entries.includes(dom.thePolicyEntry.value)) {
    Main.showError(null, 'Error', 'Entry already exists');
  } else {
    Main.callDittoREST(method, `/policies/${thePolicy.policyId}/entries/${dom.thePolicyEntry.value}`,
        JSON.stringify({
          subjects: {},
          resources: {}
        })).then(() => refreshPolicy(thePolicy.policyId));
  }
};

function modifyPolicyEntry(type, key, value) {
  if (dom.thePolicyEntry.value && key) {
    if (value) {
      Main.callDittoREST('PUT',
          `/policies/${thePolicy.policyId}/entries/${dom.thePolicyEntry.value}${type}${key}`,
          value
      ).then(() => refreshPolicy(thePolicy.policyId));
    } else {
      Main.callDittoREST('DELETE',
          `/policies/${thePolicy.policyId}/entries/${dom.thePolicyEntry.value}${type}${key}`
      ).then(() => refreshPolicy(thePolicy.policyId));
    }
  } else {
    Main.showError(null, 'Error', 'No Policy Entry selected or Subject or Ressource is empty');
  }
};


