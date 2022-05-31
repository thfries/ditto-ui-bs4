/* eslint-disable prefer-const */
/* eslint-disable require-jsdoc */
import * as Environments from './environments.js';
import * as API from '../api.js';

let dom = {};

export function ready() {
  Environments.addChangeListener(onEnvironmentChanged);

  dom.bearer = document.getElementById('bearer');
  dom.userName = document.getElementById('userName');
  dom.password = document.getElementById('password');
  dom.devOpsUserName = document.getElementById('devOpsUserName');
  dom.devOpsPassword = document.getElementById('devOpsPassword');

  document.getElementById('authorizeBearer').onclick = () => {
    Environments.getCurrentEnv().useBasicAuth = false;
    Environments.getCurrentEnv().bearer = dom.bearer.value;
    environmentsJsonChanged();
  };

  document.getElementById('authorizeBasic').onclick = () => {
    Environments.getCurrentEnv().useBasicAuth = true;
    Environments.getCurrentEnv().usernamePassword = dom.userName.value + ':' + dom.password.value;
    Environments.getCurrentEnv().usernamePasswordDevOps = dom.devOpsUserName.value + ':' + dom.devOpsPassword.value;
    environmentsJsonChanged();
  };
};

function onEnvironmentChanged() {
  let usernamePassword = Environments.getCurrentEnv().usernamePassword ? Environments.getCurrentEnv().usernamePassword : ':';
  dom.userName.value = usernamePassword.split(':')[0];
  dom.password.value = usernamePassword.split(':')[1];
  usernamePassword = Environments.getCurrentEnv().usernamePasswordDevOps ? Environments.getCurrentEnv().usernamePasswordDevOps : ':';
  dom.devOpsUserName.value = usernamePassword.split(':')[0];
  dom.devOpsPassword.value = usernamePassword.split(':')[1];
  dom.bearer.value = Environments.getCurrentEnv().bearer;
  API.setAuthHeader();
};
