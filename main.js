var settings = {
    'api_uri': 'https://things.eu-1.bosch-iot-suite.com/api/2',
    'bearer':  'eyJhbGciOiJSUzI1NiIsImtpZCI6InB1YmxpYzo5YzI0MTg0OC01MmQyLTRkM2YtYmFmOS1mNzE3OTYxMmE3YWMiLCJ0eXAiOiJKV1QifQ.eyJhdWQiOltdLCJjbGllbnRfaWQiOiJmMTAwYTJjYi1mMjY4LTQ3ZGQtYTdiOS1kZDNkZDdiNDUxZDAiLCJleHAiOjE2MTcyMjI1NDksImV4dCI6e30sImlhdCI6MTYxNzIxODk0OSwiaXNzIjoiaHR0cHM6Ly9hY2Nlc3MuYm9zY2gtaW90LXN1aXRlLmNvbS92Mi8iLCJqdGkiOiI2ZTE1ZDAyZi00Y2FlLTQxNWYtYjJiZS1hNzFlMGU0MzMxMzciLCJuYmYiOjE2MTcyMTg5NDksInNjcCI6WyJzZXJ2aWNlOmlvdC1odWItcHJvZDp0OWRjOTg5MGU0NGQ3NDE0YWFhNGRkMTA0ZDkwNTlmZmRfaHViL2Z1bGwtYWNjZXNzIiwic2VydmljZTppb3QtdGhpbmdzLWV1LTE6OWRjOTg5MGUtNDRkNy00MTRhLWFhNGQtZDEwNGQ5MDU5ZmZkX3RoaW5ncy9mdWxsLWFjY2VzcyJdLCJzdWIiOiJmMTAwYTJjYi1mMjY4LTQ3ZGQtYTdiOS1kZDNkZDdiNDUxZDAifQ.bfNtPnSe75zB9oyaYq0Ette6s90s3wlvxmi8JqImloINcU9mJTsIYC29xFWnnuhagvkJUJfJid97guHKuMW0Tm3qxzsQLa2JHXEXfmrmRnD98j08Vk62C5bjqQ9rYYFgu22bBKqbAZfKEMEJeXdiLzwLZi3aZdFDWjdHSW_zYnfr--5UNvRnApGeF1xdKn8t73lcN2gw7MnQciko1iXlYpKt4r2WVLgAT2a_H3M2g3Wa7ZzsHRl_Jj2nbOSxMdt7XSYYHgD7VIFcEoxnsNSm-6QRw9C5cE3dmtjcH3RBd-uTsuTuc4BbBCNR4pu_oKKUTvai5R1FdfNryXpLGpX3cLjHdAv-CUIqEelPwOiWlTAjAnx-a4ckILFswd0lRAdC56KtzSiqO3G8Gg822WP_DJBeWel-MxBMdcm6CakitQkSoDF25bznCcs6jL6Tnh1fgvW4enod89pdnwEy_gT6bMZdgDLnx9cgDAS4Pje9Eza06uZJFjMMVfTIYD4VLbBCu0yKx-JzfERCWfK0v2bA3dundsuMPX17bsjtkAnoMgN_Ea7Pz3nXa2IVpoxhzYo9iQlFRu2nUcroFik3jglp3vxBqy_TYgQofX3TyvivnBsF-SW3RSje-oT61cG6d_eP2cPSLzGoVuztJrqXs7998Lg-91GYnBzirdOlHS5J_DM'
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
        putAttribute($('#attributePath').val(), $('#attributeValue').val() );
    })

    // Features ---------------------------------
    $('#featuresTable').on('click', 'tr', function(event) {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
        $('#featureId').val($(this).text());
        $('#featureValue').val(JSON.stringify(theThing.features[$(this).text()], null, 4));
    });

    $('#putFeature').click(function() {
        putFeature($('#featureId').val(), $('#featureValue').val());
    });
    
    // Policies ---------------------------------
    $('#policyEntriesTable').on('click', 'tr', function(event) {
        $(this).addClass('bg-info').siblings().removeClass('bg-info');
        thePolicyEntry = $(this).text();
        refillPolicySubjectsAndRessources();
    });

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
        putPolicy('/subjects/', $('#policySubjectId').val(), $('#policySubjectValue').val());
    });

    $('#putPolicyResource').click(function () {
        putPolicy('/resources/', $('#policyResourceId').val(), $('#policyResourceValue').val());
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
}

var refreshThing = function(thingId) {
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
            $('#policyEntriesTable').empty();
            $('#policySubjectsTable').empty();
            $('#policyResourcesTable').empty();
            var isPolicyEntryValid = false;
            for (var key of Object.keys(thePolicy.entries)) {
                if (key === thePolicyEntry) {
                    isPolicyEntryValid = true;
                    addTableRow($('#policyEntriesTable')[0], key, null, true);
                } else {
                    addTableRow($('#policyEntriesTable')[0], key, null, false);
                }
            }
            if (!isPolicyEntryValid) {
                thePolicyEntry = null;
            }
        });
};

refreshPolicyEntry = function() {
    // we reload the full policy, even if only the selected entry is updated
    $.getJSON(settings.api_uri + '/policies/' + thePolicy.policyId)
        .done(function(policy, status) {
            thePolicy = policy;
            refillPolicySubjectsAndRessources();
        })
}

var addTableRow = function(table, key, value, selected) {
    var row = table.insertRow();
    row.insertCell(0).innerHTML = key;
    if (value) {
        row.insertCell(1).innerHTML = value;
    }
    if (selected) {
        row.classList.add('bg-info');
    }

}

function refillPolicySubjectsAndRessources() {
    $('#policySubjectsTable').empty();
    for (var key of Object.keys(thePolicy.entries[thePolicyEntry].subjects)) {
        addTableRow($('#policySubjectsTable')[0], key, JSON.stringify(thePolicy.entries[thePolicyEntry].subjects[key]));
    }
    $('#policyResourcesTable').empty();
    for (var key of Object.keys(thePolicy.entries[thePolicyEntry].resources)) {
        addTableRow($('#policyResourcesTable')[0], key, JSON.stringify(thePolicy.entries[thePolicyEntry].resources[key]));
    }
}

function setBearerHeader() {
    $.ajaxSetup({
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + settings.bearer);
        }
    });
}

function putAttribute(key, value) {
    put('/attributes/', key, '"' + value + '"');
}

function putFeature(key, value) {
    put('/features/', key, value);
}

function put(type, key, value) {
    if (key) {
        if (value) {
            $.ajax(settings.api_uri + '/things/' + theThing.thingId + type + key, {
                type: 'PUT',
                contentType: 'application/json',
                data: value,
                success: function (response) {
                    refreshThing(theThing.thingId);
                }
            });
        } else {
            $.ajax(settings.api_uri + '/things/' + theThing.thingId + type + key, {
                type: 'DELETE',
                success: function (response) {
                    refreshThing(theThing.thingId);
                }
            });
        }
    }
}

function putPolicy(type, key, value) {
    if (thePolicyEntry && key) {
        if (value) {
            $.ajax(settings.api_uri + '/policies/' + thePolicy.policyId + '/entries/' + thePolicyEntry + type + key, {
                type: 'PUT',
                contentType: 'application/json',
                data: value,
                success: function (response) {
                    refreshPolicyEntry();
                }
            })
        } else {
            $.ajax(settings.api_uri + '/policies/' + thePolicy.policyId + '/entries/' + thePolicyEntry + type + key, {
                type: 'DELETE',
                success: function (response) {
                    refreshPolicyEntry();
                }
            })
        }
    } else {
        alert('No Policy Entry selected or no key is set!');
    }
}

