var settings = {
    'api_uri': 'https://things.eu-1.bosch-iot-suite.com/api/2',
    'bearer':  null
}

var theThing;
var thePolicy;
var thePolicyEntry;

$(document).ready(function () {
    // Globals ----------------------------------
    $('#api_uri').val(settings.api_uri);
    $('#api_uri').change(function() { settings.api_uri = $('#api_uri').val();});
    $('#bearer').val(settings.bearer);
    $('#bearer').change(function() {
        settings.bearer = $('#bearer').val();
        setBearerHeader();
    });
    if (settings.bearer) {
        setBearerHeader();
    }

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
    })

    // Features ---------------------------------
    $('#featuresTable').on('click', 'tr', function(event) {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
        $('#featureId').val($(this).text());
        $('#featureValue').val(JSON.stringify(theThing.features[$(this).text()], null, 4));
    });

    $('#putFeature').click(function() {
        modifyThing('/features/', $('#featureId').val(), $('#featureValue').val());
    });

    $('#messageFeature').click(messageFeature);
    
    // Policies ---------------------------------
    $('#policyEntriesTable').on('click', 'tr', function(event) {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
        thePolicyEntry = $(this).text();
        $('#thePolicyEntry').val(thePolicyEntry);
        refillPolicySubjectsAndRessources();
    });

    $('#refreshPolicy').click(function() { refreshPolicy($('#thePolicyId').val());})
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
    })
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
        });
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
        });
};

function modifyThing(type, key, value) {
    if (key) {
        if (value) {
            if (type === '/attributes/') {
                value = '"' + value + '"';
            }
            $.ajax(settings.api_uri + '/things/' + theThing.thingId + type + key, {
                type: 'PUT',
                contentType: 'application/json',
                data: value,
                success: refreshThing
            });
        } else {
            $.ajax(settings.api_uri + '/things/' + theThing.thingId + type + key, {
                type: 'DELETE',
                success: refreshThing
            });
        }
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

    }

};

var refreshPolicy = function(policyId) {
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
        })
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
    }
};

function modifyPolicyEntry(type, key, value) {
    if (thePolicyEntry && key) {
        if (value) {
            $.ajax(settings.api_uri + '/policies/' + thePolicy.policyId + '/entries/' + thePolicyEntry + type + key, {
                type: 'PUT',
                contentType: 'application/json',
                data: value,
                success: function (response) {
                    refreshPolicy();
                }
            })
        } else {
            $.ajax(settings.api_uri + '/policies/' + thePolicy.policyId + '/entries/' + thePolicyEntry + type + key, {
                type: 'DELETE',
                success: function (response) {
                    refreshPolicy();
                }
            })
        }
    } else {
        alert('No Policy Entry selected or no key is set!');
    }
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

