/* eslint-disable prefer-const */
/* eslint-disable require-jsdoc */
import * as Environments from './environments.js';
import * as Utils from '../utils.js';
import * as API from '../api.js';

let dom = {
  bearer: null,
  userName: null,
  password: null,
  devOpsUserName: null,
  devOpsPassword: null,
};

export function ready() {
  Environments.addChangeListener(onEnvironmentChanged);

  Utils.getAllElementsById(dom);

  document.getElementById('authorizeBearer').onclick = () => {
    Environments.current().useBasicAuth = false;
    Environments.current().bearer = dom.bearer.value;
    environmentsJsonChanged();
  };

  document.getElementById('authorizeBasic').onclick = () => {
    Environments.current().useBasicAuth = true;
    Environments.current().usernamePassword = dom.userName.value + ':' + dom.password.value;
    Environments.current().usernamePasswordDevOps = dom.devOpsUserName.value + ':' + dom.devOpsPassword.value;
    environmentsJsonChanged();
  };
};

function onEnvironmentChanged() {
  let usernamePassword = Environments.current().usernamePassword ? Environments.current().usernamePassword : ':';
  dom.userName.value = usernamePassword.split(':')[0];
  dom.password.value = usernamePassword.split(':')[1];
  usernamePassword = Environments.current().usernamePasswordDevOps ? Environments.current().usernamePasswordDevOps : ':';
  dom.devOpsUserName.value = usernamePassword.split(':')[0];
  dom.devOpsPassword.value = usernamePassword.split(':')[1];
  dom.bearer.value = Environments.current().bearer;
  API.setAuthHeader();
};
