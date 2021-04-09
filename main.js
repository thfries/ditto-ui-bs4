var settings = {
    'api_uri': 'https://things.eu-1.bosch-iot-suite.com/api/2',
    'bearer':  null,
    'solutionId': null
};

const config = {
    things: {
        listConnections: {
            path: '/solutions/{{solutionId}}/connections',
            method: 'GET',
            body: null
        },
        retrieveConnection: {
            path: '/solutions/{{solutionId}}/connections/{{connectionId}}',
            method: 'GET',
            body: null
        },
        modifyConnection: {
            path: '/solutions/{{solutionId}}/connections/{{connectionId}}',
            method: 'PUT',
            body: '{{connectionJson}}'
        }
    },
    ditto: {
        listConnections: {
            path: '/devops/piggyback/connectivity',
            method: 'POST',
            body: '{ "targetActorSelection": "/user/connectivityRoot/connectionIdsRetrieval/singleton", "headers": { "aggregate": false }, "piggybackCommand": { "type": "connectivity.commands:retrieveAllConnectionIds" } }'
        },
        retrieveConnection: {
            path: '/devops/piggyback/connectivity',
            method: 'POST',
            body: '{ "targetActorSelection": "/system/sharding/connection", "headers": { "aggregate": false }, "piggybackCommand": { "type": "connectivity.commands:retrieveConnection", "connectionId": "{{connectionId}}" } }'
        },
        modifyConnection: {
            path: '/devops/piggyback/connectivity',
            method: 'POST',
            body: '{ "targetActorSelection": "/system/sharding/connection", "headers": { "aggregate": false }, "piggybackCommand": { "type": "connectivity.commands:modifyConnection", "connection": {{connectionJson}} } }' 
        }
    }    
};

var theThing;
var thePolicy;
var thePolicyEntry;
var connectionIdList;
var theConnection;

