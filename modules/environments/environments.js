/* eslint-disable arrow-parens */
/* eslint-disable prefer-const */
/* eslint-disable no-invalid-this */
/* eslint-disable require-jsdoc */
import * as Utils from '../utils.js';
import * as API from '../api.js';

let environments = {
  local_ditto: {
    api_uri: 'http://localhost:8080',
    solutionId: null,
    bearer: null,
    usernamePassword: 'ditto:ditto',
    usernamePasswordDevOps: 'devops:foobar',
    useBasicAuth: true,
  },
  cloud_things_aws: {
    api_uri: 'https://things.eu-1.bosch-iot-suite.com',
    solutionId: '',
    bearer: '',
    usernamePassword: null,
    useBasicAuth: false,
  },
};

let theEnv;
let settingsEditor;

let dom = {
  environmentSelector: null,
  searchFilterEdit: null,
};

let observers = [];

export function current() {
  return environments[theEnv];
};

export function addChangeListener(observer) {
  observers.push(observer);
}

function notifyAll() {
  observers.forEach(observer => observer.call());
}

export function ready() {
  Utils.getAllElementsById(dom);

  const cookie = document.cookie.match('(^|;)\\s*ditto-ui-env\\s*=\\s*([^;]+)')?.pop();
  if (cookie) {
    environments = JSON.parse(window.atob(cookie));
  }
  const restoredEnv = localStorage.getItem('ditto-ui-env');
  if (restoredEnv) {
    environments = JSON.parse(restoredEnv);
  }

  settingsEditor = ace.edit('settingsEditor');
  settingsEditor.session.setMode('ace/mode/json');
  settingsEditor.setValue(JSON.stringify(environments, null, 2), -1);
  environmentsJsonChanged();

  settingsEditor.on('blur', () => {
    environments = JSON.parse(settingsEditor.getValue());
    environmentsJsonChanged();
  });

  document.getElementById('tabEnvironments').onclick = () => {
    settingsEditor.setValue(JSON.stringify(environments, null, 2), -1);
  };

  document.querySelectorAll('.mainUser,.devOpsUser').forEach((menuTab) => {
    menuTab.addEventListener('click', (event) => {
      API.setAuthHeader(event.target.parentNode.classList.contains('devOpsUser'));
    });
  });

  document.getElementById('environmentSelector').onchange = (event) => {
    theEnv = event.target.value;
    activateEnvironment();
  };

  dom.searchFilterEdit.onclick = (event) => {
    if (event.target.selectionStart == event.target.selectionEnd) {
      event.target.select();
    };
  };
}

export function togglePinnedThing(evt) {
  if (evt.target.checked) {
    current().pinnedThings.push(this.id);
  } else {
    const index = current().pinnedThings.indexOf(this.id);
    if (index > -1) {
      current().pinnedThings.splice(index, 1);
    };
  };
  environmentsJsonChanged();
};

export function environmentsJsonChanged() {
  localStorage.setItem('ditto-ui-env', JSON.stringify(environments));

  dom.environmentSelector.innerHTML = '';
  if (theEnv && !current()) {
    theEnv = null;
  };
  for (const key of Object.keys(environments)) {
    let option = document.createElement('option');
    option.text = key;
    dom.environmentSelector.add(option);
    if (!theEnv) {
      theEnv = key;
    };
  };
  dom.environmentSelector.value = theEnv;
  activateEnvironment();
}

function activateEnvironment() {
  if (!current()['pinnedThings']) {
    current().pinnedThings = [];
  };

  notifyAll();

  API.openWebSocket();
  dom.searchFilterEdit.focus();
}
