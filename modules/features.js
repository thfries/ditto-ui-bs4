import { getCurrentEnv } from './environments.js';
import * as Main from '../main.js';
import * as Things from './things.js';

let theFeature;

let featurePropertiesEditor = ace.edit("featurePropertiesEditor");
let featureDesiredPropertiesEditor = ace.edit("featureDesiredPropertiesEditor");

export function ready() {
    $('#featuresTable').on('click', 'tr', function(event) {
        theFeature = $(this).text();
        refreshFeature(Things.theThing, theFeature);
    });

    $('#putFeature').click(clickFeature('PUT'));
    $('#deleteFeature').click(clickFeature('DELETE'));

    featurePropertiesEditor.session.setMode("ace/mode/json");
    featureDesiredPropertiesEditor.session.setMode("ace/mode/json");

    // featurePropertiesEditor.session.getSelection().on('changeCursor', function() {
    //     let position = featurePropertiesEditor.getCursorPosition();
    //     let token = featurePropertiesEditor.session.getTokenAt(position.row, position.column);
    //     if (!token) {return;};
    //     let path = '$..' + token.value.replace(/['"]+/g, '').trim();
    //     let res = JSONPath({json: JSON.parse(featurePropertiesEditor.getValue()), path: path, resultType: 'pointer'});
    //     // TODO set the featurePath somewhere
    //     $('#featurePath').val(res);
    // });
    
    $('#messageFeature').click(messageFeature);

}

function clickFeature(method) {
    return function() {
        if (!Things.theThing) { Main.showError(null, 'Error', 'No Thing selected'); return; };
        if (!$('#featureId').val()) { Main.showError(null, 'Error', 'FeatureId is empty'); return; }; 
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
        Main.callDittoREST(
            method,
            '/things/' + Things.theThing.thingId + '/features/' + $('#featureId').val(),
            method === 'PUT' ? featureValue : null,
            function() { Things.refreshThing(Things.theThing.thingId); }
        );
    };
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

export function refreshThing(thing) {
            
    // Update features table
    $('#featuresTable').empty();
    let count = 0;
    let thingHasFeature = false
    if (thing.features) {
        for (let key of Object.keys(thing.features)) {
            if (key === theFeature) {
                refreshFeature(thing, key);
                thingHasFeature = true;
            };
            Main.addTableRow($('#featuresTable')[0], key, null, key === theFeature);
            count++;
        };
    }
    $('#featureCount').text(count > 0 ? count : "");
    if (!thingHasFeature) {
        theFeature = false;
        refreshFeature();
    }

}

let messageFeature = function() {
    let subject = $('#messageFeatureSubject').val();
    let feature = $('#featureId').val();
    let timeout = $('#messageTimeout').val();
    let payload = $('#messageFeaturePayload').val();
    if (subject && feature && payload) {
        $('#messageFeatureResponse').val('');
        $.post(getCurrentEnv().api_uri + '/api/2/things/' + Things.theThing.thingId + '/features/' + feature + '/inbox/messages/' + subject + '?timeout=' + timeout,
            payload,
            function(data, status, xhr) {
                Main.showSuccess(data, status, xhr);
                if (timeout > 0) {
                    $('#messageFeatureResponse').val(JSON.stringify(data, null, 2));
                };
            }
        );
    } else {
        Main.showError(null, 'Error', 'FeatureId or Subject or Payload is empty');
    }
};