$(document).ready(function () {
    // Things -----------------------------------
    $('#searchThings').click(searchThings);

    $('#thingsTable').on('click', 'tr', function(event) {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
        refreshThing($(this).text());
    });

    // Attributes -------------------------------
    $('#attributesTable').on('click', 'tr', function(event) {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
        $('#attributePath').val($(this).children(":first").text());
        $('#attributeValue').val($(this).children(":nth-child(2)").text());
    });

    $('#putAttribute').click(function() {
        modifyThing('/attributes/', $('#attributePath').val(), $('#attributeValue').val());
    });

    // Features ---------------------------------
    $('#featuresTable').on('click', 'tr', function(event) {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
        var featureId = $(this).text();
        $('#featureId').val(featureId);
        $('#featureDefinition').val(theThing.features[featureId].definition);
        $('#featureProperties').val(JSON.stringify(theThing.features[featureId].properties, null, 4));
        $('#featureDesireProperties').val(JSON.stringify(theThing.features[featureId].desiredProperties, null, 4));
    });

    $('#putFeature').click(function() {
        var featureObject = {};
        if ($('#featureDefinition').val()) { featureObject.definition = $('#featureDefinition').val().split(',');};
        if ($('#featureProperties').val()) { featureObject.properties = JSON.parse($('#featureProperties').val());};
        if ($('#featureDesiredProperties').val()) { featureObject.desiredProperties = JSON.parse($('#featureDesiredProperties').val());};
        var featureValue = JSON.stringify(featureObject);
        modifyThing('/features/', $('#featureId').val(), featureValue === '{}' ? null : featureValue);
    });

    $('#messageFeature').click(messageFeature);
    
    // Policies ---------------------------------
    $('#policyEntriesTable').on('click', 'tr', function(event) {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
        thePolicyEntry = $(this).text();
        $('#thePolicyEntry').val(thePolicyEntry);
        refillPolicySubjectsAndRessources();
    });

    $('#refreshPolicy').click(function() { refreshPolicy($('#thePolicyId').val());});
    $('#createPolicyEntry').click(function() { return addOrDeletePolicyEntry('PUT');});
    $('#deletePolicyEntry').click(function() { return addOrDeletePolicyEntry('DELETE');});

    $('#policySubjectsTable').on('click', 'tr', function(event) {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
        var subject = $(this).children(":first").text();
        $('#policySubjectId').val(subject);
        $('#policySubjectValue').val(JSON.stringify(thePolicy.entries[thePolicyEntry].subjects[subject]));
    });

    $('#policyResourcesTable').on('click', 'tr', function(event) {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
        var ressource = $(this).children(":first").text();
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
    $('#loadConnections').click(function() { callConnectionsAPI(config[env()].listConnections, function(connections) {
        connectionIdList = [];
        $('#connectionsTable').empty();
        for (var c = 0; c < connections.length; c++) {
            var id = env() === 'things' ? connections[c].id : connections[c];
            connectionIdList.push(id);
            $('#connectionsTable')[0].insertRow().insertCell(0).innerHTML = id;
        };
    })});    

    $('#connectionsTable').on('click', 'tr', function(event) {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
        callConnectionsAPI(config[env()].retrieveConnection, function(connection) {
            theConnection = connection;
            var withJavaScript = theConnection.mappingDefinitions.hasOwnProperty('javascript');
            $('#connectionId').val(theConnection.id);
            $('#connectionJson').val(JSON.stringify(theConnection, null, 4));
            $('#connectionIncomingScript').val(withJavaScript ? theConnection.mappingDefinitions.javascript.options.incomingScript : '');
            $('#connectionOutgoingScript').val(withJavaScript ? theConnection.mappingDefinitions.javascript.options.outgoingScript : '');
        }, $(this).text());
    });

    $('#connectionIncomingScript').change(function() {
        theConnection.mappingDefinitions.javascript.options.incomingScript = $('#connectionIncomingScript').val();
        $('#connectionJson').val(JSON.stringify(theConnection, null, 4));
    });
    $('#connectionOutgoingScript').change(function() {
        theConnection.mappingDefinitions.javascript.options.incomingScript = $('#connectionOutgoingScript').val();
        $('#connectionJson').val(JSON.stringify(theConnection, null, 4));
    });
    $('#connectionJson').change(function() {
        theConnection = JSON.parse($('#connectionJson').val());
    });

    $('#modifyConnection').click(function() { callConnectionsAPI(config[env()].modifyConnection, showSuccess, $('#connectionId').val()); });

    // Settings ----------------------------------
    fillSettingsTable();

    $('#settingsTable').on('click', 'tr', function(event) {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
        var key = $(this).children(":first").text();
        $('#settingsKey').val(key);
        $('#settingsValue').val(settings[key]);
    });

    $('#saveSetting').click(function() {
        var key = $('#settingsKey').val(); 
        settings[key] = $('#settingsValue').val();
        fillSettingsTable();
        if (key === 'bearer') {
            setBearerHeader();
        }
    })

    if (settings.bearer) {
        setBearerHeader();
    }
});

var searchThings = function() {
    $.getJSON(settings.api_uri + "/search/things"
    + "?fields=thingId"
    + "&option=sort(%2BthingId)")
        .done(function(searchResult) {
            $('#thingsTable').empty();
            for (t in searchResult.items) {
                $('#thingsTable')[0].insertRow().insertCell(0).innerHTML = searchResult.items[t].thingId;
            }
        }).fail(showError);
};

var refreshThing = function(thingId) {
    thingId = thingId || theThing.thingId;
    $.getJSON(settings.api_uri + "/things/" + thingId + "?fields=thingId%2Cattributes%2Cfeatures%2C_created%2C_modified%2C_revision%2C_policy")
        .done(function(thing, status) {
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
            for (var key of Object.keys(thing.attributes)) {
                addTableRow($('#attributesTable')[0], key, thing.attributes[key]);
            };
            
            // Update features table
            $('#featuresTable').empty();
            for (var key of Object.keys(thing.features)) {
                addTableRow($('#featuresTable')[0], key);
            };
            
            // Update policy
            $('#thePolicyId').val(thePolicy.policyId);
            refreshPolicy();
        }).fail(showError);
};

function modifyThing(type, key, value) {
    if (!theThing) { showError(null, 'Error', 'No Thing selected'); return; }
    if (!key) { showError(null, 'Error', 'FeatureId is empty'); return; } 
    if (value) {
        if (type === '/attributes/') {
            value = '"' + value + '"';
        }
        $.ajax(settings.api_uri + '/things/' + theThing.thingId + type + key, {
            type: 'PUT',
            contentType: 'application/json',
            data: value,
            success: refreshThing,
            error: showError
        });
    } else {
        $.ajax(settings.api_uri + '/things/' + theThing.thingId + type + key, {
            type: 'DELETE',
            success: refreshThing,
            error: showError
        });
    }
};

var messageFeature = function() {
    var subject = $('#messageFeatureSubject').val();
    var feature = $('#featureId').val();
    var payload = $('#messageFeaturePayload').val();
    if (subject && feature && payload) {
        $.post(settings.api_uri + '/things/' + theThing.thingId + '/features/' + feature + '/inbox/messages/' + subject + '?timeout=' + $('#messageTimeout').val(),
            payload,
            function() {console.log('message sent')}
        );
    } else {
        showError(null, 'Error', 'FeatureId or Subject or Payload is empty');
    }
};

var refreshPolicy = function(policyId) {
    if (!thePolicy) { showError(null, 'Error', 'No Policy selected'); return; }
    policyId = policyId || thePolicy.policyId;
    $('#policyEntriesTable').empty();
    $.getJSON(settings.api_uri + '/policies/' + policyId)
        .done(function(policy, status) {
            thePolicy = policy;
            for (var key of Object.keys(thePolicy.entries)) {
                addTableRow($('#policyEntriesTable')[0], key, null, key === thePolicyEntry);
                if (key === thePolicyEntry) {
                    refillPolicySubjectsAndRessources();
                }
            };
        }).fail(showError);
};

function refillPolicySubjectsAndRessources() {
    $('#policySubjectsTable').empty();
    for (var key of Object.keys(thePolicy.entries[thePolicyEntry].subjects)) {
        addTableRow($('#policySubjectsTable')[0], key, JSON.stringify(thePolicy.entries[thePolicyEntry].subjects[key]));
    }
    $('#policyResourcesTable').empty();
    for (var key of Object.keys(thePolicy.entries[thePolicyEntry].resources)) {
        addTableRow($('#policyResourcesTable')[0], key, JSON.stringify(thePolicy.entries[thePolicyEntry].resources[key]));
    }
};

var addOrDeletePolicyEntry = function(method) {
    var label = $('#thePolicyEntry').val();
    if (label) {
        $.ajax(settings.api_uri + '/policies/' + thePolicy.policyId + '/entries/' + label, {
            type: method,
            data: JSON.stringify({ subjects: {}, resources: {}}),
            contentType: 'application/json',
            success: refreshPolicy,
            error: function(errorObject) {console.log(errorObject);}
        });
    } else {
        showError(null, 'Error', 'Entry is empty');
    }
};

function modifyPolicyEntry(type, key, value) {
    if (thePolicyEntry && key) {
        if (value) {
            $.ajax(settings.api_uri + '/policies/' + thePolicy.policyId + '/entries/' + thePolicyEntry + type + key, {
                type: 'PUT',
                contentType: 'application/json',
                data: value,
                success: refreshPolicy,
                error: showError
            })
        } else {
            $.ajax(settings.api_uri + '/policies/' + thePolicy.policyId + '/entries/' + thePolicyEntry + type + key, {
                type: 'DELETE',
                success: refreshPolicy,
                error: showError
            })
        }
    } else {
        showError(null, 'Error', 'No Policy Entry selected or Subject or Ressource is empty');
    }
};

function callConnectionsAPI(params, successCallback, connectionId) {
    console.log(settings.api_uri + params.path.replace('{{solutionId}}', settings.solutionId).replace('{{connectionId}}', connectionId));
    console.log(params.body ? params.body.replace('{{connectionId}}', connectionId).replace('{{connectionJson}}', JSON.stringify(theConnection)) : null);
    
    if (env() === 'things' && !settings.solutionId) { showError(null, 'Error', 'SolutionId is empty'); return; };
    $.ajax(settings.api_uri + params.path.replace('{{solutionId}}', settings.solutionId).replace('{{connectionId}}', connectionId), {
        type: params.method,
        data: params.body ? params.body.replace('{{connectionId}}', connectionId).replace('{{connectionJson}}', JSON.stringify(theConnection)) : null,
        contentType: 'application/json',
        success: successCallback,
        error: showError
    });
};

function fillSettingsTable() {
    $('#settingsTable').empty();
    for (var key of Object.keys(settings)) {
        addTableRow($('#settingsTable')[0], key, settings[key] ? truncate(settings[key],50) : ' ');
    };
};

function env() {
    return settings.api_uri.startsWith('https://things') ? 'things' : 'ditto';
};

var addTableRow = function(table, key, value, selected) {
    var row = table.insertRow();
    row.insertCell(0).innerHTML = key;
    if (value) {
        row.insertCell(1).innerHTML = value;
    }
    if (selected) {
        row.classList.add('bg-info');
    }
    
};

function setBearerHeader() {
    $.ajaxSetup({
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + settings.bearer);
        }
    });
};

function truncate(str, n) {
    return (str && str.length > n) ? str.substr(0, n-1) + '&hellip;' : str;
};

function showError(xhr, status, message) {
    $('#errorHeader').text(xhr ? xhr.status : status);
    $('#errorBody').text(xhr ? xhr.responseText : message);
    $('#errorToast').toast('show');
}

function showSuccess(data, status, xhr) {
    $('#successHeader').text(xhr.status ? xhr.status : status);
    $('#successBody').text(status);
    $('#successToast').toast('show');
}
