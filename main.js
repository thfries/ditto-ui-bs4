import * as Things from './modules/things/things.js';
import * as Fields from './modules/things/fields.js';
import * as Attributes from './modules/things/attributes.js';
import * as SearchFilter from './modules/things/searchFilter.js';
import * as Features from './modules/things/features.js';
import * as Policies from './modules/policies/policies.js';
import * as Connections from './modules/connections/connections.js';
import * as Environments from './modules/environments/environments.js';
import * as Authorization from './modules/environments/authorization.js';

let resized = false;
let mainNavbar;

document.addEventListener('DOMContentLoaded', async function() {
  document.getElementById('thingsHTML').innerHTML = await (await fetch('modules/things/things.html')).text();
  document.getElementById('featuresHTML').innerHTML = await (await fetch('modules/things/features.html')).text();
  document.getElementById('policyHTML').innerHTML = await (await fetch('modules/policies/policies.html')).text();
  document.getElementById('connectionsHTML').innerHTML =
      await (await fetch('modules/connections/connections.html')).text();
  document.getElementById('environmentsHTML').innerHTML =
      await (await fetch('modules/environments/environments.html')).text();
  document.getElementById('authorizationHTML').innerHTML =
      await (await fetch('modules/environments/authorization.html')).text();

  await Things.ready();
  await Fields.ready();
  await SearchFilter.ready();
  Attributes.ready();
  Features.ready();
  Policies.ready();
  Connections.ready();
  Authorization.ready();
  Environments.ready();

  // make top navbar activating
  mainNavbar = document.getElementById('mainNavbar');
  mainNavbar.querySelectorAll('.nav-link').forEach((e) => {
    e.addEventListener('click', (event) => {
      mainNavbar.querySelectorAll('.nav-link,.active').forEach((n) => n.classList.remove('active'));
      event.currentTarget.classList.add('active');
    });
  });

  // make tables toggle background on selection
  document.querySelectorAll('.table').forEach((e) => {
    e.addEventListener('click', (event) => {
      if (event.target && event.target.tagName === 'TD') {
        Array.from(event.target.parentNode.parentNode.children).forEach((n) => {
          if (n != event.target.parentNode) {
            n.classList.remove('table-active');
          }
        });
        event.target.parentNode.classList.toggle('table-active');
      };
    });
  });

  // make ace editor resize when user changes height
  const resizeObserver = new ResizeObserver(() => {
    resized = true;
  });
  document.querySelectorAll('.resizable_pane').forEach((e) => {
    resizeObserver.observe(e);
    e.addEventListener('mouseup', () => {
      if (resized) {
        window.dispatchEvent(new Event('resize'));
        resized = false;
      }
    });
  });
});
