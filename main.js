'use strict';

import { config } from './config.js';
import { JSONPath } from "https://cdn.jsdelivr.net/npm/jsonpath-plus@5.0.3/dist/index-browser-esm.min.js";

let settings = {
    local_ditto: {
        api_uri: 'http://localhost:8080',
        solutionId: null,
        bearer:  null,
        usernamePassword: 'ditto:ditto',
        useBasicAuth: true,
        fieldList: []
    },
    cloud_things_aws: {
        api_uri: 'https://things.eu-1.bosch-iot-suite.com',
        solutionId: null,
        bearer:  null,
        usernamePassword: null,
        useBasicAuth: false,
        fieldList: [
            {active: true, path: '/features/TypePlate'},
            {active: false, path: '/features/ConnectionStatus'}
        ]
    }
};

let theEnv;
let theThing;
let theAttribute;
let theFeature;
let thePolicy;
let thePolicyEntry;
let connectionIdList;
let theConnection;
let theFieldIndex = -1;

let thingJsonEditor;
let featurePropertiesEditor;
let featureDesiredPropertiesEditor;

let ws;

$(document).ready(function () {

    $(".nav-item").on("click", function(){
        $(this).addClass("active").siblings().removeClass("active");
     });

    $('.table').on('click', 'tr', function() {
        $(this).toggleClass('bg-info').siblings().removeClass('bg-info');
    });

    // make ace editor resize when user changes height
    $(".resizable_pane").mouseup(function(event) {
        let oldHeight = $(this).data('oldHeight');
        if (oldHeight && oldHeight != $(this).height()) {
            window.dispatchEvent(new Event('resize'))
        }
        $(this).data('oldHeight', $(this).height());
    });

    // Things -----------------------------------
    thingJsonEditor = ace.edit("thingJsonEditor");
    thingJsonEditor.session.setMode("ace/mode/json");

    $('#searchThings').click(searchThings);
    $('#createThing').click(function() {
        $.ajax(settings[theEnv].api_uri + '/api/2/things', {
            type: 'POST',
            contentType: 'application/json',
            data: '{}',
            success: function(data, textStatus, xhr) {
                showSuccess(data, textStatus, xhr);
                searchThings();
            },
            error: showError
        });
    });

    $('#putThing').click(clickModifyThing('PUT'));
    $('#deleteThing').click(clickModifyThing('DELETE'));

    $('#thingsTable').on('click', 'tr', function(event) {
        refreshThing($(this)[0].id);
    });

    $('#fieldList').on('click', 'tr', function() {
        console.log(theFieldIndex);
        if (theFieldIndex == $(this).index()) {
            theFieldIndex = -1;
        } else {
            theFieldIndex = $(this).index();
            $('#fieldActive')[0].active = settings[theEnv].fieldList[theFieldIndex].active;
            $('#fieldPath').val(settings[theEnv].fieldList[theFieldIndex].path);
        }
        // settings[theEnv].fieldList[$(this).index()].active = !settings[theEnv].fieldList[$(this).index()].active;
        console.log('theFieldIndex: ' + theFieldIndex);
    });
    
    $('#fieldActive').click(function() {
        if (theFieldIndex < 0) { return; };
        settings[theEnv].fieldList[theFieldIndex].active = !settings[theEnv].fieldList[theFieldIndex].active;
        settingsEditor.setValue(JSON.stringify(settings, null, 2), -1);
        updateEnvironment();
        console.log('Fields: #' + settings[theEnv].fieldList.filter( f => f.active).map( f => f.path) + '#');
        console.log('theFieldIndex: ' + theFieldIndex);
    });

    $('#fieldUpdate').click(function() {
        if ($('#fieldPath').val() === "") { return;};
        if (theFieldIndex < 0) {
            settings[theEnv].fieldList.push({
                active: true,
                path: $('#fieldPath').val()
            });
            theFieldIndex = settings[theEnv].fieldList.length - 1;
        } else {
            settings[theEnv].fieldList[theFieldIndex].path = $('#fieldPath').val();
        }
        settingsEditor.setValue(JSON.stringify(settings, null, 2), -1);
        updateEnvironment();
        console.log('theFieldIndex: ' + theFieldIndex);
    });

    $('#fieldDelete').click(function() {
        if (theFieldIndex < 0) { return;}
        settings[theEnv].fieldList.splice(theFieldIndex, 1);
        settingsEditor.setValue(JSON.stringify(settings, null, 2), -1);
        updateEnvironment();
        theFieldIndex = -1;
        console.log('theFieldIndex: ' + theFieldIndex);
    })

    $('#fieldUp').click(function() {
        if (theFieldIndex <= 0) { return;}
        let movedItem = settings[theEnv].fieldList[theFieldIndex];
        settings[theEnv].fieldList.splice(theFieldIndex, 1);
        theFieldIndex--;
        settings[theEnv].fieldList.splice(theFieldIndex, 0, movedItem);        
        updateEnvironment();
        console.log('theFieldIndex: ' + theFieldIndex);
    });

    $('#fieldDown').click(function() {
        if (theFieldIndex < 0 || theFieldIndex === settings[theEnv].fieldList.length - 1) { return;}
        let movedItem = settings[theEnv].fieldList[theFieldIndex];
        settings[theEnv].fieldList.splice(theFieldIndex, 1);
        theFieldIndex++;
        settings[theEnv].fieldList.splice(theFieldIndex, 0, movedItem);        
        updateEnvironment();
        console.log('theFieldIndex: ' + theFieldIndex);
    });

    // Attributes -------------------------------
    $('#attributesTable').on('click', 'tr', function(event) {
        theAttribute = $(this).children(":first").text();
        refreshAttribute(theThing, theAttribute);
    });

    $('#putAttribute').click(clickAttribute('PUT'));
    $('#deleteAttribute').click(clickAttribute('DELETE'));

    // Features ---------------------------------
    $('#featuresTable').on('click', 'tr', function(event) {
        theFeature = $(this).text();
        refreshFeature(theThing, theFeature);
    });

    $('#putFeature').click(clickFeature('PUT'));
    $('#deleteFeature').click(clickFeature('DELETE'));

    featurePropertiesEditor = ace.edit("featurePropertiesEditor");
    featurePropertiesEditor.session.setMode("ace/mode/json");
    featureDesiredPropertiesEditor = ace.edit("featureDesiredPropertiesEditor");
    featureDesiredPropertiesEditor.session.setMode("ace/mode/json");

    featurePropertiesEditor.session.getSelection().on('changeCursor', function() {
        let position = featurePropertiesEditor.getCursorPosition();
        let token = featurePropertiesEditor.session.getTokenAt(position.row, position.column);
        if (!token) {return;};
        let path = '$..' + token.value.replace(/['"]+/g, '').trim();
        let res = JSONPath({json: JSON.parse(featurePropertiesEditor.getValue()), path: path, resultType: 'pointer'});
        $('#featurePath').val(res);
        theFieldIndex = -1;
    });
    
    $('#messageFeature').click(messageFeature);
    
    // Policies ---------------------------------
    $('#refreshPolicy').click(refreshPolicy);

    $('#policyEntriesTable').on('click', 'tr', function(event) {
        thePolicyEntry = $(this).text();
        $('#thePolicyEntry').val(thePolicyEntry);
        refillPolicySubjectsAndRessources();
    });

    $('#createPolicyEntry').click(function() { return addOrDeletePolicyEntry('PUT');});
    $('#deletePolicyEntry').click(function() { return addOrDeletePolicyEntry('DELETE');});

    $('#policySubjectsTable').on('click', 'tr', function(event) {
        let subject = $(this).children(":first").text();
        $('#policySubjectId').val(subject);
        $('#policySubjectValue').val(JSON.stringify(thePolicy.entries[thePolicyEntry].subjects[subject]));
    });

    $('#policyResourcesTable').on('click', 'tr', function(event) {
        let ressource = $(this).children(":first").text();
        $('#policyResourceId').val(ressource);
        $('#policyResourceValue').val(JSON.stringify(thePolicy.entries[thePolicyEntry].resources[ressource]));
    });

    $('#putPolicySubject').click(function() {
        modifyPolicyEntry('/subjects/', $('#policySubjectId').val(), $('#policySubjectValue').val());
    });

    $('#putPolicyResource').click(function () {
        modifyPolicyEntry('/resources/', $('#policyResourceId').val(), $('#policyResourceValue').val());
    });

    // Connections ---------------------------------
    let connectionEditor = ace.edit("connectionEditor");
    connectionEditor.session.setMode("ace/mode/json");
    let incomingEditor = ace.edit("connectionIncomingScript");
    incomingEditor.session.setMode("ace/mode/javascript");
    let outgoingEditor = ace.edit("connectionOutgoingScript");
    outgoingEditor.session.setMode("ace/mode/javascript");

    $('#loadConnections').click(loadConnections);
    
    $('#createConnection').click(function() {
        if (env() === 'things') {
            delete theConnection['id'];            
        }
        callConnectionsAPI(config[env()].createConnection, function(newConnection) {
            connectionIdList.push(newConnection.id);
            addTableRow($('#connectionsTable')[0], newConnection.id);
        });
    });

    $('#connectionsTable').on('click', 'tr', function(event) {
        callConnectionsAPI(config[env()].retrieveConnection, function(connection) {
            theConnection = connection;
            let withJavaScript = theConnection.mappingDefinitions && theConnection.mappingDefinitions.javascript;
            $('#connectionId').val(theConnection.id);
            connectionEditor.setValue(JSON.stringify(theConnection, null, 2));
            incomingEditor.setValue(withJavaScript ? theConnection.mappingDefinitions.javascript.options.incomingScript : '', -1);
            outgoingEditor.setValue(withJavaScript ? theConnection.mappingDefinitions.javascript.options.outgoingScript : '', -1);
        }, $(this)[0].id);
    });

    incomingEditor.on('blur', function() {
        theConnection.mappingDefinitions.javascript.options.incomingScript = incomingEditor.getValue();
        connectionEditor.setValue(JSON.stringify(theConnection, null, 2));
    });
    outgoingEditor.on('blur', function() {
        theConnection.mappingDefinitions.javascript.options.outgoingScript = outgoingEditor.getValue();
        connectionEditor.setValue(JSON.stringify(theConnection, null, 2));
    });
    connectionEditor.on('blur', function() {
        theConnection = JSON.parse(connectionEditor.getValue());
    });

    $('#modifyConnection').click(function() {
        callConnectionsAPI(config[env()].modifyConnection, showSuccess, $('#connectionId').val()); 
    });
    
    $('#deleteConnection').click(function() {
        callConnectionsAPI(config[env()].deleteConnection, loadConnections, $('#connectionId').val()); 
    });

    // Settings ----------------------------------
    let settingsEditor = ace.edit("settingsEditor");
    settingsEditor.session.setMode("ace/mode/json");

    settingsEditor.setValue(JSON.stringify(settings, null, 2), -1);
    updateSettings(settingsEditor);
    settingsEditor.on('blur', function() { return updateSettings(settingsEditor);});

    $('#environmentSelector').on('change', function() {
        theEnv = this.value;
        updateEnvironment();
    });
});

function openWebSocket() {
    ws = new WebSocket('ws://' + settings[theEnv].usernamePassword + '@' + settings[theEnv].api_uri + '/ws/1') //?access_token=' + settings[theEnv].bearer);
    
    ws.onopen = function() {
        ws.onmessage = onMessage;
        ws.onerror = onMessage;
        ws.onclose = onClose;
        ws.send('START-SEND-MESSAGES');
    }
};

let onClose = function() {
    console.log('WebSocket was closed');
}

let onMessage = function(message) {
    console.log(message);
};

let clickModifyThing = function(method) {
    return function() {
        if (!$('#thingId').val()) { showError(null, 'Error', 'thingId is empty'); return; }
        callDittoREST(
            method,
            '/things/' + $('#thingId').val(),
            method === 'PUT' ? thingJsonEditor.getValue() : null,
            function() { method === 'PUT' ? refreshThing(thingId) : searchThings(); }
        );
    };
};

let clickAttribute = function(method) {
    return function() {
        if (!theThing) { showError(null, 'Error', 'No Thing selected'); return; };
        if (!$('#attributePath').val()) { showError(null, 'Error', 'AttributePath is empty'); return; };
        callDittoREST(
            method,
            '/things/' + theThing.thingId + '/attributes/' + $('#attributePath').val(),
            method === 'PUT' ? '"' + $('#attributeValue').val() + '"' : null,
            function() { refreshThing(theThing.thingId); }
        );
    };
};

let clickFeature = function(method) {
    return function() {
        if (!theThing) { showError(null, 'Error', 'No Thing selected'); return; };
        if (!$('#featureId').val()) { showError(null, 'Error', 'FeatureId is empty'); return; }; 
        let featureObject = {};
        let featureProperties = featurePropertiesEditor.getValue();
        let featureDesiredProperties = featureDesiredPropertiesEditor.getValue();
        if ($('#featureDefinition').val()) {
            featureObject.definition = $('#featureDefinition').val().split(',');
        };
        if (featureProperties) {
            featureObject.properties = JSON.parse(featureProperties);
        };
        if (featureDesiredProperties) {
            featureObject.desiredProperties = JSON.parse(featureDesiredProperties);
        };
        let featureValue = JSON.stringify(featureObject) === '{}' ? null : JSON.stringify(featureObject);
        callDittoREST(
            method,
            '/things/' + theThing.thingId + '/features/' + $('#featureId').val(),
            method === 'PUT' ? featureValue : null,
            function() { refreshThing(theThing.thingId); }
        );
    };
}

let searchThings = function() {
    let filter = $('#search-filter').val();
    // let fields = $('#search-fields').val();
    let fields = settings[theEnv].fieldList.filter( f => f.active).map( f => f.path);
    $.getJSON(settings[theEnv].api_uri + "/api/2/search/things"
    + "?fields=thingId"
    + (fields != '' ? "," + fields : '')
    + (filter != '' ? "&filter=" + encodeURIComponent(filter) : '')
    + "&option=sort(%2BthingId)")
        .done(function(searchResult) {
            $('#thingsTable').empty();
            searchResult.items.forEach((item, t) => {
                let row = $('#thingsTable')[0].insertRow();
                row.id = item.thingId;
                row.insertCell(0).innerHTML = item.thingId;
                fields.forEach((key, i) => {
                    let path = key.replace(/\//g, '.');
                    if (path.charAt(0) != '.') {
                        path = '$.' + path;
                    }
                    let elem = JSONPath({json: item, path: path});
                    row.insertCell(-1).innerHTML = elem.length != 0 ? elem[0] : '';
                });
            });
            $('#filter-examples').append($('<option>', {text: filter}));
        }).fail(showError);
};

let refreshThing = function(thingId) {
    $.getJSON(settings[theEnv].api_uri + "/api/2/things/" + thingId + "?fields=thingId%2Cattributes%2Cfeatures%2C_created%2C_modified%2C_revision%2C_policy")
        .done(function(thing, status, xhr) {
            showSuccess(null, status, xhr);
            theThing = thing;
            thePolicy = thing._policy;
            // Update fields of Thing table
            $('#thingDetails').empty();
            addTableRow($('#thingDetails')[0], 'thingId', thing.thingId);
            addTableRow($('#thingDetails')[0], 'policyId', thePolicy.policyId);
            addTableRow($('#thingDetails')[0], 'revision', thing._revision);
            addTableRow($('#thingDetails')[0], 'created', thing._created);
            addTableRow($('#thingDetails')[0], 'modified', thing._modified);
            
            // Update attributes table
            $('#attributesTable').empty();
            let count = 0;
            let thingHasAttribute = false;
            if (thing.attributes) {
                for (let key of Object.keys(thing.attributes)) {
                    if (key === theAttribute) {
                        refreshAttribute(thing, key);
                        thingHasAttribute = true;
                    };
                    addTableRow($('#attributesTable')[0], key, JSON.stringify(thing.attributes[key]), key === theAttribute);
                    count++;
                };
            }
            $('#attributeCount').text(count > 0 ? count : "");
            if (!thingHasAttribute) {
                theAttribute = false;
                refreshAttribute();
            }
            
            // Update features table
            $('#featuresTable').empty();
            count = 0;
            let thingHasFeature = false
            if (thing.features) {
                for (let key of Object.keys(thing.features)) {
                    if (key === theFeature) {
                        refreshFeature(thing, key);
                        thingHasFeature = true;
                    };
                    addTableRow($('#featuresTable')[0], key, null, key === theFeature);
                    count++;
                };
            }
            $('#featureCount').text(count > 0 ? count : "");
            if (!thingHasFeature) {
                theFeature = false;
                refreshFeature();
            }

            // Update edit thing area
            let thingCopy = theThing;
            delete thingCopy['_revision'];
            delete thingCopy['_created'];
            delete thingCopy['_modified'];
            delete thingCopy['_policy'];
            thingCopy.policyId = thePolicy.policyId;
            $('#thingId').val(theThing.thingId);
            thingJsonEditor.setValue(JSON.stringify(thingCopy, null, 2));
            
            // Update policy
            $('#thePolicyId').val(thePolicy.policyId);
            refreshPolicy();
        }).fail(showError);
};

function refreshAttribute(thing, attribute) {
    $('#attributePath').val(thing ? attribute : '');
    $('#attributeValue').val(thing ? JSON.stringify(thing.attributes[attribute]) : '');
}

function refreshFeature(thing, feature) {
    if (thing) {
        $('#featureId').val(feature);
        $('#featureDefinition').val(thing.features[feature].definition);
        if (thing.features[feature]['properties']) {
            featurePropertiesEditor.setValue(JSON.stringify(thing.features[feature].properties, null, 4), -1)
        } else {
            featurePropertiesEditor.setValue('');
        }
        if (thing.features[feature]['desiredProperties']) {
            featureDesiredPropertiesEditor.setValue(JSON.stringify(thing.features[feature].desiredProperties, null, 4), -1);
        } else {
            featureDesiredPropertiesEditor.setValue('');
        }
    } else {
        $('#featureId').val('');
        $('#featureDefinition').val('');
        featurePropertiesEditor.setValue('');
        featureDesiredPropertiesEditor.setValue('');
    }
}

// function modifyThing(method, type, key, value) {
//     if (!key) { showError(null, 'Error', 'FeatureId is empty'); return; } 
//     $.ajax(settings[theEnv].api_uri + '/api/2/things/' + theThing.thingId + type + key, {
//         type: method,
//         contentType: 'application/json',
//         data: value,
//         success: ,
//         error: showError
//     });
// };

let messageFeature = function() {
    let subject = $('#messageFeatureSubject').val();
    let feature = $('#featureId').val();
    let timeout = $('#messageTimeout').val();
    let payload = $('#messageFeaturePayload').val();
    if (subject && feature && payload) {
        $('#messageFeatureResponse').val('');
        $.post(settings[theEnv].api_uri + '/api/2/things/' + theThing.thingId + '/features/' + feature + '/inbox/messages/' + subject + '?timeout=' + timeout,
            payload,
            function(data, status, xhr) {
                showSuccess(data, status, xhr);
                if (timeout > 0) {
                    $('#messageFeatureResponse').val(JSON.stringify(data, null, 2));
                };
            }
        );
    } else {
        showError(null, 'Error', 'FeatureId or Subject or Payload is empty');
    }
};

let refreshPolicy = function() {
    let policyId = thePolicy ? thePolicy.policyId : $('#thePolicyId').val();
    if (policyId === '') { showError(null, 'Error', 'policyId is empty'); return; }
    $.getJSON(settings[theEnv].api_uri + '/api/2/policies/' + policyId)
        .done(function(policy, status, xhr) {
            showSuccess(null, status, xhr);
            thePolicy = policy;
            $('#policyEntriesTable').empty();
            for (let key of Object.keys(thePolicy.entries)) {
                addTableRow($('#policyEntriesTable')[0], key, null, key === thePolicyEntry);
                if (key === thePolicyEntry) {
                    refillPolicySubjectsAndRessources();
                }
            };
        }).fail(showError);       
};

function refillPolicySubjectsAndRessources() {
    $('#policySubjectsTable').empty();
    for (let key of Object.keys(thePolicy.entries[thePolicyEntry].subjects)) {
        addTableRow($('#policySubjectsTable')[0], key, JSON.stringify(thePolicy.entries[thePolicyEntry].subjects[key]));
    }
    $('#policyResourcesTable').empty();
    for (let key of Object.keys(thePolicy.entries[thePolicyEntry].resources)) {
        addTableRow($('#policyResourcesTable')[0], key, JSON.stringify(thePolicy.entries[thePolicyEntry].resources[key]));
    }
};

let addOrDeletePolicyEntry = function(method) {
    let label = $('#thePolicyEntry').val();
    if (label && !(label === thePolicyEntry)) {
        $.ajax(settings[theEnv].api_uri + '/api/2/policies/' + thePolicy.policyId + '/entries/' + label, {
            type: method,
            data: JSON.stringify({ subjects: {}, resources: {}}),
            contentType: 'application/json',
            success: refreshPolicy,
            error: showError
        });
    } else {
        showError(null, 'Error', 'Entry already exists or is empty');
    }
};

function modifyPolicyEntry(type, key, value) {
    if (thePolicyEntry && key) {
        if (value) {
            $.ajax(settings[theEnv].api_uri + '/api/2/policies/' + thePolicy.policyId + '/entries/' + thePolicyEntry + type + key, {
                type: 'PUT',
                contentType: 'application/json',
                data: value,
                success: refreshPolicy,
                error: showError
            })
        } else {
            $.ajax(settings[theEnv].api_uri + '/api/2/policies/' + thePolicy.policyId + '/entries/' + thePolicyEntry + type + key, {
                type: 'DELETE',
                success: refreshPolicy,
                error: showError
            })
        }
    } else {
        showError(null, 'Error', 'No Policy Entry selected or Subject or Ressource is empty');
    }
};

let loadConnections = function() {
    callConnectionsAPI(config[env()].listConnections, function(connections) {
        connectionIdList = [];
        $('#connectionsTable').empty();
        for (let c = 0; c < connections.length; c++) {
            let id = env() === 'things' ? connections[c].id : connections[c];
            connectionIdList.push(id);
            let row = $('#connectionsTable')[0].insertRow();
            row.id = id;
            row.insertCell(0).innerHTML = id;
            callConnectionsAPI(config[env()].retrieveStatus, updateConnectionRow(row, 'liveStatus', -1), id);
            callConnectionsAPI(config[env()].retrieveConnection, updateConnectionRow(row, 'name', 0), id);
        };
    });
};

let updateConnectionRow = function (targetRow, fieldToExtract, index) {
    return function(data) {
        targetRow.insertCell(index).innerHTML = data[fieldToExtract];
    };
};

function callDittoREST(method, path, body, success) {
    $.ajax(settings[theEnv].api_uri + '/api/2' + path, {
        type: method,
        contentType: 'application/json',
        data: body,
        success: success,
        error: showError
    });
};

function callConnectionsAPI(params, successCallback, connectionId) {
    if (env() === 'things' && !settings[theEnv].solutionId) { showError(null, 'Error', 'SolutionId is empty'); return; };
    $.ajax(settings[theEnv].api_uri + params.path.replace('{{solutionId}}', settings[theEnv].solutionId).replace('{{connectionId}}', connectionId), {
        type: params.method,
        data: params.body ? params.body.replace('{{connectionId}}', connectionId).replace('{{connectionJson}}', JSON.stringify(theConnection)) : null,
        contentType: 'application/json',
        success: function(data, status, xhr) {
            if(data && data['?'] && data['?']['?'].status >= 400) {
                showError(null, data['?']['?'].status, JSON.stringify(data['?']['?'].payload));
            } else {
                if (params.unwrapJsonPath) {
                    params.unwrapJsonPath.split('.').forEach(function(node) {
                        data = data[node];
                    });
                };
                successCallback(data, status, xhr);
            }
        },
        error: showError
    });
};

function updateSettings(editor) {
    settings = JSON.parse(editor.getValue());
    $("#environmentSelector").empty();
    if (theEnv && !settings[theEnv]) { theEnv = null;};
    for (let key of Object.keys(settings)) {
        $('#environmentSelector').append($('<option></option>').text(key));
        if (!theEnv) {
            theEnv = key;
        };
    };
    $('#environmentSelector').val(theEnv);
    updateEnvironment();
}

function updateEnvironment() {
    $('#fieldList').empty();
    for (let i = 0; i < settings[theEnv].fieldList.length; i++) {
        let field = settings[theEnv].fieldList[i];
        addTableRow($('#fieldList')[0], field.active, field.path, $('#fieldPath').val() === field.path);
    }
    setAuthHeader();
    // openWebSocket();
}

function env() {
    return settings[theEnv].api_uri.startsWith('https://things') ? 'things' : 'ditto';
};

let addTableRow = function(table, key, value, selected) {
    let row = table.insertRow();
    row.insertCell(0).innerHTML = key;
    if (value) {
        row.insertCell(1).innerHTML = value;
    }
    if (selected) {
        row.classList.add('bg-info');
    }
    
};

function setAuthHeader() {
    if (!settings[theEnv].bearer && !settings[theEnv].usernamePassword) { return; };
    let auth = settings[theEnv].useBasicAuth ? 'Basic ' + window.btoa(settings[theEnv].usernamePassword) : 'Bearer ' + settings[theEnv].bearer;
    $.ajaxSetup({
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', auth);
        }
    });
};

function showError(xhr, status, message) {
    $('#errorHeader').text(xhr ? xhr.status : status);
    $('#errorBody').text(xhr ? (xhr.responseJSON ? JSON.stringify(xhr.responseJSON, null, 2) : xhr.statusText) : message);
    $('#errorToast').toast('show');
}

function showSuccess(data, status, xhr) {
    $('#successHeader').text(xhr.status ? xhr.status : status);
    $('#successBody').text(status);
    $('#successToast').toast('show');
}
