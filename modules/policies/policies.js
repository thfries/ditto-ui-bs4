/* eslint-disable comma-dangle */
/* eslint-disable prefer-const */
/* eslint-disable no-invalid-this */
/* eslint-disable require-jsdoc */
import * as API from '../api.js';
import * as Things from '../things/things.js';
import * as Utils from '../utils.js';

export let thePolicy;

let dom = {
  thePolicyId: null,
  thePolicyEntry: null,
  policySubjectId: null,
  policySubjectValue: null,
  policyResourceId: null,
  policyResourceValue: null,
  policyEntriesTable: null,
  policySubjectsTable: null,
  policyResourcesTable: null,
  whoami: null,
};

export function ready() {
  Utils.getAllElementsById(dom);

  document.getElementById('loadPolicy').onclick = () => {
    const policyId = dom.thePolicyId.value;
    if (policyId === '') {
      Utils.showError('policyId is empty'); return;
    }
    refreshPolicy(policyId);
  };

  document.getElementById('tabPolicies').onclick = () => {
    API.setAuthHeader(false);
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

  Things.addChangeListener(onThingChanged);
}

function onThingChanged(thing) {
  thePolicy = thing._policy;
  dom.thePolicyId.value = thePolicy.policyId;
  refreshPolicy(thePolicy.policyId);
}

function refreshWhoAmI() {
  dom.whoami.innerHTML = '';
  API.callDittoREST('GET', '/whoami')
      .then((whoamiResult) => {
        whoamiResult.subjects.forEach((subject, i) => {
          Utils.addTableRow(dom.whoami,
            subject === whoamiResult.defaultSubject ? 'defaultSubject' : 'subject',
            subject, false, true);
        });
      })
      .catch((error) => {
      });
}

export function refreshPolicy(policyId) {
  API.callDittoREST('GET', '/policies/' + policyId)
      .then((policy) => {
        thePolicy = policy;
        let policyHasEntry = false;
        dom.policyEntriesTable.innerHTML = '';
        for (const key of Object.keys(thePolicy.entries)) {
          Utils.addTableRow(dom.policyEntriesTable, key, null, key === dom.thePolicyEntry.value);
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
    Utils.addTableRow(dom.policySubjectsTable,
        key,
        JSON.stringify(thePolicy.entries[dom.thePolicyEntry.value].subjects[key]));
  }
  dom.policyResourcesTable.innerHTML = '';
  for (const key of Object.keys(thePolicy.entries[dom.thePolicyEntry.value].resources)) {
    Utils.addTableRow(dom.policyResourcesTable,
        key,
        JSON.stringify(thePolicy.entries[dom.thePolicyEntry.value].resources[key]));
  }
};

function addOrDeletePolicyEntry(method) {
  if (!dom.thePolicyEntry.value) {
    Utils.showError('Entry is empty');
  } else if (method === 'PUT' && thePolicy.entries.includes(dom.thePolicyEntry.value)) {
    Utils.showError('Entry already exists');
  } else {
    API.callDittoREST(method,
        `/policies/${thePolicy.policyId}/entries/${dom.thePolicyEntry.value}`,
        {
          subjects: {},
          resources: {}
        }
    ).then(() => refreshPolicy(thePolicy.policyId));
  }
};

function modifyPolicyEntry(type, key, value) {
  if (dom.thePolicyEntry.value && key) {
    if (value) {
      API.callDittoREST('PUT',
          `/policies/${thePolicy.policyId}/entries/${dom.thePolicyEntry.value}${type}${key}`,
          JSON.stringify(value)
      ).then(() => refreshPolicy(thePolicy.policyId));
    } else {
      API.callDittoREST('DELETE',
          `/policies/${thePolicy.policyId}/entries/${dom.thePolicyEntry.value}${type}${key}`
      ).then(() => refreshPolicy(thePolicy.policyId));
    }
  } else {
    Utils.showError('No Policy Entry selected or Subject or Ressource is empty');
  }
};


