/* eslint-disable no-invalid-this */
/* eslint-disable require-jsdoc */
import * as Main from '../main.js';

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
let theFieldIndex = -1;

export function getCurrentEnv() {
  return environments[theEnv];
};

export function ready() {
  const envcookie = document.cookie.split('=')[1];
  if (envcookie) {
    environments = JSON.parse(window.atob(envcookie));
  }
  settingsEditor.session.setMode('ace/mode/json');

  settingsEditor.setValue(JSON.stringify(environments, null, 2), -1);
  environmentsJsonChanged();

  settingsEditor.on('blur', () => {
    environments = JSON.parse(settingsEditor.getValue());
    environmentsJsonChanged();
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

  $('#fieldList').on('click', 'tr', function() {
    if (theFieldIndex == $(this).index()) {
      theFieldIndex = -1;
      $('#fieldPath').val('');
    } else {
      theFieldIndex = $(this).index();
      $('#fieldPath').val(getCurrentEnv().fieldList[theFieldIndex].path);
    }
  });

  $('#fieldActive').click(function() {
    if (theFieldIndex < 0) {
      return;
    };
    getCurrentEnv().fieldList[theFieldIndex].active = !getCurrentEnv().fieldList[theFieldIndex].active;
    environmentsJsonChanged();
  });

  $('#fieldUpdate').click(function() {
    if ($('#fieldPath').val() === '') {
      return;
    };
    if (theFieldIndex < 0) {
      getCurrentEnv().fieldList.push({
        active: true,
        path: $('#fieldPath').val(),
      });
      theFieldIndex = getCurrentEnv().fieldList.length - 1;
    } else {
      getCurrentEnv().fieldList[theFieldIndex].path = $('#fieldPath').val();
    }
    environmentsJsonChanged();
  });

  $('#fieldDelete').click(function() {
    if (theFieldIndex < 0) {
      return;
    }
    getCurrentEnv().fieldList.splice(theFieldIndex, 1);
    environmentsJsonChanged();
    theFieldIndex = -1;
  });

  $('#fieldUp').click(function() {
    if (theFieldIndex <= 0) {
      return;
    }
    const movedItem = getCurrentEnv().fieldList[theFieldIndex];
    getCurrentEnv().fieldList.splice(theFieldIndex, 1);
    theFieldIndex--;
    getCurrentEnv().fieldList.splice(theFieldIndex, 0, movedItem);
    environmentsJsonChanged();
  });

  $('#fieldDown').click(function() {
    if (theFieldIndex < 0 || theFieldIndex === getCurrentEnv().fieldList.length - 1) {
      return;
    }
    const movedItem = getCurrentEnv().fieldList[theFieldIndex];
    getCurrentEnv().fieldList.splice(theFieldIndex, 1);
    theFieldIndex++;
    getCurrentEnv().fieldList.splice(theFieldIndex, 0, movedItem);
    environmentsJsonChanged();
  });

  $('#filterEdit').on('click', function() {
    if ($(this)[0].selectionStart == $(this)[0].selectionEnd) {
      $(this).select();
    };
  });

  $('#searchFavourite').click(() => {
    $('#favIcon').toggleClass('fas');
    toggleFilterFavourite($('#searchFilterEdit').val());
  });
}

function toggleFilterFavourite(filter) {
  if (filter === '') {
    return;
  };
  const i = getCurrentEnv().filterList.indexOf(filter);
  if (i >= 0) {
    getCurrentEnv().filterList.splice(i, 1);
  } else {
    getCurrentEnv().filterList.push(filter);
  }
  environmentsJsonChanged();
};

function environmentsJsonChanged() {
  document.cookie = 'ditto-ui-env=' + window.btoa(JSON.stringify(environments));
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
  updateFilterList();
  updateFieldList();

  const usernamePassword = getCurrentEnv().usernamePassword ? getCurrentEnv().usernamePassword : ':';
  $('#userName').val(usernamePassword.split(':')[0]);
  $('#password').val(usernamePassword.split(':')[1]);
  $('#bearer').val(getCurrentEnv().bearer);
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

function updateFieldList() {
  $('#fieldList').empty();
  theFieldIndex = -1;
  for (let i = 0; i < getCurrentEnv().fieldList.length; i++) {
    const field = getCurrentEnv().fieldList[i];
    const fieldSelected = $('#fieldPath').val() === field.path;
    if (fieldSelected) {
      theFieldIndex = i;
    }
    Main.addTableRow($('#fieldList')[0], field.active, field.path, fieldSelected );
  }
  if (theFieldIndex < 0) {
    $('#fieldPath').val('');
  }
};

function updateFilterList() {
  $('#filterList').empty();
  getCurrentEnv().filterList.forEach((filter, i) => {
    Main.addTableRow($('#filterList')[0], filter);
  });
  $('#searchFilterEdit').autocomplete({
    source: getCurrentEnv().filterList,
  });
};

