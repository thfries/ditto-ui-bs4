/* eslint-disable no-invalid-this */
/* eslint-disable require-jsdoc */
let environments = {
  local_ditto: {
    api_uri: 'http://localhost:8080',
    solutionId: null,
    bearer: null,
    usernamePassword: 'ditto:ditto',
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
const settingsEditor = ace.edit('settingsEditor');
let onChangeCallback;

export function getCurrentEnv() {
  return environments[theEnv];
};

export function onChange(callback) {
  onChangeCallback = callback;
};

export function ready() {
  const envcookie = document.cookie.split('=')[1];
  if (envcookie) {
    environments = JSON.parse(window.atob(envcookie));
  }
  settingsEditor.session.setMode('ace/mode/json');

  settingsEditor.setValue(JSON.stringify(environments, null, 2), -1);
  environmentsJsonChanged(settingsEditor);
  settingsEditor.on('blur', function() {
    return environmentsJsonChanged(settingsEditor);
  });

  $('#tabEnvironments').click(function() {
    settingsEditor.setValue(JSON.stringify(environments, null, 2), -1);
  });

  $('#environmentSelector').on('change', function() {
    theEnv = this.value;
    activateEnvironment();
  });

  $('#authorizeBearer').on('click', () => {
    getCurrentEnv().useBasicAuth = false;
    getCurrentEnv().bearer = $('#bearer').val();
    setAuthHeader();
  });

  $('#authorizeBasic').on('click', () => {
    getCurrentEnv().useBasicAuth = true;
    getCurrentEnv().usernamePassword = $('#userName').val() + ':' + $('#password');
    setAuthHeader();
  });
}

function environmentsJsonChanged(editor) {
  environments = JSON.parse(editor.getValue());
  document.cookie = 'ditto-ui-env=' + window.btoa(editor.getValue());
  $('#environmentSelector').empty();
  if (theEnv && !getCurrentEnv()) {
    theEnv = null;
  };
  for (const key of Object.keys(environments)) {
    $('#environmentSelector').append($('<option></option>').text(key));
    if (!theEnv) {
      theEnv = key;
    };
  };
  $('#environmentSelector').val(theEnv);
  activateEnvironment();
}

function activateEnvironment() {
  if (!getCurrentEnv()['fieldList']) {
    getCurrentEnv().fieldList = [];
  };
  if (!getCurrentEnv()['filterList']) {
    getCurrentEnv().filterList = [];
  };
  const usernamePassword = getCurrentEnv().usernamePassword ? getCurrentEnv().usernamePassword : ':';
  $('#userName').val(usernamePassword.split(':')[0]);
  $('#password').val(usernamePassword.split(':')[1]);
  $('#bearer').val(getCurrentEnv().bearer);
  onChangeCallback();
  setAuthHeader();
  // openWebSocket();
}

function setAuthHeader() {
  if (!getCurrentEnv().bearer && !getCurrentEnv().usernamePassword) {
    return;
  };
  const auth = getCurrentEnv().useBasicAuth ?
    'Basic ' + window.btoa(getCurrentEnv().usernamePassword) :
    'Bearer ' + getCurrentEnv().bearer;
  $.ajaxSetup({
    beforeSend: function(xhr) {
      xhr.setRequestHeader('Authorization', auth);
    },
  });
};


