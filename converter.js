#!/bin/env node

//TODO: Start on this line of the diagram
//  uml:Diagram diagramType="InteractionDiagram" documentation="" name="VC Issuance - Sequence" toolName="Visual Paradigm" xmi:id="VjyV8t6GAqBwAQlL"
//  walk through the diagrams to get the lifeline names/messages then construct from there
//  order operations by Y value, order lifelines/actors by X values and combine actors/lifelines

const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

project = loadXml();

var lifelines = extractLifelines(project);
var fragments = extractFragments(project);
var messages = extractMessages(project);

var mermaid = generateMermaid(messages);

// loadXml loads and parses an xmi formatted serialization of a sequence
// diagram.
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
function loadXml() {
  const pOptions = {
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  };

  var parser = new XMLParser(pOptions);
  var xml = fs.readFileSync('test1.xml', 'utf8');
  var result = parser.parse(xml);

  //console.log(JSON.stringify(result, null, 2));
  return result;
}

// Extract lifelines finds all of the lifelines in the diagram and
// returns them in a concise, ordered JSON array
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
function extractLifelines(result) {
  var xmlLifelines = result['xmi:XMI']['uml:Model'].ownedMember[5].ownedBehavior[0].lifeline;

  let lifelines = [];
  xmlLifelines.forEach(l => {
    //  console.log(l);
    let lfl = {
      name: l['@_name'],
      id: l['@_xmi:id'],
      type: l['@_xmi:type']
    }
    lifelines.push(lfl);
    //  console.log(lfl);
  })

  return lifelines;
}

// Extract fragments finds all of the lifelines in the diagram and
// returns them in a concise, ordered JSON array.
// Fragments include the link that specifies which lifeline
// is associated with the send/receive properties of a message
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
function extractFragments(result) {
  let xmlFragments = result['xmi:XMI']['uml:Model'].ownedMember[5].ownedBehavior[0].fragment;

  let frags = {};
  xmlFragments.forEach(f => {
    let frag = {
      id: f['@_xmi:id'],
      msg: f['@_message'],
      type: f['@_xmi:type'],
      covered: f['@_covered']
    };
    frags[frag.id] = frag;
  });

  return frags;
}

// lookupEventTarget takes the id used to specify send/receive
// targets in messages and returns the human-readable name
// of that target.
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
function lookupEventTarget(targetId) {
  if (targetId in fragments) {
    let target = fragments[targetId].covered;
    let lifeline = lifelines.find(l => l.id == target);
    if(!lifeline) {
      console.log("One of your diagrams has hidden lifelines, delete them!")
      return "Lifeline not found"
    }
    console.log('looking up lifeline ' + target + ':' + lifeline );

    return lifeline.name;
  }
  else {
    console.log('fragment not found ' + targetId);
    return null;
  }
}

// Extract messages finds all of the messages in the diagram and
// returns them in a concise, ordered JSON array.
// This includes dereferencing the send/receive targets using
// the fragments variable.
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
function extractMessages(result) {
  let xmlMessages = result['xmi:XMI']['uml:Model'].ownedMember[5].ownedBehavior[0].message;

  let ms = [];
  xmlMessages.forEach(m => {
      console.log(m);
    // start with the properties that every message has
    let msg = {
      text: m['@_name'], // Is this actually always set?
      from: lookupEventTarget(m['@_sendEvent']),
      to: lookupEventTarget(m['@_receiveEvent']),
      id: m['@_xmi:id'],
      async: m['xmi:Extension'].asynshronous['@_xmi:value'], // Is this actually always set?
      type: m['@_xmi:type'],
      number: Number(m['xmi:Extension'].number['@_xmi:value'])
    }
    // now grab the two properties that may or may not be in the data set
    if ('fromActivation' in m['xmi:Extension']) {
      msg.fromActivation = m['xmi:Extension'].fromActivation['activation']['@_xmi:value'];

    }
    if ('toActivation' in m['xmi:Extension']) {
      msg.toActivation = m['xmi:Extension'].toActivation['activation']['@_xmi:value'];
    }

    ms.push(msg);
  });

  ms = ms.sort((a, b) => a.number - b.number);
  return ms;
}

function generateMermaid(messages) {
  let mer = `sequenceDiagram
  autonumber\n`;
  messages.forEach(function (m) {
    mer += `    ${m.from}->>${m.to}:${m.text}\n`
  });

  return mer;
}


//console.log(lifelines);
//console.log(xmlFragments);

console.log(messages);
console.log(mermaid);

